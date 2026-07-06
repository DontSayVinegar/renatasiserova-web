# renatasiserova.cz

Personal website of **Renata Šiserová**, real estate agent at RE/MAX Anděl, Prague.

- 🇨🇿 Czech + 🇬🇧 English, statically generated with [Astro](https://astro.build)
- 🏠 Listings + ⭐ reviews auto-synced nightly from her public remax-czech.cz profile
- ✉️ Contact form via Cloudflare Pages Functions + Resend (nothing stored — GDPR-clean)
- 🍪 Zero cookies by design → no cookie banner needed
- 💸 Runs entirely on free tiers; only cost is the domain (~299 Kč/yr)

| Doc | For |
|---|---|
| [RUNBOOK.md](RUNBOOK.md) | Richard — zero-to-deployed, step by step, no coding |
| [CLAUDE.md](CLAUDE.md) | Claude Code — architecture, guardrails, maintenance |

## Quick start

```sh
npm install
npm run dev        # local site at localhost:4321
npm run sync:dry   # preview what the nightly sync would change
npm test           # scraper parser tests against saved fixtures
```
