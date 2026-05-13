export async function onRequestGet({ params, request, env }) {
  if (!env.MUSIC_BUCKET) return new Response("No bucket", { status: 500 });

  const id = decodeURIComponent(params.id);
  const cacheKey = `covers/${id}.jpg`;

  const responseHeaders = {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=31536000",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Max-Age": "31536000",
  };

  // ── Serve from cache if exists ────────────────────────────────────────────
  const cached = await env.MUSIC_BUCKET.get(cacheKey);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        ...responseHeaders,
        "Content-Type": cached.httpMetadata?.contentType || "image/jpeg",
      }
    });
  }

  // ── Try cover image files in R2 ───────────────────────────────────────────
  const pathParts = id.split('/');
  if (pathParts.length >= 4 && pathParts[0] === 'Uploads') {
    const filename = pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, '');
    const artist = pathParts[1];
    const album = pathParts[2];

    const candidates = [
      `music/covers/${pathParts.slice(1).join('/')}/${filename}.jpg`,
      `music/covers/${artist}/${album}/${filename}.jpg`,
    ];

    for (const key of candidates) {
      const found = await env.MUSIC_BUCKET.get(key);
      if (found) {
        const buf = await found.arrayBuffer();
        const mime = found.httpMetadata?.contentType || "image/jpeg";
        await env.MUSIC_BUCKET.put(cacheKey, buf, { httpMetadata: { contentType: mime } });
        return new Response(buf, { headers: { ...responseHeaders, "Content-Type": mime } });
      }
    }
  }

  // ── Extract from audio file ───────────────────────────────────────────────
  // Fetch a generous chunk to cover most embedded art (1MB)
  const CHUNK_SIZE = 1048576;
  const object = await env.MUSIC_BUCKET.get(id, { range: { offset: 0, length: CHUNK_SIZE } });
  if (!object) return new Response("Not found", { status: 404 });

  const buf = await object.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let cover = extractCover(bytes);

  // Detect truncated covers: if the data ends at or very near the chunk
  // boundary, or if the declared size exceeds extracted data, re-fetch full file
  const maybeTruncated = cover && (
    (cover.declaredSize && cover.data.length < cover.declaredSize) ||
    (cover.data.length + cover.dataOffset >= bytes.length - 16)
  );
  if (maybeTruncated) {
    const fullObject = await env.MUSIC_BUCKET.get(id);
    if (fullObject) {
      const fullBuf = await fullObject.arrayBuffer();
      const fullCover = extractCover(new Uint8Array(fullBuf));
      if (fullCover) cover = fullCover;
    }
  }

  if (!cover) return new Response("No cover", { status: 404 });

  await env.MUSIC_BUCKET.put(cacheKey, cover.data, {
    httpMetadata: { contentType: cover.mime }
  });

  return new Response(cover.data, {
    headers: { ...responseHeaders, "Content-Type": cover.mime }
  });
}

function read32be(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }

function extractCover(bytes) {
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);

  // ── FLAC ──────────────────────────────────────────────────────────────────
  if (sig === 'fLaC') {
    let offset = 4;
    while (offset < bytes.length - 4) {
      const blockHeader = bytes[offset];
      const isLast = (blockHeader & 0x80) !== 0;
      const blockType = blockHeader & 0x7f;
      const blockSize = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
      offset += 4;
      if (blockType === 6) {
        let i = offset;
        i += 4;
        const mimeLen = read32be(bytes, i); i += 4;
        const mime = new TextDecoder().decode(bytes.slice(i, i + mimeLen)); i += mimeLen;
        const descLen = read32be(bytes, i); i += 4; i += descLen;
        i += 16;
        const dataLen = read32be(bytes, i); i += 4;
        return { data: bytes.slice(i, i + dataLen), mime: mime || 'image/jpeg', declaredSize: dataLen, dataOffset: i };
      }
      if (isLast) break;
      offset += blockSize;
    }
    return null;
  }

  // ── ID3v2 (MP3, AAC) ──────────────────────────────────────────────────────
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const version = bytes[3];
    const tagSize = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    let offset = 10;
    if (bytes[5] & 0x40) offset += (bytes[10] << 24) | (bytes[11] << 16) | (bytes[12] << 8) | bytes[13];
    const end = Math.min(10 + tagSize, bytes.length);
    while (offset < end - 10) {
      const frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      let frameSize = version === 4
        ? ((bytes[offset + 4] & 0x7f) << 21) | ((bytes[offset + 5] & 0x7f) << 14) | ((bytes[offset + 6] & 0x7f) << 7) | (bytes[offset + 7] & 0x7f)
        : (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
      if (frameId === 'APIC' && frameSize > 0) {
        let i = offset + 10;
        const encoding = bytes[i++];
        let mimeStart = i;
        while (i < offset + 10 + frameSize && bytes[i] !== 0) i++;
        let mime = new TextDecoder().decode(bytes.slice(mimeStart, i));
        if (!mime || mime === 'image') mime = 'image/jpeg';
        i++; i++;
        if (encoding === 1 || encoding === 2) {
          while (i < offset + 10 + frameSize - 1 && !(bytes[i] === 0 && bytes[i + 1] === 0)) i++;
          i += 2;
        } else {
          while (i < offset + 10 + frameSize && bytes[i] !== 0) i++;
          i++;
        }
        const declaredSize = offset + 10 + frameSize - i;
        return { data: bytes.slice(i, offset + 10 + frameSize), mime, declaredSize, dataOffset: i };
      }
      if (frameId === '\x00\x00\x00\x00' || frameSize <= 0 || frameSize > tagSize) break;
      offset += 10 + frameSize;
    }
    return null;
  }

  // ── MP4/M4A ───────────────────────────────────────────────────────────────
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    function findBox(buf, start, end, name) {
      let off = start;
      while (off < end - 8) {
        const size = read32be(buf, off);
        const type = String.fromCharCode(buf[off + 4], buf[off + 5], buf[off + 6], buf[off + 7]);
        if (size < 8) break;
        if (type === name) return { start: off, end: off + size, dataStart: off + 8 };
        off += size;
      }
      return null;
    }
    try {
      const moov = findBox(bytes, 0, bytes.length, 'moov');
      if (!moov) return null;
      const udta = findBox(bytes, moov.dataStart, moov.end, 'udta');
      const meta = findBox(bytes, udta ? udta.dataStart : moov.dataStart, moov.end, 'meta');
      if (!meta) return null;
      const ilst = findBox(bytes, meta.dataStart + 4, meta.end, 'ilst');
      if (!ilst) return null;
      const covr = findBox(bytes, ilst.dataStart, ilst.end, 'covr');
      if (!covr) return null;
      const data = findBox(bytes, covr.dataStart, covr.end, 'data');
      if (!data) return null;
      const typeFlag = read32be(bytes, data.dataStart);
      const imgStart = data.dataStart + 8;
      const declaredSize = data.end - imgStart;
      return { data: bytes.slice(imgStart, data.end), mime: typeFlag === 14 ? 'image/png' : 'image/jpeg', declaredSize, dataOffset: imgStart };
    } catch (_) { return null; }
  }

  return null;
}