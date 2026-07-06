import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  parseIndex,
  parseDetail,
  parseReviews,
  robotsAllowsUs,
} from '../scripts/sync/sources/remax-scraper';
import { normalize, parseCzkAmount, parseAreaM2 } from '../scripts/sync/normalize';
import type { RawListing } from '../scripts/sync/sources/types';

const fixture = (name: string) => readFileSync(`scripts/sync/fixtures/${name}`, 'utf8');

describe('robots.txt', () => {
  it('allows our paths with the current live rules', () => {
    expect(robotsAllowsUs(fixture('robots.txt'))).toBe(true);
  });
  it('blocks when a path we use becomes disallowed', () => {
    expect(robotsAllowsUs('User-agent: *\nDisallow: /reality/detail/')).toBe(false);
    expect(robotsAllowsUs('User-agent: *\nDisallow: /')).toBe(false);
  });
  it('ignores rules for other user agents', () => {
    expect(robotsAllowsUs('User-agent: BadBot\nDisallow: /')).toBe(true);
  });
});

describe('parseIndex', () => {
  const cards = parseIndex(fixture('index.html'));

  it('finds all 8 listings', () => {
    expect(cards).toHaveLength(8);
  });

  it('parses the active cottage card correctly', () => {
    const c = cards.find((c) => c.id === '441842')!;
    expect(c.slug).toBe('prodej-chaty-chalupy-80-m2-praha-10-dubec');
    expect(c.titleCs).toBe('Prodej chaty / chalupy 80 m², Praha 10 - Dubeč');
    expect(c.priceText).toContain('8 490 000 Kč');
    expect(c.tags).toContain('Exkluzivně');
    expect(c.url).toBe(
      'https://www.remax-czech.cz/reality/detail/441842/prodej-chaty-chalupy-80-m2-praha-10-dubec',
    );
  });

  it('parses sold and rented badges', () => {
    expect(cards.find((c) => c.id === '416439')!.tags).toContain('Prodáno');
    expect(cards.find((c) => c.id === '440743')!.tags).toContain('Pronajato');
  });
});

describe('parseDetail', () => {
  const active = parseDetail(fixture('detail-active.html'));
  const sold = parseDetail(fixture('detail-sold.html'));

  it('extracts the reference number from the H1', () => {
    expect(active.ref).toBe('218-NP07234');
    expect(sold.ref).toBe('218-NP06514');
  });

  it('extracts parameters', () => {
    expect(active.params['Užitná plocha']).toBe('80 m²');
    expect(active.params['Plocha parcely']).toBe('1 444 m²');
  });

  it('extracts the description and headline', () => {
    expect(active.headline).toBe('Nadstandardně velký pozemek s chatou k celoročnímu bydlení');
    expect(active.descriptionCs).toContain('Nabízíme k prodeji jedinečný pozemek');
    expect(active.descriptionCs.length).toBeGreaterThan(500);
  });

  it('extracts full-size gallery images without thumbnails', () => {
    expect(active.imageUrls.length).toBeGreaterThan(5);
    expect(active.imageUrls[0]).toMatch(/^https:\/\/mlsf\.remax-czech\.cz\/data\/\/zs\/441842\/\d+\.jpg$/);
    expect(active.imageUrls.every((u) => !u.includes('_th'))).toBe(true);
  });

  it('sees the sold tag on the sold detail page', () => {
    expect(sold.tags).toContain('Prodáno');
  });
});

describe('parseReviews', () => {
  const r = parseReviews(fixture('profile.html'));

  it('finds a healthy number of reviews, all rated', () => {
    expect(r.totalCount).toBeGreaterThanOrEqual(50);
    expect(r.reviews.length).toBeGreaterThanOrEqual(45);
    expect(r.averageRating).toBe(5);
  });

  it('strips quotes and excludes "no text" entries', () => {
    expect(r.reviews.every((rev) => !rev.textCs.startsWith('"'))).toBe(true);
    expect(r.reviews.every((rev) => !/^Bez textového/.test(rev.textCs))).toBe(true);
  });
});

describe('normalize', () => {
  const cards = parseIndex(fixture('index.html'));
  const detail = parseDetail(fixture('detail-active.html'));
  const card = cards.find((c) => c.id === '441842')!;
  const raw: RawListing = {
    id: card.id,
    slug: card.slug,
    sourceUrl: card.url,
    titleCs: card.titleCs,
    priceText: card.priceText,
    tags: [...card.tags, ...detail.tags],
    addressText: card.addressText,
    ref: detail.ref,
    headline: detail.headline,
    descriptionCs: detail.descriptionCs,
    params: detail.params,
    imageUrls: detail.imageUrls,
  };
  const n = normalize(raw);

  it('normalizes the cottage listing', () => {
    expect(n.offerType).toBe('sale');
    expect(n.propertyType).toBe('house');
    expect(n.price.amount).toBe(8_490_000);
    expect(n.areaM2).toBe(80);
    expect(n.landAreaM2).toBe(1444);
    expect(n.status).toBe('active');
    expect(n.location.municipality).toBe('Praha 10 - Dubeč');
    expect(n.location.region).toBe('Hlavní město Praha');
    expect(n.title.en).toBe('Cottage for sale, 80 m², Prague 10 - Dubeč');
    expect(n.description.cs).toContain('Nadstandardně velký pozemek');
  });

  it('normalizes a sold apartment', () => {
    const soldCard = cards.find((c) => c.id === '416439')!;
    const sn = normalize({
      ...raw,
      id: soldCard.id,
      slug: soldCard.slug,
      sourceUrl: soldCard.url,
      titleCs: soldCard.titleCs,
      priceText: soldCard.priceText,
      tags: soldCard.tags,
      addressText: soldCard.addressText,
    });
    expect(sn.status).toBe('sold');
    expect(sn.propertyType).toBe('apartment');
    expect(sn.disposition).toBe('2+kk');
    expect(sn.price.amount).toBeNull();
    expect(sn.location.municipality).toBe('Praha 1 - Staré Město');
  });

  it('normalizes a rented apartment and land', () => {
    const rented = cards.find((c) => c.id === '440743')!;
    const rn = normalize({ ...raw, titleCs: rented.titleCs, priceText: rented.priceText, tags: rented.tags, addressText: rented.addressText, params: {} });
    expect(rn.offerType).toBe('rent');
    expect(rn.status).toBe('rented');
    expect(rn.price.period).toBe('month');

    const land = cards.find((c) => c.id === '425734')!;
    const ln = normalize({ ...raw, titleCs: land.titleCs, priceText: land.priceText, tags: land.tags, addressText: land.addressText, params: {} });
    expect(ln.propertyType).toBe('land');
    expect(ln.areaM2).toBeNull();
    expect(ln.landAreaM2).toBe(4000);
    expect(ln.location.district).toBe('Beroun');
    expect(ln.location.region).toBe('Středočeský kraj');
    expect(ln.title.en).toBe('Land plot for sale, 4,000 m², Lážovice');
  });
});

describe('parsers helpers', () => {
  it('parseCzkAmount', () => {
    expect(parseCzkAmount('8 490 000 Kč ( za nemovitost)')).toBe(8_490_000);
    expect(parseCzkAmount('Prodáno')).toBeNull();
    expect(parseCzkAmount('Cena na vyžádání')).toBeNull();
  });
  it('parseAreaM2', () => {
    expect(parseAreaM2('1 444 m²')).toBe(1444);
    expect(parseAreaM2(undefined)).toBeNull();
  });
});
