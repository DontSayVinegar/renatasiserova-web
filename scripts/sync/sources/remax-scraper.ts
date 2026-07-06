/**
 * Polite scraper for Renata's own public profile on remax-czech.cz.
 *
 * Politeness rules (see CLAUDE.md):
 *  - checks robots.txt on every run, aborts if our paths become disallowed
 *  - sequential requests with a fixed delay, single retry with backoff
 *  - identifying User-Agent with contact address
 *
 * Parsers are pure functions of HTML — tested against saved fixtures
 * in ../fixtures/ so a site redesign shows up as a failing test.
 */
import { load } from 'cheerio';
import type { ListingSource, RawListing, RawReview, RawReviews } from './types';

const BASE = 'https://www.remax-czech.cz';
export const AGENT_ID = '8310';
export const INDEX_URL = `${BASE}/reality/nemovitosti-maklere/${AGENT_ID}/renata-siserova/`;
export const PROFILE_URL = `${BASE}/reality/re-max-andel/renata-siserova/`;

const USER_AGENT =
  'RenataSiserovaWeb-Sync/1.0 (+https://renatasiserova.cz; renata.siserova@re-max.cz)';
const DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HttpStatusError extends Error {
  constructor(
    public status: number,
    url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

async function fetchHtml(url: string, attempt = 1): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 404 || res.status === 410) throw new HttpStatusError(res.status, url);
  if (!res.ok) {
    if (attempt < 2) {
      await sleep(5000);
      return fetchHtml(url, attempt + 1);
    }
    throw new HttpStatusError(res.status, url);
  }
  return res.text();
}

/* ------------------------------ robots.txt ------------------------------ */

/** Paths this scraper touches — all must stay allowed in robots.txt. */
const OUR_PATHS = ['/reality/nemovitosti-maklere/', '/reality/detail/', '/reality/re-max-andel/'];

export function robotsAllowsUs(robotsTxt: string): boolean {
  // collect Disallow rules for User-agent: * (simple, conservative parser)
  const lines = robotsTxt.split('\n').map((l) => l.trim());
  let applies = false;
  const disallowed: string[] = [];
  for (const line of lines) {
    const ua = line.match(/^user-agent:\s*(.+)$/i);
    if (ua) {
      applies = ua[1]!.trim() === '*';
      continue;
    }
    const dis = line.match(/^disallow:\s*(.+)$/i);
    if (dis && applies) disallowed.push(dis[1]!.trim());
  }
  return !OUR_PATHS.some((p) => disallowed.some((d) => d !== '' && p.startsWith(d)));
}

export async function checkRobots(): Promise<void> {
  const txt = await fetchHtml(`${BASE}/robots.txt`);
  if (!robotsAllowsUs(txt)) {
    throw new Error(
      'robots.txt on remax-czech.cz now disallows a path this sync uses — aborting. ' +
        'Re-check manually and consider switching to the DataHub API.',
    );
  }
}

/* ------------------------------- parsers -------------------------------- */

export interface IndexCard {
  id: string;
  slug: string;
  url: string;
  titleCs: string;
  priceText: string;
  addressText: string;
  tags: string[];
}

export function parseIndex(html: string): IndexCard[] {
  const $ = load(html);
  const cards: IndexCard[] = [];
  $('.pl-items__item').each((_, el) => {
    const $el = $(el);
    const url = $el.attr('data-url') ?? '';
    const m = url.match(/\/reality\/detail\/(\d+)\/([a-z0-9-]+)/);
    if (!m) return;
    cards.push({
      id: m[1]!,
      slug: m[2]!,
      url: `${BASE}${url}`,
      titleCs: ($el.attr('data-title') ?? '').trim(),
      priceText: load(`<i>${$el.attr('data-price') ?? ''}</i>`)('i')
        .text()
        .replace(/\s+/g, ' ')
        .trim(),
      addressText: ($el.attr('data-display-address') ?? '').replace(/\s+/g, ' ').trim(),
      tags: $el
        .find('[class*="tags__item"]')
        .map((_, t) => $(t).text().trim())
        .get(),
    });
  });
  return cards;
}

export interface DetailData {
  ref: string;
  headline: string | null;
  descriptionCs: string;
  params: Record<string, string>;
  imageUrls: string[];
  tags: string[];
  priceText: string;
  addressText: string;
}

