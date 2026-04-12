import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  MUSIC_DIR,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !MUSIC_DIR) {
  console.error("Missing required env vars. Check your .env file.");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const SUPPORTED = new Set([".mp3", ".flac", ".ogg", ".m4a", ".wav", ".aac", ".opus"]);

const MIME = {
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".opus": "audio/ogg",
};

function scanDir(dir, base) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(scanDir(full, base));
    } else if (SUPPORTED.has(path.extname(entry.name).toLowerCase())) {
      files.push(path.relative(base, full));
    }
  }
  return files;
}

async function getExisting() {
  const existing = new Set();
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      ContinuationToken: token,
    }));
    (res.Contents || []).forEach(o => existing.add(o.Key));
    token = res.NextContinuationToken;
  } while (token);
  return existing;
}

async function upload() {
  console.log(`Scanning ${MUSIC_DIR}...`);
  const files = scanDir(MUSIC_DIR, MUSIC_DIR);
  console.log(`Found ${files.length} tracks`);

  console.log("Checking existing R2 objects...");
  const existing = await getExisting();
  const toUpload = files.filter(f => {
    const key = f.replace(/\\/g, "/");
    return !existing.has(key);
  });

  if (!toUpload.length) {
    console.log("All files already uploaded!");
    return;
  }

  console.log(`Uploading ${toUpload.length} new files...\n`);

  for (let i = 0; i < toUpload.length; i++) {
    const rel = toUpload[i];
    const key = rel.replace(/\\/g, "/");
    const full = path.join(MUSIC_DIR, rel);
    const ext = path.extname(rel).toLowerCase();
    const mime = MIME[ext] || "audio/mpeg";

    try {
      const body = fs.readFileSync(full);
      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: mime,
      }));
      console.log(`[${i + 1}/${toUpload.length}] ✓ ${key}`);
    } catch (err) {
      console.error(`[${i + 1}/${toUpload.length}] ✗ ${key} — ${err.message}`);
    }
  }

  console.log("\nDone!");
}

upload();
