import type { ImageMetadata } from 'astro';

/**
 * Bridge between listings.json image paths (strings written by the sync
 * script) and Astro's optimized image pipeline.
 */
const modules = import.meta.glob<{ default: ImageMetadata }>('/src/assets/listings/**/*.jpg');

export function listingImage(path: string): (() => Promise<{ default: ImageMetadata }>) | null {
  return modules[path] ?? null;
}

/** First resolvable image of a listing (cover photo). */
export function coverImage(paths: string[]) {
  for (const p of paths) {
    const mod = listingImage(p);
    if (mod) return mod;
  }
  return null;
}
