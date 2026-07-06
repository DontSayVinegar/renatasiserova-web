/**
 * The swap point: when RE/MAX ČR grants DataHub API access, implement
 * a second ListingSource in remax-datahub.ts and switch it in index.ts.
 * Everything downstream (normalize → translate → images → merge → write)
 * stays untouched.
 */

/** Listing data as read from the source, before normalization/merge. */
export interface RawListing {
  id: string;
  slug: string;
  sourceUrl: string;
  titleCs: string;
  /** e.g. "8 490 000 Kč …", "Prodáno", "Pronajato" */
  priceText: string;
  /** badge texts, e.g. ["Exkluzivně", "Prodáno"] */
  tags: string[];
  /** "Beroun , Středočeský kraj" — from the index card */
  addressText: string;
  /** ref number, e.g. "218-NP07234" (from detail) */
  ref: string;
  /** marketing headline above the description (from detail) */
  headline: string | null;
  descriptionCs: string;
  /** label → value pairs from the "Podrobné informace" table */
  params: Record<string, string>;
  /** full-size image URLs on mlsf.remax-czech.cz, in page order */
  imageUrls: string[];
}

export interface RawReview {
  textCs: string;
  rating: number;
}

export interface RawReviews {
  reviews: RawReview[];
  /** total count including "no text" ratings */
  totalCount: number;
  averageRating: number;
}

export interface ListingSource {
  name: 'remax-scrape' | 'remax-datahub';
  fetchListings(): Promise<RawListing[]>;
  fetchReviews(): Promise<RawReviews>;
}
