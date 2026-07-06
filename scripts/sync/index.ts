/**
 * Nightly sync orchestrator.
 *
 *   npm run sync        — full sync: scrape → normalize → translate → images → write
 *   npm run sync:dry    — no writes, no image downloads; prints what would change
 *
 * Fail-safe: any parse/validation error aborts BEFORE anything is written,
 * so the site keeps serving the last good data.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  ListingsFileSchema,
  ReviewsFileSchema,
  type Listing,
  type ListingsFile,
  type ReviewsFile,
} from '../../src/lib/listing-schema';
import { createScrapeSource, detailStillExists, PROFILE_URL } from './sources/remax-scraper';
import { normalize } from './normalize';
import { createTranslator } from './translate';
import { syncListingImages, removeListingImages } from './images';

const LISTINGS_PATH = 'src/data/listings.json';
const REVIEWS_PATH = 'src/data/reviews.json';
const ACTIVE_IMAGE_CAP = 15;
const SOLD_IMAGE_CAP = 6;

const dryRun = process.argv.includes('--dry-run');
const log = (m: string) => console.log(dryRun ? `[dry] ${m}` : m);

async function main() {
  const now = new Date().toISOString();
  const existing = ListingsFileSchema.parse(JSON.parse(readFileSync(LISTINGS_PATH, 'utf8')));
  const existingById = new Map(existing.listings.map((l) => [l.id, l]));

  const source = createScrapeSource(log);
  const rawListings = await source.fetchListings();
  const rawReviews = await source.fetchReviews();

  if (rawListings.length === 0) {
    throw new Error(
      'Scrape returned 0 listings — refusing to overwrite data (site keeps last-good).',
    );
  }

  const translator = createTranslator(log);
  const nextListings: Listing[] = [];
  const seenIds = new Set<string>();

  for (const raw of rawListings) {
    seenIds.add(raw.id);
    const norm = normalize(raw);
    const prev = existingById.get(raw.id);
    const isSoldish = norm.status === 'sold' || norm.status === 'rented';
    const cap = isSoldish ? SOLD_IMAGE_CAP : ACTIVE_IMAGE_CAP;

    const en = await translator.translate(norm.description.cs);

    const images = dryRun
      ? (prev?.images ?? [])
      : await syncListingImages(raw.id, raw.imageUrls, cap, log);

    nextListings.push({
      ...norm,
      description: { cs: norm.description.cs, en },
      images,
      firstSeen: prev?.firstSeen ?? now,
      lastSeen: now,
      statusChangedAt: prev && prev.status === norm.status ? prev.statusChangedAt : now,
    });

    if (prev && prev.status !== norm.status) {
      log(`status change ${raw.id}: ${prev.status} → ${norm.status}`);
    } else if (!prev) {
      log(`new listing ${raw.id}: ${norm.title.cs}`);
    }
  }

  // listings that vanished from the index
  for (const prev of existing.listings) {
    if (seenIds.has(prev.id) || prev.status === 'archived') {
      if (prev.status === 'archived' && !seenIds.has(prev.id)) nextListings.push(prev);
      continue;
    }
    const gone = !(await detailStillExists(prev.sourceUrl));
    if (gone) {
      log(`archiving ${prev.id} (${prev.title.cs}) — no longer published`);
      if (!dryRun) await removeListingImages(prev.id);
      nextListings.push({ ...prev, images: [], status: 'archived', statusChangedAt: now });
    } else {
      log(`listing ${prev.id} missing from index but detail still live — keeping as-is`);
      nextListings.push(prev);
    }
  }

  // reviews (anonymous on the source: text + rating only)
  const reviews = [];
  for (const r of rawReviews.reviews) {
    const id = createHash('sha256').update(r.textCs).digest('hex').slice(0, 12);
    const en = await translator.translate(r.textCs);
    reviews.push({ id, rating: r.rating, text: { cs: r.textCs, en }, sourceUrl: PROFILE_URL });
  }

  const listingsFile: ListingsFile = {
    syncedAt: now,
    source: 'remax-scrape',
    listings: nextListings.sort((a, b) => Number(b.id) - Number(a.id)),
  };
  const reviewsFile: ReviewsFile = {
    syncedAt: now,
    aggregate: { count: rawReviews.totalCount, average: rawReviews.averageRating },
    reviews,
  };

  // validate BEFORE writing — this is the fail-safe
  ListingsFileSchema.parse(listingsFile);
  ReviewsFileSchema.parse(reviewsFile);

  const statusCounts = nextListings.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});
  log(
    `result: ${nextListings.length} listings (${JSON.stringify(statusCounts)}), ` +
      `${reviews.length} text reviews of ${rawReviews.totalCount} total, avg ${rawReviews.averageRating}`,
  );

  if (dryRun) {
    log('dry run — nothing written.');
    return;
  }

  writeFileSync(LISTINGS_PATH, JSON.stringify(listingsFile, null, 2) + '\n');
  writeFileSync(REVIEWS_PATH, JSON.stringify(reviewsFile, null, 2) + '\n');
  log(`wrote ${LISTINGS_PATH} and ${REVIEWS_PATH}`);
}

main().catch((e) => {
  console.error(`SYNC FAILED: ${(e as Error).message}`);
  process.exit(1);
});
