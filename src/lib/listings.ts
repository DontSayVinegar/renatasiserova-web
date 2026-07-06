import listingsJson from '../data/listings.json';
import reviewsJson from '../data/reviews.json';
import { ListingsFileSchema, ReviewsFileSchema } from './listing-schema';
import type { Listing, Review } from './listing-schema';

export type { Listing, Review };

/* ---- loaders used by pages (validate at build time — bad data fails the build) ---- */

const listingsFile = ListingsFileSchema.parse(listingsJson);
const reviewsFile = ReviewsFileSchema.parse(reviewsJson);

/** Active + reserved listings, newest first. */
export function activeListings(): Listing[] {
  return listingsFile.listings
    .filter((l) => l.status === 'active' || l.status === 'reserved')
    .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
}

/** Sold + rented listings for the track-record archive, newest change first. */
export function soldListings(): Listing[] {
  return listingsFile.listings
    .filter((l) => l.status === 'sold' || l.status === 'rented')
    .sort((a, b) => b.statusChangedAt.localeCompare(a.statusChangedAt));
}

/** Everything that gets a detail page. */
export function publishedListings(): Listing[] {
  return listingsFile.listings.filter((l) => l.status !== 'archived');
}

/** Reviews with text, for display. */
export function allReviews(): Review[] {
  return reviewsFile.reviews;
}

export function reviewAggregate() {
  return reviewsFile.aggregate;
}

export function lastSyncedAt(): string {
  return listingsFile.syncedAt;
}
