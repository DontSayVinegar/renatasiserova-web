import type { Lang } from './index';

/** Localized route map — single source of truth for all internal URLs. */
export const routes = {
  home: { cs: '/', en: '/en/' },
  listings: { cs: '/nemovitosti/', en: '/en/properties/' },
  sold: { cs: '/prodane/', en: '/en/sold/' },
  reviews: { cs: '/reference/', en: '/en/reviews/' },
  process: { cs: '/jak-prodavam/', en: '/en/how-i-sell/' },
  about: { cs: '/o-mne/', en: '/en/about/' },
  contact: { cs: '/kontakt/', en: '/en/contact/' },
  privacy: { cs: '/ochrana-osobnich-udaju/', en: '/en/privacy/' },
} as const;

export type RouteKey = keyof typeof routes;

export function route(key: RouteKey, lang: Lang): string {
  return routes[key][lang];
}

export function listingUrl(slug: string, lang: Lang): string {
  return lang === 'cs' ? `/nemovitosti/${slug}/` : `/en/properties/${slug}/`;
}

/**
 * Given the current pathname, return the equivalent path in the other language
 * (used by the language switcher and hreflang tags).
 */
export function alternatePath(pathname: string, from: Lang): string {
  const to: Lang = from === 'cs' ? 'en' : 'cs';
  // listing detail pages
  const csDetail = pathname.match(/^\/nemovitosti\/([^/]+)\/$/);
  if (csDetail) return listingUrl(csDetail[1]!, 'en');
  const enDetail = pathname.match(/^\/en\/properties\/([^/]+)\/$/);
  if (enDetail) return listingUrl(enDetail[1]!, 'cs');
  // static routes
  for (const key of Object.keys(routes) as RouteKey[]) {
    if (routes[key][from] === pathname) return routes[key][to];
  }
  // fallback: home
  return routes.home[to];
}
