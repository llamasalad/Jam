function read32be(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }

function read24be(b, o) { return ((b[o] << 16) | (b[o + 1] << 8) | b[o + 2]) >>> 0; }

function getDuration(bytes) {
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);

  // ── FLAC ──────────────────────────────────────────────────────────────────
  if (sig === 'fLaC') {
    let offset = 4;
    const maxOffset = Math.min(bytes.length, 65536); // Only check first 64KB

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

  // ── MP3 ────────────────────────────────────────────────────────────────────
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
    const frameStart = bytes.findIndex((b, i) => i > 0 && b === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0);
    if (frameStart === -1) return null;
    const version = (bytes[frameStart + 1] >> 3) & 0x03;
    const layer = (bytes[frameStart + 1] >> 1) & 0x03;
    if (version === 1 || layer === 0) return null;
    const srIdx = (bytes[frameStart + 2] >> 2) & 0x03;
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

export async function onRequestGet({ env, request }) {
  if (!env.MUSIC_BUCKET) {
    return new Response(JSON.stringify({ error: "MUSIC_BUCKET binding not found." }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  const url = new URL(request.url);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  try {
    const listed = await env.MUSIC_BUCKET.list({ limit: 1000 });
    const SUPPORTED = new Set([".mp3", ".flac", ".ogg", ".m4a", ".wav", ".aac", ".opus"]);

    const trackObjects = listed.objects.filter(obj => {
      const ext = obj.key.slice(obj.key.lastIndexOf(".")).toLowerCase();
      return SUPPORTED.has(ext);
    });

    const batch = trackObjects.slice(offset, offset + limit);

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const errorTracks = [];

    for (const obj of batch) {
      const key = obj.key;
      const metaKey = `${key}.meta.json`;

      try {
        // Check if metadata already has duration
        const existingMeta = await env.MUSIC_BUCKET.get(metaKey);
        if (existingMeta) {
          const data = await existingMeta.json();
          if (data.duration !== undefined && data.duration !== null) {
            skipped++;
            continue;
          }
        }

        // Extract duration
        const partial = await env.MUSIC_BUCKET.get(key, { range: { offset: 0, length: 65536 } });
        if (!partial) {
          errors++;
          errorTracks.push({ key, reason: 'file_not_found' });
          continue;
        }

        const buf = await partial.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
        const duration = getDuration(bytes);

        if (duration === null) {
          errors++;
          errorTracks.push({ key, reason: 'extraction_failed', signature: sig, size: bytes.length });
          continue;
        }

        // Update metadata
        let metaData = {};
        if (existingMeta) {
          metaData = await existingMeta.json();
        }

        metaData.duration = duration;
        await env.MUSIC_BUCKET.put(metaKey, JSON.stringify(metaData));
        updated++;
      } catch (e) {
        console.error(`Error processing ${key}:`, e);
        errors++;
        errorTracks.push(key);
      }
    }

    const nextOffset = offset + limit;
    const hasMore = nextOffset < trackObjects.length;

    return new Response(JSON.stringify({
      success: true,
      total: trackObjects.length,
      processed: batch.length,
      offset,
      updated,
      skipped,
      errors,
      errorTracks,
      hasMore,
      nextOffset: hasMore ? nextOffset : null
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
