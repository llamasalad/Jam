function read32be(b, o) { return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0; }

function getDuration(bytes) {
  const sig = String.fromCharCode(bytes[0],bytes[1],bytes[2],bytes[3]);

  // ── FLAC ──────────────────────────────────────────────────────────────────
  // fLaC marker (4 bytes) + block header (4 bytes) + STREAMINFO data
  // STREAMINFO layout (34 bytes total):
  //   0-1:  min block size
  //   2-3:  max block size
  //   4-6:  min frame size (24 bits)
  //   7-9:  max frame size (24 bits)
  //   10-12+: sample rate (20 bits), channels (3 bits), bit depth (5 bits), total samples (36 bits)
  if (sig === 'fLaC') {
    const blockType = bytes[4] & 0x7f;
    if (blockType !== 0) return null; // must be STREAMINFO
    // STREAMINFO data starts at byte 8 (4 marker + 4 block header)
    const off = 8;
    // sample rate: bits 0-19 of bytes at off+10, off+11, off+12
    const sampleRate = (bytes[off+10] << 12) | (bytes[off+11] << 4) | (bytes[off+12] >> 4);
    // total samples: bits 4-39 = lower 4 bits of byte off+13, then bytes off+14 to off+17
    const totalSamples =
      ((bytes[off+13] & 0x0F) * 0x100000000) +
      (bytes[off+14] * 0x1000000) +
      (bytes[off+15] * 0x10000) +
      (bytes[off+16] * 0x100) +
      bytes[off+17];
    if (sampleRate > 0 && totalSamples > 0) return Math.round(totalSamples / sampleRate);
    return null;
  }

  // ── MP4/M4A ───────────────────────────────────────────────────────────────
  if (bytes[4]===0x66&&bytes[5]===0x74&&bytes[6]===0x79&&bytes[7]===0x70) {
    function findBox(buf, start, end, name) {
      let off = start;
      while (off < end - 8) {
        const size = read32be(buf, off);
        const type = String.fromCharCode(buf[off+4],buf[off+5],buf[off+6],buf[off+7]);
        if (size < 8 || size > end - off) break;
        if (type === name) return { end: off+size, dataStart: off+8 };
        off += size;
      }
      return null;
    }
    try {
      const moov = findBox(bytes, 0, bytes.length, 'moov');
      if (!moov) return null;
      const mvhd = findBox(bytes, moov.dataStart, moov.end, 'mvhd');
      if (!mvhd) return null;
      const version = bytes[mvhd.dataStart];
      if (version === 1) {
        const timescale = read32be(bytes, mvhd.dataStart + 20);
        const durationHi = read32be(bytes, mvhd.dataStart + 24);
        const durationLo = read32be(bytes, mvhd.dataStart + 28);
        const duration = durationHi * 4294967296 + durationLo;
        return timescale > 0 ? Math.round(duration / timescale) : null;
      } else {
        const timescale = read32be(bytes, mvhd.dataStart + 12);
        const duration = read32be(bytes, mvhd.dataStart + 16);
        return timescale > 0 ? Math.round(duration / timescale) : null;
      }
    } catch(_) { return null; }
  }

  // ── MP3 (ID3v2 + Xing/Info header) ────────────────────────────────────────
  if (bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33) {
    // Skip ID3v2 tag to find first MP3 frame
    const id3Size = ((bytes[6]&0x7f)<<21)|((bytes[7]&0x7f)<<14)|((bytes[8]&0x7f)<<7)|(bytes[9]&0x7f);
    const frameStart = 10 + id3Size;
    if (frameStart + 4 >= bytes.length) return null;

    // Parse MP3 frame header
    const b1 = bytes[frameStart+1];
    const b2 = bytes[frameStart+2];
    const srIdx = (b2 >> 2) & 0x3;
    const srTable = [44100, 48000, 32000, 0];
    const sampleRate = srTable[srIdx];
    if (!sampleRate) return null;

    // Look for Xing/Info header (36 bytes into frame for MPEG1 Layer3)
    const xOff = frameStart + 36;
    if (xOff + 12 < bytes.length) {
      const xSig = String.fromCharCode(bytes[xOff],bytes[xOff+1],bytes[xOff+2],bytes[xOff+3]);
      if (xSig === 'Xing' || xSig === 'Info') {
        const flags = read32be(bytes, xOff + 4);
        if (flags & 0x1) {
          const frameCount = read32be(bytes, xOff + 8);
          return Math.round(frameCount * 1152 / sampleRate);
        }
      }
    }
    return null;
  }

  return null;
}

export async function onRequestGet({ env }) {
  if (!env.MUSIC_BUCKET) {
    return new Response(JSON.stringify({ error: "MUSIC_BUCKET binding not found." }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const listed = await env.MUSIC_BUCKET.list({ limit: 1000 });
    const SUPPORTED = new Set([".mp3", ".flac", ".ogg", ".m4a", ".wav", ".aac", ".opus"]);

    const trackObjects = listed.objects.filter(obj => {
      const ext = obj.key.slice(obj.key.lastIndexOf(".")).toLowerCase();
      return SUPPORTED.has(ext);
    });

    const tracks = await Promise.all(trackObjects.map(async obj => {
      const key = obj.key;
      const parts = key.split("/");
      const filename = parts[parts.length - 1];
      const ext = filename.slice(filename.lastIndexOf("."));
      let title = filename.slice(0, filename.length - ext.length);
      title = title.replace(/^\d{1,3}[\s.\-_]+/, '').trim();
      const artist = parts.length >= 3 ? parts[parts.length - 3] : "Unknown";
      const album = parts.length >= 2 ? parts[parts.length - 2] : "Unknown";
      const id = encodeURIComponent(key).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16));

      let duration = null;
      try {
        const partial = await env.MUSIC_BUCKET.get(key, { range: { offset: 0, length: 65536 } });
        if (partial) {
          const buf = await partial.arrayBuffer();
          duration = getDuration(new Uint8Array(buf));
        }
      } catch(_) {}

      return { id, key, title, artist, album, duration };
    }));

    return new Response(JSON.stringify(tracks), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
