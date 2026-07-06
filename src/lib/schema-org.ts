import { agent } from '../data/agent';
import { reviewAggregate } from './listings';
import type { Listing } from './listings';
import type { Lang } from '../i18n';

const SITE = 'https://renatasiserova.cz';

/** Sitewide RealEstateAgent entity. */
export function realEstateAgentJsonLd(lang: Lang) {
  const agg = reviewAggregate();
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${SITE}/#agent`,
    name: agent.name,
    url: SITE,
    telephone: agent.phone,
    email: agent.email,
    image: `${SITE}/og/og-default.jpg`,
    jobTitle: agent.role[lang],
    worksFor: { '@type': 'Organization', name: agent.office.name },
    address: {
      '@type': 'PostalAddress',
      streetAddress: agent.office.street,
      addressLocality: 'Praha 5 – Smíchov',
      postalCode: '150 00',
      addressCountry: 'CZ',
    },
    areaServed: [
      { '@type': 'City', name: 'Praha' },
      { '@type': 'AdministrativeArea', name: 'Středočeský kraj' },
    ],
    knowsLanguage: ['cs', 'en'],
    identifier: { '@type': 'PropertyValue', propertyID: 'IČ', value: agent.ic },
    ...(agg.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: agg.average,
            reviewCount: agg.count,
            bestRating: 5,
          },
        }
      : {}),
  };
}

/** Per-listing structured data. */
export function listingJsonLd(listing: Listing, lang: Lang, url: string, imageUrls: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: lang === 'cs' ? listing.title.cs : listing.title.en,
    url,
    image: imageUrls,
    description: (lang === 'en' && listing.description.en) || listing.description.cs,
    datePosted: listing.firstSeen.slice(0, 10),
    offers: {
      '@type': 'Offer',
      ...(listing.price.amount
        ? {
            price: listing.price.amount,
            priceCurrency: listing.price.currency,
          }
        : {}),
      availability:
        listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      offeredBy: { '@id': `${SITE}/#agent` },
    },
  };
}
