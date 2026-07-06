/**
 * Pure normalization: RawListing (source shape) → Listing fields.
 * No I/O — fully covered by tests against fixtures.
 */
import type { RawListing } from './sources/types';
import type { Listing } from '../../src/lib/listing-schema';

export type NormalizedListing = Omit<
  Listing,
  'images' | 'firstSeen' | 'lastSeen' | 'statusChangedAt' | 'description'
> & { description: { cs: string; en: string | null } };

export function parseCzkAmount(text: string): number | null {
  const m = text.match(/([\d\s ]+)\s*Kč/);
  if (!m) return null;
  const n = Number(m[1]!.replace(/[\s ]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function parseAreaM2(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.match(/([\d\s ]+(?:[.,]\d+)?)\s*m²/);
  if (!m) return null;
  const n = Number(m[1]!.replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function offerType(titleCs: string): 'sale' | 'rent' {
  return /^pronájem/i.test(titleCs) ? 'rent' : 'sale';
}

function propertyType(titleCs: string): Listing['propertyType'] {
  const t = titleCs.toLowerCase();
  if (t.includes(' bytu')) return 'apartment';
  if (t.includes('chaty') || t.includes('chalupy') || t.includes(' domu') || t.includes('vily'))
    return 'house';
  if (t.includes('pozemku')) return 'land';
  if (t.includes('komerč') || t.includes('kancelář') || t.includes('obchodní')) return 'commercial';
  return 'other';
}

function typeLabelEn(titleCs: string): string {
  const t = titleCs.toLowerCase();
  if (t.includes(' bytu')) return 'Apartment';
  if (t.includes('chaty') || t.includes('chalupy')) return 'Cottage';
  if (t.includes(' domu') || t.includes('vily')) return 'House';
  if (t.includes('pozemku')) return 'Land plot';
  if (t.includes('komerč') || t.includes('kancelář') || t.includes('obchodní'))
    return 'Commercial property';
  return 'Property';
}

function statusFromTags(tags: string[], priceText: string): Listing['status'] {
  const all = [...tags, priceText].join(' ').toLowerCase();
  if (all.includes('prodáno')) return 'sold';
  if (all.includes('pronajato')) return 'rented';
  if (all.includes('rezerv')) return 'reserved';
  return 'active';
}

function municipalityFromTitle(titleCs: string): string {
  const idx = titleCs.lastIndexOf(',');
  return idx === -1 ? titleCs.trim() : titleCs.slice(idx + 1).trim();
}

function parseLocation(addressText: string, municipality: string) {
  const parts = addressText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const region = parts.at(-1) ?? '';
  const mid = parts.slice(0, -1).filter((p) => p !== region && !/\d/.test(p));
  const district = mid.find((p) => p !== municipality && !municipality.includes(p)) ?? null;
  return { municipality, district, region };
}

export function normalize(raw: RawListing): NormalizedListing {
  const offer = offerType(raw.titleCs);
  const type = propertyType(raw.titleCs);
  const disposition = raw.titleCs.match(/(\d\+(?:kk|\d))/)?.[1] ?? null;
  const municipality = municipalityFromTitle(raw.titleCs);

  const titleArea = parseAreaM2(raw.titleCs);
  const usable =
    parseAreaM2(raw.params['Užitná plocha']) ?? parseAreaM2(raw.params['Celková plocha']);
  const plot =
    parseAreaM2(raw.params['Plocha parcely']) ?? parseAreaM2(raw.params['Plocha pozemku']);

  const areaM2 = type === 'land' ? null : (usable ?? titleArea);
  const landAreaM2 = type === 'land' ? (plot ?? titleArea) : plot;

  const amount = parseCzkAmount(raw.priceText);
  const municipalityEn = municipality.replace(/\bPraha\b/g, 'Prague');
  const shownArea = type === 'land' ? landAreaM2 : areaM2;
  const titleEn = [
    `${typeLabelEn(raw.titleCs)} ${offer === 'sale' ? 'for sale' : 'for rent'}`,
    disposition,
    shownArea ? `${new Intl.NumberFormat('en-GB').format(shownArea)} m²` : null,
    municipalityEn,
  ]
    .filter(Boolean)
    .join(', ');

  const descriptionCs = [raw.headline, raw.descriptionCs].filter(Boolean).join('\n\n');

  return {
    id: raw.id,
    ref: raw.ref,
    slug: raw.slug,
    source: 'remax-scrape',
    sourceUrl: raw.sourceUrl,
    title: { cs: raw.titleCs, en: titleEn },
    description: { cs: descriptionCs, en: null },
    offerType: offer,
    propertyType: type,
    disposition,
    price: {
      amount,
      currency: 'CZK',
      period: offer === 'rent' ? 'month' : 'once',
      note: null,
    },
    areaM2,
    landAreaM2,
    location: parseLocation(raw.addressText, municipality),
    status: statusFromTags(raw.tags, raw.priceText),
  };
}
