/**
 * Listing image pipeline: download new photos from mlsf.remax-czech.cz,
 * resize/compress with sharp, commit-friendly paths under src/assets/listings/.
 * Only missing files are downloaded — re-runs are cheap and polite.
 */
import { mkdir, readdir, rm, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'src/assets/listings';
const USER_AGENT =
  'RenataSiserovaWeb-Sync/1.0 (+https://renatasiserova.cz; renata.siserova@re-max.cz)';
const DELAY_MS = 400;
const MAX_WIDTH = 1600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** repo-relative web path used in listings.json */
const webPath = (id: string, file: string) => `/src/assets/listings/${id}/${file}`;

export async function syncListingImages(
  id: string,
  imageUrls: string[],
  cap: number,
  log: (m: string) => void = console.log,
): Promise<string[]> {
  const dir = path.join(ROOT, id);
  await mkdir(dir, { recursive: true });
  const kept: string[] = [];

  for (const url of imageUrls.slice(0, cap)) {
    const name = path.basename(new URL(url).pathname); // e.g. 3411864.jpg
    const file = path.join(dir, name);
    if (!existsSync(file)) {
      await sleep(DELAY_MS);
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) {
        log(`  image ${url} → HTTP ${res.status}, skipping`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(file);
      log(`  downloaded ${webPath(id, name)}`);
    }
    kept.push(webPath(id, name));
  }

  // prune files no longer referenced (sold listings keep only a few photos)
  const keepNames = new Set(kept.map((p) => path.basename(p)));
  for (const existing of await readdir(dir)) {
    if (!keepNames.has(existing)) {
      await unlink(path.join(dir, existing));
      log(`  pruned ${webPath(id, existing)}`);
    }
  }

  return kept;
}

export async function removeListingImages(id: string): Promise<void> {
  await rm(path.join(ROOT, id), { recursive: true, force: true });
}
