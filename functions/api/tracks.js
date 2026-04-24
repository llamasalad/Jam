function read32be(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }

function read24be(b, o) { return ((b[o] << 16) | (b[o + 1] << 8) | b[o + 2]) >>> 0; }

function read32le(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

function parseFlacMetadata(bytes) {
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (sig !== 'fLaC') return null;

  let offset = 4;
  const maxOffset = Math.min(bytes.length, 65536); // Only check first 64KB

  while (offset < maxOffset) {
    const header = bytes[offset];
    const isLast = (header & 0x80) !== 0;
    const blockType = header & 0x7f;
    const blockSize = read24be(bytes, offset + 1); // FLAC uses 24-bit big-endian block size

    if (blockType === 4) { // VORBIS_COMMENT
      const dataStart = offset + 4;
      // Vorbis comments use little-endian
      const vendorLength = read32le(bytes, dataStart);
      let commentListOffset = dataStart + 4 + vendorLength;
      const commentCount = read32le(bytes, commentListOffset);
      commentListOffset += 4;

      let artist = null, album = null;
      for (let i = 0; i < commentCount; i++) {
        const commentLength = read32le(bytes, commentListOffset);
        commentListOffset += 4;
        const comment = new TextDecoder().decode(bytes.slice(commentListOffset, commentListOffset + commentLength));
        commentListOffset += commentLength;

        const lower = comment.toLowerCase();
        // Only take first artist/album found (don't overwrite with featured artists)
        if (lower.startsWith('artist=') && !artist) artist = comment.slice(7);
        if (lower.startsWith('album=') && !album) album = comment.slice(6);
      }
      return { artist, album };
    }

    offset += 4 + blockSize;
    if (isLast) break;
  }
  return null;
}

function getDuration(bytes) {
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);

  // ── FLAC ──────────────────────────────────────────────────────────────────
  if (sig === 'fLaC') {
    let offset = 4;
    const maxOffset = Math.min(bytes.length, 262144); // Check first 256KB

    while (offset < maxOffset) {
      const blockHeader = bytes[offset];
      const isLast = (blockHeader & 0x80) !== 0;
      const blockType = blockHeader & 0x7f;
      const blockSize = read24be(bytes, offset + 1);

      if (blockType === 0) { // STREAMINFO
        const off = offset + 4;
        const sampleRate = (bytes[off + 10] << 12) | (bytes[off + 11] << 4) | (bytes[off + 12] >> 4);
        const totalSamples =
          ((bytes[off + 13] & 0x0F) * 0x100000000) +
          (bytes[off + 14] * 0x1000000) +
          (bytes[off + 15] * 0x10000) +
          (bytes[off + 16] * 0x100) +
          bytes[off + 17];
        if (sampleRate > 0 && totalSamples > 0) return Math.round(totalSamples / sampleRate);
        return null;
      }

      offset += 4 + blockSize;
      if (isLast) break;
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
        if (size < 8 || size > end - off) break;
        if (type === name) return { end: off + size, dataStart: off + 8 };
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
    } catch (_) { return null; }
  }

  // ── MP3 (ID3v2 + Xing/Info header) ────────────────────────────────────────
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const id3Size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    const frameStart = 10 + id3Size;
    if (frameStart + 4 >= bytes.length) return null;

    const b1 = bytes[frameStart + 1];
    const b2 = bytes[frameStart + 2];
    const srIdx = (b2 >> 2) & 0x3;
    const srTable = [44100, 48000, 32000, 0];
    const sampleRate = srTable[srIdx];
    if (!sampleRate) return null;

    const xOff = frameStart + 36;
    if (xOff + 12 < bytes.length) {
      const xSig = String.fromCharCode(bytes[xOff], bytes[xOff + 1], bytes[xOff + 2], bytes[xOff + 3]);
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
    const cached = await env.PLAYLISTS.get('_tracks_cache', 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }
  } catch (_) {}

  try {
    const SUPPORTED = new Set([".mp3", ".flac", ".ogg", ".m4a", ".wav", ".aac", ".opus"]);

    // List with multiple prefixes to avoid listing non-music files
    const prefixes = ['', 'uploads/'];
    const allObjects = [];

    for (const prefix of prefixes) {
      const listed = await env.MUSIC_BUCKET.list({ limit: 2000, prefix });
      allObjects.push(...listed.objects);
    }

    const trackObjects = allObjects.filter(obj => {
      const ext = obj.key.slice(obj.key.lastIndexOf(".")).toLowerCase();
      return SUPPORTED.has(ext);
    });

    const tracks = await Promise.all(trackObjects.map(async obj => {
      const key = obj.key;
      // Fetch sidecar metadata if it exists
      let title, artist, album, duration;
      try {
        const meta = await env.MUSIC_BUCKET.get(`${key}.meta.json`);
        if (meta) {
          const data = await meta.json();
          title = data.title;
          artist = data.artist;
          album = data.album;
          duration = data.duration;
        }
      } catch (_) { }

      const parts = key.split("/");
      const filename = parts[parts.length - 1];
      const ext = filename.slice(filename.lastIndexOf("."));
      if (!title) {
        title = filename.slice(0, filename.length - ext.length);
        title = title.replace(/^\d{1,3}[\s.\-_]+/, '').trim();
      }
      if (!artist) artist = parts.length >= 3 ? parts[parts.length - 3] : "Unknown";
      if (!album) album = parts.length >= 2 ? parts[parts.length - 2] : "Unknown";

      const id = encodeURIComponent(key).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16));

      // Only fetch from R2 if duration not cached
      if (duration === null || duration === undefined) {
        try {
          const partial = await env.MUSIC_BUCKET.get(key, { range: { offset: 0, length: 65536 } });
          if (partial) {
            const buf = await partial.arrayBuffer();
            duration = getDuration(new Uint8Array(buf));
          }
        } catch (_) { }
      }

      return { id, key, title, artist, album, duration };
    }));

    try {
      await env.PLAYLISTS.put('_tracks_cache', JSON.stringify(tracks), { expirationTtl: 3600 });
    } catch (_) {}

    return new Response(JSON.stringify(tracks), {
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.MUSIC_BUCKET) {
    return new Response(JSON.stringify({ error: "MUSIC_BUCKET binding not found." }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    // Parse FLAC metadata for artist/album
    let artist = "Unknown", album = "Unknown";
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const meta = parseFlacMetadata(bytes);
    if (meta) {
      if (meta.artist) artist = meta.artist;
      if (meta.album) album = meta.album;
    }

    const key = `Uploads/${artist}/${album}/${file.name}`;
    const existing = await env.MUSIC_BUCKET.head(key);
    if (existing) {
      return new Response(JSON.stringify({ error: "File already exists" }), { status: 409 });
    }

    await env.MUSIC_BUCKET.put(key, new Blob([arrayBuffer]), {
      httpMetadata: { contentType: file.type }
    });

    // Extract and cache duration in sidecar metadata
    const duration = getDuration(bytes);
    const metaKey = `${key}.meta.json`;
    await env.MUSIC_BUCKET.put(metaKey, JSON.stringify({ title: file.name.replace(/\.[^/.]+$/, ''), artist, album, duration }));

    return new Response(JSON.stringify({
      success: true,
      key,
      debug: {
        signature: sig,
        fileSize: bytes.length,
        parsed: { artist, album, rawMeta: meta },
        duration
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPut({ request, env }) {

  try {
    const { key, title, artist, album } = await request.json();
    const metaKey = `${key}.meta.json`;
    await env.MUSIC_BUCKET.put(metaKey, JSON.stringify({ title, artist, album }));

    return new Response(JSON.stringify({ success: true }));
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
