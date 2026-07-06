import { cs } from './cs';
import { en } from './en';
import type { Dictionary } from './cs';

export type Lang = 'cs' | 'en';
export type { Dictionary };

const dictionaries: Record<Lang, Dictionary> = { cs, en };

/** Get the dictionary for a language. Usage: `const t = useT(lang); t.nav.contact` */
export function useT(lang: Lang): Dictionary {
  return dictionaries[lang];
}

/** Format a CZK price for display, e.g. 8490000 → "8 490 000 Kč" */
export function formatPrice(amount: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'cs' ? 'cs-CZ' : 'en-GB', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a date (ISO string) for display. */
export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'cs' ? 'cs-CZ' : 'en-GB', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}