export function parseDetail(html: string): DetailData {
  const $ = load(html);

  const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const refMatch = h1.match(/\(ID\s+([^)]+)\)/);

  const params: Record<string, string> = {};
  $('.pd-detail-info__row').each((_, el) => {
    const label = $(el)
      .find('.pd-detail-info__label')
      .text()
      .replace(/\s+/g, ' ')
      .replace(/:$/, '')
      .trim();
    const value = $(el).find('.pd-detail-info__value').text().replace(/\s+/g, ' ').trim();
    if (label) params[label.replace(/:$/, '')] = value;
  });

  // description lives in the collapsible content block
  const descEl = $('.pd-base-info__content-collapse-inner').first();
  const descriptionCs = descEl
    .text()
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const headline = $('.pd-base-info h4 span').first().text().replace(/\s+/g, ' ').trim() || null;

  // full-size gallery images, page order, dedup, skip thumbnails
  const seen = new Set<string>();
  const imageUrls: string[] = [];
  $('a[href*="mlsf.remax-czech.cz"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.includes('_th') || !/\/zs\/\d+\/\d+\.jpe?g$/i.test(href)) return;
    if (!seen.has(href)) {
      seen.add(href);
      imageUrls.push(href);
    }
  });

  return {
    ref: refMatch?.[1]?.trim() ?? '',
    headline,
    descriptionCs,
    params,
    imageUrls,
    tags: $('[class*="tags__item"]')
      .map((_, t) => $(t).text().trim())
      .get(),
    priceText: $('.pd-header__price').text().replace(/\s+/g, ' ').trim(),
    addressText: $('.pd-header__address').text().replace(/\s+/g, ' ').replace(/mapa$/, '').trim(),
  };
}

export function parseReviews(html: string): RawReviews {
  const $ = load(html);
  const reviews: RawReview[] = [];
  let totalCount = 0;
  let ratingSum = 0;
  $('.references__item').each((_, el) => {
    const text = $(el).find('p').text().replace(/\s+/g, ' ').replace(/^"|"$/g, '').trim();
    const ratingMatch = $(el)
      .find('strong')
      .text()
      .match(/([\d,.]+)\s*\/\s*5/);
    const rating = ratingMatch ? Number(ratingMatch[1]!.replace(',', '.')) : NaN;
    if (Number.isNaN(rating)) return;
    totalCount += 1;
    ratingSum += rating;
    if (text && !/^Bez textového hodnocení/i.test(text)) {
      reviews.push({ textCs: text, rating });
    }
  });
  return {
    reviews,
    totalCount,
    averageRating: totalCount ? Math.round((ratingSum / totalCount) * 10) / 10 : 0,
  };
}

/* ------------------------------- source --------------------------------- */

export function createScrapeSource(log: (msg: string) => void = console.log): ListingSource {
  return {
    name: 'remax-scrape',

    async fetchListings(): Promise<RawListing[]> {
      await checkRobots();
      await sleep(DELAY_MS);
      log(`fetching index ${INDEX_URL}`);
      const cards = parseIndex(await fetchHtml(INDEX_URL));
      log(`index: ${cards.length} listings`);
      const out: RawListing[] = [];
      for (const card of cards) {
        await sleep(DELAY_MS);
        log(`fetching detail ${card.id} (${card.slug})`);
        const detail = parseDetail(await fetchHtml(card.url));
        out.push({
          id: card.id,
          slug: card.slug,
          sourceUrl: card.url,
          titleCs: card.titleCs,
          priceText: card.priceText || detail.priceText,
          tags: [...new Set([...card.tags, ...detail.tags])],
          addressText: card.addressText,
          ref: detail.ref,
          headline: detail.headline,
          descriptionCs: detail.descriptionCs,
          params: detail.params,
          imageUrls: detail.imageUrls,
        });
      }
      return out;
    },

    async fetchReviews(): Promise<RawReviews> {
      await sleep(DELAY_MS);
      log(`fetching profile ${PROFILE_URL}`);
      return parseReviews(await fetchHtml(PROFILE_URL));
    },
  };
}

/** Used by the merge step to test whether a vanished listing still exists. */
export async function detailStillExists(url: string): Promise<boolean> {
  await sleep(DELAY_MS);
  try {
    await fetchHtml(url);
    return true;
  } catch (e) {
    if (e instanceof HttpStatusError && (e.status === 404 || e.status === 410)) return false;
    throw e; // network errors etc. — don't treat as "gone"
  }
}
