export async function onRequestGet({ params, env }) {
  if (!env.MUSIC_BUCKET) {
    return new Response("No bucket", { status: 500 });
  }

  const key = decodeURIComponent(params.id);
  const object = await env.MUSIC_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const buf = await object.arrayBuffer();
  const cover = extractCover(buf);
  if (!cover) return new Response("No cover", { status: 404 });

  return new Response(cover.data, {
    headers: {
      "Content-Type": cover.mime,
      "Cache-Control": "public, max-age=604800",
    }
  });
}

function extractCover(buf) {
  const bytes = new Uint8Array(buf);

  // ── ID3v2 ──────────────────────────────────────────────────────────────────
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const version = bytes[3];
    const flagUnsync = (bytes[5] & 0x80) !== 0;
    let tagSize = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) |
                  ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);

    let offset = 10;
    // Extended header
    if (bytes[5] & 0x40) {
      const extSize = (bytes[10] << 24) | (bytes[11] << 16) | (bytes[12] << 8) | bytes[13];
      offset += extSize;
    }

    const end = 10 + tagSize;
    while (offset < end - 10) {
      const frameId = String.fromCharCode(bytes[offset], bytes[offset+1], bytes[offset+2], bytes[offset+3]);
      let frameSize;
      if (version === 4) {
        frameSize = ((bytes[offset+4] & 0x7f) << 21) | ((bytes[offset+5] & 0x7f) << 14) |
                    ((bytes[offset+6] & 0x7f) << 7) | (bytes[offset+7] & 0x7f);
      } else {
        frameSize = (bytes[offset+4] << 24) | (bytes[offset+5] << 16) |
                    (bytes[offset+6] << 8) | bytes[offset+7];
      }
      offset += 10;

      if (frameId === 'APIC' && frameSize > 0) {
        let i = offset;
        i++; // encoding byte
        // mime type (null terminated)
        let mimeStart = i;
        while (i < offset + frameSize && bytes[i] !== 0) i++;
        const mime = new TextDecoder().decode(bytes.slice(mimeStart, i));
        i++; // null terminator
        i++; // picture type byte
        // description (null terminated, possibly double-null for utf16)
        while (i < offset + frameSize && bytes[i] !== 0) i++;
        i++; // null terminator
        if (i < offset + frameSize && bytes[i] === 0) i++; // utf16 double null

        const imgData = bytes.slice(i, offset + frameSize);
        return { data: imgData, mime: mime || 'image/jpeg' };
      }

      if (frameId === '\x00\x00\x00\x00' || frameSize <= 0 || frameSize > tagSize) break;
      offset += frameSize;
    }
  }

  // ── MP4/M4A (ftyp boxes) ──────────────────────────────────────────────────
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const result = findMp4Cover(bytes);
    if (result) return result;
  }

  return null;
}

function findMp4Cover(bytes) {
  function read32(buf, off) {
    return ((buf[off] << 24) | (buf[off+1] << 16) | (buf[off+2] << 8) | buf[off+3]) >>> 0;
  }
  function readStr(buf, off, len) {
    return String.fromCharCode(...buf.slice(off, off + len));
  }

  function findBox(buf, start, end, name) {
    let off = start;
    while (off < end - 8) {
      const size = read32(buf, off);
      const type = readStr(buf, off + 4, 4);
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
    // meta has a 4-byte version/flags before children
    const ilst = findBox(bytes, meta.dataStart + 4, meta.end, 'ilst');
    if (!ilst) return null;
    const covr = findBox(bytes, ilst.dataStart, ilst.end, 'covr');
    if (!covr) return null;
    const data = findBox(bytes, covr.dataStart, covr.end, 'data');
    if (!data) return null;
    // 4 bytes type indicator + 4 bytes locale
    const typeFlag = read32(bytes, data.dataStart);
    const mime = typeFlag === 14 ? 'image/png' : 'image/jpeg';
    const imgData = bytes.slice(data.dataStart + 8, data.end);
    return { data: imgData, mime };
  } catch (_) {
    return null;
  }
}
