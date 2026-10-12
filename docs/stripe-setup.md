# Stripe setup handoff

## Current status — 2026-10-12

The official Stripe MCP is authenticated to **Aporia Literary Journal sandbox** (`acct_1UPkhoKWKnARJvwM`, test mode), selected by the user. Only this sandbox was returned by account discovery; live Stripe access was not available.

User-confirmed policies:

- Production domain: `aporialiterary.ca`.
- Physical journals mailed within Canada only; shipping included in the product price.
- Manual payment review and fulfillment.
- “All sales are final. For complaints or order issues, contact aporialiterary@gmail.com.”
- Aporia reports it is not registered for GST/HST. No tax collection is configured. Registration status is recorded as supplied, not a determination of any tax obligations.

## Planner and catalogue

Ran `stripe_implementation_planner` and accepted browser-based Stripe-hosted Checkout, matching the existing Astro static site and Cloudflare Worker. No subscriptions, marketplace, invoices or payment-link replacement are needed. Guide `iguide_61VZ9KEJF9vsrl8e941KWKnARJvwM` is an audit reference, not an ID to reuse in a new conversation.

Read all active one-time prices and expanded products in the selected sandbox. One price was returned; no further pages remained.

| Website item | Stripe product | Sandbox Price ID | Unit price |
| --- | --- | --- | --- |
| `volume-01` — Aporia Volume 01 | `prod_VQc23UtHYkD4CC` | `price_1UPkotKWKnARJvwM3UvdjihQ` | CA$17.50 |

The sandbox price/product are active. The price uses per-unit billing and `tax_behavior=inclusive`; that field does not itself collect tax. The website display price and local/preview server maps match it. Production Price mapping remains empty.

## Implemented locally

- Same-origin POST/JSON validation, streaming body-size cap, server-owned prices, unique publication IDs, and integer quantity limits of 1–20.
- Required Canadian mailing-address collection; no additional shipping charge; shipping and refund/contact wording in the shop/cart and hosted Checkout.
- Card-only payments for the chosen manual workflow. Automatic tax and Adaptive Pricing explicitly disabled for this CAD launch configuration.
- Persisted random browser checkout-attempt IDs; Stripe idempotency keys; fixed two-hour session expiry. Creation retries are allowed for the first 89 minutes, leaving Stripe's required minimum 30 minutes before expiry. A new attempt is used after expiry or a cart change. This prevents retries for the same attempt from creating duplicate sessions; separate purchases/edited carts are still separate attempts.
- `STRIPE_MODE` explicitly distinguishes test/live credentials, accepts secret or restricted server keys, and rejects wrong-mode keys. Live mode requires HTTPS. Local/preview remain test; production is set to live but **CHECKOUT_ENABLED remains false everywhere**.
- API version pinned to `2025-02-24.acacia`, matching the documented hosted Checkout parameter contract; this avoids accidental account-default version changes. Actual Stripe requests still need sandbox verification.
- `/api/checkout/status` retrieves Stripe payment state server-side and requires the original browser-held attempt token. It returns only status/test-mode information, not customer/address data. Status remains available if new purchases are disabled.
- Confirmation page distinguishes paid, unpaid, expired, and unverifiable orders. Cart clearing requires verified payment plus the unchanged purchase snapshot/revision and occurs only once. Missing browser storage or a different browser requires manual Dashboard verification.
- Production runtime origin is `https://aporialiterary.ca`; `npm run build:production` uses that same build origin, removes preview notices and enables public indexing on normal pages. Checkout return pages remain noindex. Referrer policy prevents leaking the session URL in navigation.
- `.dev.vars.example`, `docs/manual-fulfillment.md`, and `docs/launch-checklist.md` explain credential setup, order handling, testing and rollout.

## Verification completed

- 18 automated tests passed, covering server validation, retry identity after lost responses, mode separation, Canada-only/card-only parameters, policy text, status authorization, unpaid/expired sessions, privacy, cart preservation and repeated returns.
- Astro/Worker type checks: zero errors/warnings/hints.
- Production build passed; generated output checked for the confirmed domain, CA$17.50 price, shipping/refund text, and noindex confirmation page.
- `wrangler deploy --dry-run --env production` passed. It did not deploy.
- Local Wrangler HTTP smoke checks passed: shop and confirmation routes return 200; disabled checkout returns 503.
- Visual browser QA was attempted but interrupted by active user changes in Safari; it was not completed.

## Remaining external dependencies

No local `.dev.vars` files or process Stripe API credential were available. Wrangler reported **not authenticated**. MCP OAuth does not configure Worker credentials. Consequently no real sandbox purchase, live-account inspection, account activation, deployment, or DNS change was performed.

Follow `docs/launch-checklist.md`: provide a sandbox Worker credential securely, run full Stripe sandbox payment scenarios, connect/verify the intended live account/catalogue, authenticate Cloudflare, install the live credential, configure the domain, confirm inventory/review schedule, and only then enable purchases. No custom fulfillment webhook or stock reservation is implemented for the selected manual card-only workflow.

## References

- [Hosted Checkout](https://docs.stripe.com/payments/accept-a-payment?payment-ui=checkout&ui=stripe-hosted)
- [Idempotency](https://docs.stripe.com/api/idempotent_requests)
- [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe API keys](https://docs.stripe.com/keys)
- [Pinned Checkout parameter types](https://github.com/stripe/stripe-node/blob/v17.7.0/types/Checkout/SessionsResource.d.ts)

Use `ASTRO_TELEMETRY_DISABLED=1` for local checks/builds in restricted environments. `WRANGLER_LOG_PATH=/tmp/aporia-wrangler.log` avoids writing Wrangler logs outside writable directories. Browser/HTTP loopback checks may require sandbox permission.
