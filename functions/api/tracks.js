function read32be(b, o) { return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0; }
function read32le(b, o) { return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0; }

function getDuration(bytes) {
  const sig = String.fromCharCode(bytes[0],bytes[1],bytes[2],bytes[3]);

  // ── FLAC ──────────────────────────────────────────────────────────────────
  if (sig === 'fLaC') {
    // STREAMINFO block is always first, starts at byte 4
    // block header: 1 byte type+last flag, 3 bytes size
    const blockType = bytes[4] & 0x7f;
    if (blockType === 0) { // STREAMINFO
      // bytes 18-21: sample rate (20 bits) + channel (3) + bit depth (5)
      // bytes 21-26: total samples (36 bits)
      const sampleRate = (bytes[8]<<12)|(bytes[9]<<4)|(bytes[10]>>4);
      const totalSamples = ((bytes[10]&0x0f)*Math.pow(2,32)) +
        ((bytes[11]<<24)|(bytes[12]<<16)|(bytes[13]<<8)|bytes[14]);
      if (sampleRate > 0) return Math.round(totalSamples / sampleRate);
    }
    return null;
  }

  // ── MP3 (Xing/Info/VBRI header) ───────────────────────────────────────────
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
    // Find Xing/Info header
    for (let i = 0; i < Math.min(bytes.length - 4, 5000); i++) {
      if (bytes[i]===0xFF && (bytes[i+1]&0xE0)===0xE0) {
        const xingOffset = i + 36; // typical offset for MPEG1 Layer3
        if (xingOffset + 12 < bytes.length) {
          const xingId = String.fromCharCode(bytes[xingOffset],bytes[xingOffset+1],bytes[xingOffset+2],bytes[xingOffset+3]);
          if (xingId === 'Xing' || xingId === 'Info') {
            const flags = read32be(bytes, xingOffset + 4);
            if (flags & 0x1) {
              const frames = read32be(bytes, xingOffset + 8);
              // Get sample rate from frame header
              const srIdx = (bytes[i+2] >> 2) & 0x3;
              const srTable = [44100, 48000, 32000, 0];
              const sr = srTable[srIdx];
              if (sr > 0) return Math.round(frames * 1152 / sr);
            }
          }
        }
        break;
      }
    }
    return null;
  }

  // ── MP4/M4A ───────────────────────────────────────────────────────────────
  if (bytes[4]===0x66&&bytes[5]===0x74&&bytes[6]===0x79&&bytes[7]===0x70) {
    function findBox(buf, start, end, name) {
      let off = start;
      while (off < end - 8) {
        const size = read32be(buf, off);
        const type = String.fromCharCode(buf[off+4],buf[off+5],buf[off+6],buf[off+7]);
        if (size < 8) break;
        if (type === name) return { start: off, end: off+size, dataStart: off+8 };
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
        const hi = read32be(bytes, mvhd.dataStart + 24);
        const lo = read32be(bytes, mvhd.dataStart + 28);
        const duration = hi * Math.pow(2, 32) + lo;
        return timescale > 0 ? Math.round(duration / timescale) : null;
      } else {
        const timescale = read32be(bytes, mvhd.dataStart + 12);
        const duration = read32be(bytes, mvhd.dataStart + 16);
        return timescale > 0 ? Math.round(duration / timescale) : null;
      }
    } catch(_) { return null; }
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

    // Fetch durations in parallel, reading only first 64KB of each file
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
        const partial = await env.MUSIC_BUCKET.get(key, {
          range: { offset: 0, length: 65536 }
        });
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
