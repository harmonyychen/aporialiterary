# Aporia Literary Journal

Astro + TypeScript, custom CSS, pre-rendered pages, a small browser script for native dialog menus/cart, and a Cloudflare Worker for Stripe-hosted test checkout. No React, database, login, or CMS.

## Local preview

Use Node 24 and npm. From this directory:

```sh
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run build
npm run preview
```

Open http://localhost:4321. This runs the built site **and** `/api/checkout` in Cloudflare's local runtime. For hot-reloading frontend development use `ASTRO_TELEMETRY_DISABLED=1 npm run dev`; Astro dev alone does not run the checkout Worker. The handoff also has a built-runtime preview on http://localhost:4322 while the development preview occupies 4321.

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run check
npm test
ASTRO_TELEMETRY_DISABLED=1 npm run build
npx wrangler deploy --dry-run --env preview
```

## Editorial changes

Edit `src/data/editorial.json`. `src/data/content.ts` validates content during the build.

- **Publications:** add an issue with a unique URL-safe `id`, title, summary, cover path, format, priceMinor/currency, and PDF path. The first issue is featured on Home. Copy public covers/PDFs to `public/assets/` or `public/publications/`. Use `null` for unknown prices and PDFs. Prices use integer minor units and ISO currency codes; both price and currency must be supplied together. Browser prices are display-only; the server uses Stripe Price IDs.
- **Featured verses:** update `verses`, keeping actual line breaks as separate `lines` and supplying attribution in `credit`.
- **Masthead:** update name, role, and biography. Missing biographies are visibly marked.
- **Metrics:** update each value and label only from approved figures.
- **Submissions:** set `status` to `unconfirmed`, `closed`, or `open`; supply approved `guidelines` and a Tally form ID before opening. The build rejects `open` without both.
- Rebuild to publish content edits. Never place unpublished manuscripts, submission responses, private biographies, or secret keys in these files.

## Design source and decisions

Source: [Aporia Figma, my redesign](https://www.figma.com/design/pFhqkkFnjAwoPktuwc2qba?node-id=11747-2258). Inspected updated desktop/mobile home, about, shop, archive/reader, cart/menu states, and Images-page metadata using Figma MCP. Original Figma imagery and icon files are local in `public/assets/`; temporary asset URLs are not used at runtime.

Burgundy #570e28, cream #f5efe6, paper #f7f2e8, Playfair Display italic, and Montserrat follow the updated designs. Fonts are locally hosted OFL packages with licenses in their installed package directories. No added Pinyon Script text. Footer appearance and aporialiterary@gmail.com are retained.

The mobile About design had older placeholder names/numbers and shorter copy; the implemented mobile page retains the supplied desktop copy, names, and figures instead. This intentionally makes it longer. Submit extends the same typography and spacing. Quantity controls, clear missing-content notices, and Submit in the menu are functional additions required by the brief. Shop's additional photo appears on mobile as in Figma.

## Integrations and deployment

See [deployment guide](docs/deployment.md) for Stripe, Tally, GitHub, Cloudflare, domain preservation, and estimated costs. See [verification and launch blockers](docs/verification.md).
