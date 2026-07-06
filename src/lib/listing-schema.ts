import { z } from 'zod';

/**
 * The Listing schema is THE contract between the sync pipeline
 * (scripts/sync/*) and the site. The future RE/MAX DataHub adapter
 * must produce exactly this shape — nothing else changes.
 *
 * Pure schemas only — no JSON imports, so the sync script can use
 * this module without touching the current data files.
 */
export const ListingSchema = z.object({
  id: z.string().regex(/^\d+$/),
  ref: z.string(),
  slug: z.string().min(1),
  source: z.enum(['remax-scrape', 'remax-datahub']),
  sourceUrl: z.string().url(),
  title: z.object({ cs: z.string().min(1), en: z.string().min(1) }),
  description: z.object({ cs: z.string(), en: z.string().nullable() }),
  offerType: z.enum(['sale', 'rent']),
  propertyType: z.enum(['apartment', 'house', 'land', 'commercial', 'other']),
  disposition: z.string().nullable(),
  price: z.object({
    amount: z.number().int().positive().nullable(),
    currency: z.literal('CZK'),
    period: z.enum(['once', 'month']),
    note: z.object({ cs: z.string(), en: z.string() }).nullable(),
  }),
  areaM2: z.number().positive().nullable(),
  landAreaM2: z.number().positive().nullable(),
  location: z.object({
    municipality: z.string().min(1),
    district: z.string().nullable(),
    region: z.string(),
  }),
  status: z.enum(['active', 'reserved', 'sold', 'rented', 'archived']),
  images: z.array(z.string()).max(40),
  firstSeen: z.string(),
  lastSeen: z.string(),
  statusChangedAt: z.string(),
});

/** Reviews on remax-czech.cz are published anonymously — text + rating only. */
export const ReviewSchema = z.object({
  id: z.string(),
  rating: z.number().min(1).max(5),
  text: z.object({ cs: z.string().min(1), en: z.string().nullable() }),
  sourceUrl: z.string().url(),
});

export const ListingsFileSchema = z.object({
  syncedAt: z.string(),
  source: z.enum(['remax-scrape', 'remax-datahub']),
  listings: z.array(ListingSchema),
});

export const ReviewsFileSchema = z.object({
  syncedAt: z.string(),
  aggregate: z.object({ count: z.number().int().nonnegative(), average: z.number() }),
  reviews: z.array(ReviewSchema),
});

export type Listing = z.infer<typeof ListingSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type ListingsFile = z.infer<typeof ListingsFileSchema>;
export type ReviewsFile = z.infer<typeof ReviewsFileSchema>;
