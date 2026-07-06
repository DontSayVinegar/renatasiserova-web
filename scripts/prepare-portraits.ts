/**
 * One-off (but repeatable) pipeline: raw portrait photos → optimized site assets.
 * Reads from raw-assets/ (gitignored), writes to src/assets/portraits/ and public/og/.
 * Sharp strips EXIF metadata by default — nothing personal leaks into published files.
 *
 * Run: npx tsx scripts/prepare-portraits.ts
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const RAW = 'raw-assets';
const OUT = 'src/assets/portraits';
const OG = 'public/og';

const jobs: { src: string; out: string; width: number }[] = [
  // hero — the window portrait (Jana Polová, 2025)
  { src: 'janapolova-renca-4.jpg', out: 'renata-window.jpg', width: 1600 },
  // about — full-length standing portrait (Jana Polová, 2025)
  { src: 'janapolova-renca-2.jpg', out: 'renata-standing.jpg', width: 1600 },
  // secondary — sofa portrait (Lightview Atelier, 2024)
  { src: 'lightviewatelier_web2.jpg', out: 'renata-sofa.jpg', width: 1600 },
];

await mkdir(OUT, { recursive: true });
await mkdir(OG, { recursive: true });

for (const job of jobs) {
  const out = path.join(OUT, job.out);
  await sharp(path.join(RAW, job.src))
    .rotate() // respect EXIF orientation before stripping metadata
    .resize({ width: job.width, withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`✓ ${out} ${meta.width}×${meta.height}`);
}

// Open Graph default image: 1200×630 attention-crop of the hero portrait
await sharp(path.join(RAW, 'janapolova-renca-4.jpg'))
  .rotate()
  .resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(OG, 'og-default.jpg'));
console.log(`✓ ${OG}/og-default.jpg 1200×630`);
