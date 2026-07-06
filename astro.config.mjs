// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://renatasiserova.cz',
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    locales: ['cs', 'en'],
    defaultLocale: 'cs',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'cs',
        locales: { cs: 'cs', en: 'en' },
      },
      filter: (page) => !page.includes('/api/'),
    }),
  ],
  image: {
    // Listing photos come from our own repo; portraits likewise. No remote domains needed.
    remotePatterns: [],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
