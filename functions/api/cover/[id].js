export async function onRequestGet({ params, request, env }) {
  if (!env.MUSIC_BUCKET) {
    return new Response("No bucket", { status: 500 });
  }

  const key = decodeURIComponent(params.id);
  const debug = new URL(request.url).searchParams.has('debug');
  const object = await env.MUSIC_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  // Only read first 512KB — covers are always near the start
  const fullBuf = await object.arrayBuffer();
  const bytes = new Uint8Array(fullBuf);

  if (debug) {
    const info = {
      fileSize: fullBuf.byteLength,
      header: Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2,'0')).join(' '),
      isID3: bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33,
      id3Version: bytes[3],
      id3Flags: bytes[5].toString(2).padStart(8,'0'),
      frames: []
    };

    if (info.isID3) {
      const tagSize = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) |
                      ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
      info.tagSize = tagSize;
      let offset = 10;
      if (bytes[5] & 0x40) {
        const extSize = (bytes[10] << 24)|(bytes[11] << 16)|(bytes[12] << 8)|bytes[13];
        offset += extSize;
      }
      const end = Math.min(10 + tagSize, bytes.length);
      let count = 0;
      while (offset < end - 10 && count < 20) {
        const frameId = String.fromCharCode(bytes[offset],bytes[offset+1],bytes[offset+2],bytes[offset+3]);
        if (frameId === '\x00\x00\x00\x00') break;
        let frameSize;
        if (info.id3Version === 4) {
          frameSize = ((bytes[offset+4]&0x7f)<<21)|((bytes[offset+5]&0x7f)<<14)|((bytes[offset+6]&0x7f)<<7)|(bytes[offset+7]&0x7f);
        } else {
          frameSize = (bytes[offset+4]<<24)|(bytes[offset+5]<<16)|(bytes[offset+6]<<8)|bytes[offset+7];
        }
        info.frames.push({ id: frameId, size: frameSize, offset });
        if (frameSize <= 0 || frameSize > tagSize) break;
        offset += 10 + frameSize;
        count++;
      }
    }
    return new Response(JSON.stringify(info, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }

  const cover = extractCover(bytes, bytes[3]);
  if (!cover) return new Response("No cover", { status: 404 });

  return new Response(cover.data, {
    headers: {
      "Content-Type": cover.mime,
      "Cache-Control": "public, max-age=604800",
    }
  });
}

function extractCover(bytes, version) {
  // ID3v2
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const tagSize = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) |
                    ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    let offset = 10;
    if (bytes[5] & 0x40) {
      const extSize = (bytes[10]<<24)|(bytes[11]<<16)|(bytes[12]<<8)|bytes[13];
      offset += extSize;
    }
    const end = Math.min(10 + tagSize, bytes.length);

    while (offset < end - 10) {
      const frameId = String.fromCharCode(bytes[offset],bytes[offset+1],bytes[offset+2],bytes[offset+3]);
      let frameSize;
      if (version === 4) {
        frameSize = ((bytes[offset+4]&0x7f)<<21)|((bytes[offset+5]&0x7f)<<14)|((bytes[offset+6]&0x7f)<<7)|(bytes[offset+7]&0x7f);
      } else {
        frameSize = (bytes[offset+4]<<24)|(bytes[offset+5]<<16)|(bytes[offset+6]<<8)|bytes[offset+7];
      }

      if (frameId === 'APIC' && frameSize > 0) {
        let i = offset + 10;
        const encoding = bytes[i++];
        // mime type null-terminated
        let mimeStart = i;
        while (i < offset + 10 + frameSize && bytes[i] !== 0) i++;
        let mime = new TextDecoder().decode(bytes.slice(mimeStart, i));
        if (!mime || mime === 'image') mime = 'image/jpeg';
        i++; // null
        i++; // picture type
        // skip description (null terminated, double-null for utf16)
        if (encoding === 1 || encoding === 2) {
          while (i < offset + 10 + frameSize - 1 && !(bytes[i] === 0 && bytes[i+1] === 0)) i++;
          i += 2;
        } else {
          while (i < offset + 10 + frameSize && bytes[i] !== 0) i++;
          i++;
        }
        return { data: bytes.slice(i, offset + 10 + frameSize), mime };
      }

      if (frameId === '\x00\x00\x00\x00' || frameSize <= 0 || frameSize > tagSize) break;
      offset += 10 + frameSize;
    }
  }

  // MP4/M4A
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return findMp4Cover(bytes);
  }

  return null;
}

function findMp4Cover(bytes) {
  function read32(buf, off) {
    return ((buf[off]<<24)|(buf[off+1]<<16)|(buf[off+2]<<8)|buf[off+3])>>>0;
  }
  function readStr(buf, off, len) {
    return String.fromCharCode(...buf.slice(off, off+len));
  }
  function findBox(buf, start, end, name) {
    let off = start;
    while (off < end - 8) {
      const size = read32(buf, off);
      const type = readStr(buf, off+4, 4);
      if (size < 8) break;
      if (type === name) return { start: off, end: off+size, dataStart: off+8 };
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
    const typeFlag = read32(bytes, data.dataStart);
    const mime = typeFlag === 14 ? 'image/png' : 'image/jpeg';
    return { data: bytes.slice(data.dataStart + 8, data.end), mime };
  } catch(_) { return null; }
}
