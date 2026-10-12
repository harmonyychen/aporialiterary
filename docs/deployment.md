# Integration and deployment guide

## Current state

The site is local-only. The confirmed production domain is `aporialiterary.ca`; its DNS and hosting connection have not been verified. No GitHub remote, Cloudflare account, Worker Stripe API credential, PDF, or Tally form was supplied. Stripe MCP is authenticated to the selected sandbox; see `docs/stripe-setup.md` for the verified catalogue and checkout status. No paid service was enabled and no DNS records changed. Public pages are static; only `/api/*` invokes Worker code first. This uses [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/binding/) with [Astro static output](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/).

## Stripe test checkout

1. Create approved products and one-time prices in Stripe's **test environment**. Confirm currency and product type before configuring. Do not use invented prices.
2. Map editorial IDs to Stripe prices in the selected Wrangler environment's `STRIPE_PRICE_MAP`, for example an object whose `volume-01` value is the actual test Price ID. This map is server-side. Set `SITE_URL` to the exact origin serving checkout, and `CHECKOUT_ENABLED` to `true` only for testing.
3. For local testing copy `.dev.vars.example` to `.dev.vars`, enter the test secret securely there, and never commit it. For hosted preview run `npx wrangler secret put STRIPE_SECRET_KEY --env preview` and enter the key at its prompt. Never paste keys into chat or use a PUBLIC_ variable.
4. Set the confirmed display price/currency in editorial JSON and rebuild. Verify success, cancellation, declined payments, retry, quantities, and combinations with real Stripe test checkout.

The endpoint implements [Checkout Session creation](https://docs.stripe.com/api/checkout/sessions/create). It rejects cross-origin requests, malformed JSON, unapproved products, duplicate identifiers, and non-integer quantities outside 1–20. Browser prices and return URLs are ignored. Secrets never enter the client bundle. Checkout is disabled by default. `STRIPE_MODE=test` accepts only matching test credentials; `STRIPE_MODE=live` accepts only matching live credentials and requires HTTPS. Local/preview are test, production is live with checkout disabled and no live Price mapping.

The checkout now collects Canadian mailing addresses, includes shipping at no extra charge, uses idempotent creation retries, and verifies payment on the return page. The user selected manual fulfillment; see `docs/manual-fulfillment.md`. The 20-copy quantity cap is validation, not stock tracking. No stock reservation or automated fulfillment webhook exists. See `docs/launch-checklist.md` for the actual sandbox tests and account/hosting configuration still needed before launch.

## Tally

Create a form in the Aporia Tally account with name, email, short biography, category, work title, manuscript upload, and agreement to approved guidelines. Keep submissions private in Tally. Publish the form, copy its ID from its Share URL into `submissions.tallyFormId`, supply approved guidelines, then set status to `open` and rebuild. The page uses a [standard Tally iframe](https://tally.so/help/embed-your-form), plus an external fallback link. No simulated submission or local upload handler exists. Validate a real test submission and file access in the account before launch.

## GitHub and Cloudflare

1. Create the intended GitHub repository, initialize this directory with Git, and commit the source and package-lock.json. The repository is not initialized or pushed because no destination was provided. Do not commit `.env`, `.dev.vars`, node_modules, or dist. `.github/workflows/verify.yml` supplies build/type/test checks.
2. Sign into the intended Cloudflare account with `npx wrangler login`. Use the free plan initially.
3. Set the preview environment's `SITE_URL` to its actual preview origin. Build with the same `SITE_URL`; leave `PUBLIC_LAUNCH_READY=false`. Run `npm run deploy:preview` only when ready to publish the preview. No automatic publishing is configured here.
4. In Workers & Pages, select the intended Worker → Settings → Builds → connect the GitHub repository. Configure Node 24, production build command `npm ci && npm run check && npm test && npm run build:production`, and deployment command `npx wrangler deploy --env production`. Set production build `SITE_URL=https://aporialiterary.ca`; use preview environment deployment for non-production branches. Follow [Workers Builds Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/).
5. Keep preview and production secrets separate. Runtime `SITE_URL` lives under each Wrangler environment; build `SITE_URL` controls canonical/social URLs and sitemap. Turn `PUBLIC_LAUNCH_READY=true` on only for a complete approved production launch; previews remain noindex. Copy `.env.example` to `.env` for local builds.
6. After final review, attach the existing domain as a Worker custom domain and deploy production. Production workers.dev is disabled. Do not purchase or transfer the domain.

Before any domain routing change, export and inspect existing DNS. Preserve MX, SPF, DKIM, DMARC, verification TXT, and unrelated subdomains. Only replace the specifically approved web hostname's routing. Confirm Cloudflare zone/account ownership, certificate issuance, HTTPS, and both apex/www behavior after configuration. Do not move nameservers without separately planning preservation of the entire zone. [Custom domains documentation](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## Estimated recurring costs

Checked against official documentation on October 11, 2026; actual account plans and usage determine charges.

| Service | Expected launch cost |
| --- | --- |
| Cloudflare static hosting | $0 within the free plan; static asset requests are free. Dynamic Worker usage has free limits. Paid Workers starts at US$5/month if later needed. [Pricing](https://developers.cloudflare.com/workers/platform/pricing/) |
| Tally standard embed | $0 with free-plan limits; file uploads have a 10 MB per-file limit. Paid features such as removing branding or larger uploads are optional and not enabled. [Pricing](https://tally.so/pricing) |
| Stripe | Test mode costs no real payment-processing fees. Canadian standard domestic-card pricing is 2.9% + CA$0.30 per successful live transaction, with additional fees possible. [Pricing](https://stripe.com/en-ca/pricing) |
| Domain | Existing registrar renewal cost; no new domain purchase required. |
| GitHub | Existing/free repository plan can be used; CI quotas depend on the account. |

No R2 storage is configured: no PDFs were supplied, so there is no evidence it is needed. Check PDF size against the current [static asset limits](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) before adding it. If oversized, first optimize the public PDF, then evaluate R2 pricing and configure only the public publication bucket required. Never use public publication storage for manuscripts.
