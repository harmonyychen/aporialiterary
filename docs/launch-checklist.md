# Launch checklist

## Prepared locally

- Hosted Checkout with server-owned prices and Canadian shipping-address collection.
- Shipping included; no extra shipping amount. Refund/contact policy shown before payment and on Stripe Checkout.
- Cards only for manual fulfillment. No delayed bank-payment methods, added tax, or currency conversion configured.
- Persistent checkout-attempt IDs and Stripe idempotency keys. Sessions expire two hours after the attempt begins; opening/retrying the creation request is allowed during the first 89 minutes. This leaves Stripe's required minimum 30 minutes before expiry. After that, a buyer can use an existing Stripe tab or wait until the two-hour window ends before starting another attempt. Different edited carts are separate attempts.
- Server payment verification, browser-held attempt proof, minimal status response, and conservative cart clearing. A changed cart is retained; reloading a confirmation does not clear a new cart.
- Explicit `STRIPE_MODE=test|live` and matching server credential required; live origin must use HTTPS. Default mode is test. Secret and restricted credentials are accepted; use least-privilege permissions for Checkout Session creation/retrieval and the catalogue as required.
- Production runtime origin is `https://aporialiterary.ca`. `npm run build:production` uses that same origin for canonical URLs and sitemap and removes preview notices.
- Manual fulfillment process: `docs/manual-fulfillment.md`.

## Still required before enabling purchases

1. **Provide the sandbox Worker credential.** Copy `.dev.vars.example` to ignored `.dev.vars`, enter the matching sandbox credential there, and set its `CHECKOUT_ENABLED=true`. Never paste it into chat. MCP OAuth access does not supply the Worker credential. `npm run build` then `npm run preview` runs the full local Worker at `http://localhost:4321`; `npm run dev` alone does not serve the API.
2. **Run actual sandbox Checkout tests.** Complete a successful payment, a decline, and authentication-required payment; test cancel/return, quantity 2, Canada-only address collection, policies, and retry after a connection loss. Check the success page and the sandbox Dashboard's paid status, line items, total and mailing address. Reload success after adding a new cart item and verify it remains. Never mail sandbox orders. Test card scenarios: https://docs.stripe.com/testing .
3. **Connect the live Stripe account.** Complete any Stripe business/account activation requirements. Connect the intended live account to MCP if account inspection/configuration is wanted. Only the sandbox is currently connected. Verify live product and CA$17.50 CAD one-time Price ID separately; sandbox IDs cannot be used with live credentials.
4. **Sign into Cloudflare.** Run `npx wrangler login` in this project and choose the intended account. Confirm which Cloudflare account owns the site's zone/Worker before deployment. No CLI authentication was available during implementation.
5. **Install the live Worker credential securely.** Run `npx wrangler secret put STRIPE_SECRET_KEY --env production` and enter the live credential at the prompt. Do not pass it in command arguments or commit it. Put the verified live Price ID in production `STRIPE_PRICE_MAP`; it is currently empty. Keep `CHECKOUT_ENABLED=false` until testing and deployment preparation pass.
6. **Connect the domain.** Inspect/export current DNS, preserve email and unrelated records, and attach `aporialiterary.ca` to the intended Worker. Verify HTTPS and decide whether `www.aporialiterary.ca` redirects to the apex. No DNS or nameserver changes have been made.
7. **Complete operational readiness.** Confirm stock count, staff review schedule, mailing turnaround, payment receipt settings and any remaining tax obligations. Follow the manual fulfillment runbook. Review the rest of the website for launch: PDF/archive availability and submission-form status are separate from checkout.
8. **Enable and deploy.** After the above passes, set production `CHECKOUT_ENABLED=true`, run `npm run deploy:production`, and verify the deployed shop, policies and checkout. The deploy script checks/types/tests and uses the production build settings. This is a real-payments switch; leave local/preview mode as test. A deployment dry run does not prove account, domain, credential, or real-payment readiness.

## Failure handling

If payment cannot be verified, retain the cart and check Dashboard before asking the buyer to pay again. If the buyer lost browser storage or switches devices, the confirmation page cannot use the original attempt proof; staff can verify the order in Dashboard. The browser success page is customer feedback, not the manual fulfillment source of truth.

No webhook is configured for this manual, card-only launch. Adding delayed payment methods or automatic order/shipping processing requires a verified webhook flow and durable deduplication.
