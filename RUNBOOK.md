# 🚀 Od nuly k živému webu — návod pro Richarda

Tenhle návod tě provede spuštěním webu **renatasiserova.cz** krok za krokem.
Nepotřebuješ umět programovat — všechno je klikání v prohlížeči. Kroky označené
**[Claude]** udělá Claude Code, když mu řekneš.

**Celkové náklady: ~299 Kč/rok** (jen doména). Všechno ostatní je zdarma.
**Čas: ~2–3 hodiny** rozložené do 1–2 dnů (čeká se na DNS).

---

## Krok 1 — GitHub účet (10 min, zdarma)

GitHub = místo, kde žije kód webu a odkud běží noční synchronizace s REMAXem.

1. Jdi na [github.com](https://github.com) → **Sign up**.
2. Použij svůj e-mail, potvrď ověřovací kód.
3. Nainstaluj GitHub CLI: otevři Terminál a spusť `brew install gh`
   (pokud nemáš Homebrew: [brew.sh](https://brew.sh)).
4. Spusť `gh auth login` → Enter, Enter, přihlaš se v prohlížeči.

**[Claude]** pak vytvoří repozitář a nahraje kód: řekni mu _„vytvoř GitHub repo a pushni"_.

## Krok 2 — Cloudflare účet (10 min, zdarma)

Cloudflare = hosting webu, DNS, ochrana formuláře, statistiky. Vše v jednom účtu.

1. Jdi na [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Zaregistruj se, potvrď e-mail.

## Krok 3 — Doména renatasiserova.cz (20 min, ~299 Kč/rok)

1. Jdi na [wedos.cz](https://www.wedos.cz) → Domény → vyhledej `renatasiserova.cz`.
2. Objednej **pouze doménu** (žádný webhosting, žádný e-mail — nabídky odmítni).
3. Jako vlastníka uveď **Renatu Šiserovou** (jméno, adresa, IČ 06967841).
4. Zaplať a počkej na potvrzení (pár minut).

## Krok 4 — Napojení domény na Cloudflare (15 min + čekání)

1. V Cloudflare: **Add a site** → zadej `renatasiserova.cz` → vyber **Free** plán.
2. Cloudflare ti ukáže **2 nameservery** (např. `ada.ns.cloudflare.com`).
3. V administraci WEDOS: Domény → renatasiserova.cz → **Změna DNS serverů** →
   zadej ty 2 nameservery z Cloudflare.
4. Počkej (obvykle do hodiny, max. 24 h). Cloudflare pošle e-mail „site is active".

## Krok 5 — Nasazení webu na Cloudflare Pages (15 min)

1. V Cloudflare: **Workers & Pages** → **Create** → záložka **Pages** →
   **Connect to Git** → povol přístup ke GitHub repozitáři → vyber repo.
2. Nastavení buildu: Framework preset **Astro** (build command `npm run build`,
   output `dist` — mělo by se předvyplnit samo).
3. **Save and Deploy.** Za ~2 minuty web běží na `něco.pages.dev` — zkontroluj ho!
4. Po kontrole: v projektu → **Custom domains** → **Add** → `renatasiserova.cz`
   a pak ještě jednou `www.renatasiserova.cz`. Cloudflare vše nastaví sám (1 klik).

## Krok 6 — Kontaktní formulář: Resend (15 min, zdarma)

Resend doručuje zprávy z formuláře do Renatiny schránky.

1. Registruj se na [resend.com](https://resend.com) (100 e-mailů denně zdarma).
2. **Domains** → **Add domain** → `renatasiserova.cz` → Resend ukáže 3 DNS
   záznamy (SPF + DKIM).
3. V Cloudflare: **DNS** → **Add record** → zkopíruj všechny 3 záznamy přesně
   (typ, název, hodnota). Za pár minut Resend ukáže „Verified" ✅.
4. **API Keys** → **Create API key** → zkopíruj klíč (`re_...`).
5. V Cloudflare Pages projektu: **Settings → Environment variables** →
   **Add variable**: jméno `RESEND_API_KEY`, hodnota = ten klíč. Ulož a
   redeployni (Deployments → ⋯ → Retry deployment).

## Krok 7 — Ochrana proti spamu: Turnstile (10 min, zdarma)

1. V Cloudflare: **Turnstile** → **Add widget**.
2. Domény: `renatasiserova.cz` + tvoje `*.pages.dev` doména. Mode: Managed.
3. Zkopíruj **Site Key** a **Secret Key**.
4. V Pages projektu → Environment variables přidej:
   - `PUBLIC_TURNSTILE_SITE_KEY` = Site Key
   - `TURNSTILE_SECRET_KEY` = Secret Key
5. Redeploy. Ve formuláři se objeví nenápadná ochrana.

## Krok 8 — Anglické překlady: DeepL (10 min, zdarma, volitelné)

Bez tohoto kroku web funguje — anglické stránky ukážou český popis s anglickou
poznámkou. S DeepL se popisy nemovitostí a reference přeloží automaticky.

1. Registruj se na [deepl.com/pro-api](https://www.deepl.com/pro-api) → **DeepL API Free**
   (chce kartu na ověření, ale nic neúčtuje).
2. Zkopíruj **Authentication Key**.
3. Na GitHubu: repo → **Settings → Secrets and variables → Actions** →
   **New repository secret**: jméno `DEEPL_API_KEY`, hodnota = klíč.
4. Překlady se doplní při další noční synchronizaci (nebo spusť ručně:
   repo → **Actions** → sync-remax → **Run workflow**).

## Krok 9 — Test formuláře (5 min)

1. Otevři web → Kontakt → pošli testovací zprávu sám sobě.
2. Zkontroluj, že dorazila na `renata.siserova@re-max.cz` a že **Odpovědět**
   směřuje na odesílatele.
3. Otestuj na [mail-tester.com](https://www.mail-tester.com) — mělo by být ≥ 9/10.

## Krok 10 — Po spuštění (30 min)

1. **Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console)):
   přidej doménu (ověření = 1 TXT záznam v Cloudflare DNS), pak
   **Sitemaps** → odešli `https://renatasiserova.cz/sitemap-index.xml`.
2. **Google Business Profile**: jestli Renata má/založí profil, přidej odkaz na web.
3. **Cloudflare Web Analytics**: v Cloudflare → Analytics & Logs → Web Analytics →
   zapni pro doménu (bez cookies, netřeba banner).
4. Přidej odkaz na web do Renatina e-mailového podpisu a profilu na remax-czech.cz.

---

## ✅ Před spuštěním musí Renata (nic z toho neblokuje stavbu webu)

| Úkol                                                                                                          | Proč                                    |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| E-mail na RE/MAX ČR centrálu: žádost o přístup k **DataHub API** + info, že web zatím čte její veřejný profil | oficiální datová cesta místo čtení webu |
| Potvrzení od fotografek (**Jana Polová**, **Lightview Atelier**), že portréty lze použít na webu              | autorská práva                          |
| Souhlas kanceláře s použitím fotek nemovitostí na jejím webu                                                  | autorská práva                          |
| Ověřit **sídlo** v živnostenském rejstříku ([rzp.gov.cz](https://rzp.gov.cz)) — má být v patičce              | §435 obč. zák.                          |
| Potvrdit, že má sjednané **pojištění profesní odpovědnosti** (povinné dle z. 39/2020)                         | text v patičce to uvádí                 |
| Přečíst si všechny texty na webu a odsouhlasit je                                                             | je to její web                          |

## 🔧 Když se něco pokazí

- **Noční synchronizace selhala** → GitHub ti pošle e-mail. Web dál běží se
  starými daty. Otevři Claude Code a řekni: _„noční sync selhal, oprav to"_.
- **Chceš změnit text** → řekni Claude Code co a kde, nebo uprav
  `src/i18n/cs.ts` / `en.ts` (texty) či `src/data/agent.ts` (fakta o Renatě).
- **Nová profilová fotka** → dej ji do `raw-assets/`, řekni Claude Code.
