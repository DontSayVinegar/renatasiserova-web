# renatasiserova.cz — personal website of Renata Šiserová (RE/MAX Anděl, Prague)

Astro 5 static site, Tailwind 4, TypeScript strict. Czech (default, no prefix) +
English (`/en/`). Deployed on Cloudflare Pages via GitHub. Owner (Richard) is
non-technical — keep everything simple, documented, and self-healing.

## Commands

- `npm run dev` — dev server
- `npm run build` — build to `dist/` (also validates listings.json via zod)
- `npm run check` — typecheck; `npm test` — scraper parser tests (fixtures)
- `npm run sync` — full sync from remax-czech.cz (listings + reviews + images)
- `npm run sync:dry` — sync without writing anything
- `npx tsx scripts/prepare-portraits.ts` — re-process portraits from `raw-assets/`
- Contact form locally: `npm run build && npx wrangler pages dev dist` (wrangler 3;
  Node 20 host — wrangler 4 needs Node 22). Secrets in `.dev.vars`.

## Architecture (the parts that matter)

- **Data flow:** GitHub Action (`.github/workflows/sync.yml`, 02:30 UTC nightly)
  → `scripts/sync/index.ts` → scrapes her public profile (agent ID 8310) →
  writes `src/data/listings.json` + `reviews.json` + images under
  `src/assets/listings/{id}/` → commits only on diff → push triggers Cloudflare
  Pages redeploy. Zod validation aborts before writing — site keeps last-good data.
- **The contract:** `src/lib/listing-schema.ts`. The scraper, the pages, and the
  future DataHub API adapter all depend on it. Don't change it casually.
- **Source swap point:** `scripts/sync/sources/types.ts` (`ListingSource`).
  When RE/MAX ČR grants DataHub API access, implement
  `sources/remax-datahub.ts` and switch one line in `scripts/sync/index.ts`.
- **Pages pattern:** every page is a thin wrapper (`src/pages/**`) around a
  shared view (`src/views/*View.astro`) parameterized by `lang`. Localized
  routes live in `src/i18n/routes.ts`; UI strings in `src/i18n/cs.ts` + `en.ts`
  (en.ts is typed against cs.ts — adding a key to one forces the other).
- **Agent facts** (phone, IČ, office, certifications, motto): `src/data/agent.ts`.
- **Contact form:** `functions/api/contact.ts` (Cloudflare Pages Function).
  honeypot → Turnstile (if `TURNSTILE_SECRET_KEY` set) → validation → Resend.
  Nothing persisted anywhere (GDPR). Env vars live in Cloudflare Pages settings.

## Guardrails — do not break these

1. **Zero cookies.** No Google Fonts/Maps/YouTube/analytics scripts. Any new
   third-party embed likely sets cookies → would legally require a cookie
   banner and contradict the privacy policy ("tento web nepoužívá cookies").
   The CSP in `public/_headers` blocks unlisted hosts by design — that's a feature.
2. **Polite scraper.** Sync must keep: robots.txt check per run, ≥1.5 s delays,
   identifying User-Agent, nightly-only cadence. Her own data, but their servers.
3. **RE/MAX branding.** Her personal brand first. No balloon logo, no RE/MAX
   trade dress. Affiliation only as text "Realitní makléřka RE/MAX Anděl"
   (logo use would need written office approval).
4. **Reviews** are anonymous on the source — never attribute names to them.
5. **§435 footer** (name, IČ, ŽR registration) must stay on every page.
6. **Design system:** white `#fff` / ink `#111110` / vermillion `#dc2f0a`
   (AA-checked on white — don't lighten), Bricolage Grotesque display +
   Schibsted Grotesk body (self-hosted via Fontsource), sharp corners,
   hairline rules, generous whitespace. No gradients, no border-radius.

## When the nightly sync fails

GitHub e-mails the repo owner on workflow failure; the site is unaffected.
Diagnose: `npm test` (parser vs fixtures) → if remax-czech.cz redesigned,
re-save fixtures (`curl` the index/profile/detail pages into
`scripts/sync/fixtures/`), fix selectors in
`scripts/sync/sources/remax-scraper.ts`, make tests pass, run `npm run sync:dry`.

## Verification before shipping changes

`npm run check && npm test && npm run build`, then eyeball
`npx astro preview` — home, one listing detail, `/en/`, `/kontakt/`.
Lighthouse targets: ≥95 all categories mobile (currently 100/100/100 home).

## Status / launch state

See `RUNBOOK.md` for Richard's zero-to-deployed steps (accounts, domain WEDOS,
Cloudflare Pages, Resend SPF/DKIM, Turnstile, DeepL key, Search Console) and
the pre-launch task list for Renata (photo licenses, DataHub request, sídlo).
