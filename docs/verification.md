# Verification and remaining launch blockers

## Verified

- Astro static build: nine HTML pages plus sitemap and robots generated successfully.
- Astro/TypeScript: zero errors, warnings, or hints; Worker TypeScript check passes.
- Seven functional checkout tests pass, covering approved products, tampered totals, invalid/duplicate quantities, unknown products, cross-origin rejection, disabled checkout, rejection of live keys, fixed return URLs, and upstream/redirect errors.
- Cloudflare Wrangler dry-run bundle succeeds; no deployment performed.
- Local Cloudflare runtime serves Home with HTTP 200 and disabled checkout with a clear HTTP 503 response.
- Chrome screenshots inspected for the home hero and left cart drawer against Figma; responsive home checked at 390px and 768px, with readable wrapping and no visible horizontal overflow in the inspected sections.
- Generated local links and asset references resolve; source assets are non-empty.
- Browser navigation to Shop, adding to cart, changing quantity to 3, refresh persistence, removing items, empty state, Escape dismissal and focus restoration, and Shift+Tab wrapping within the modal.
- Original downloaded imagery/icons have non-empty local files. Font assets are local and licensed through Fontsource.

## Not verified with real services

Stripe test payment/receipt, Tally upload/submission, actual publication PDFs/downloads, GitHub CI execution, hosted Cloudflare deployment, DNS and HTTPS. These require the missing configuration. No claim of successful payment or submission is made.

## Launch blockers

1. Final public PDF(s); verify reader, open/download fallback and mobile PDF behavior after adding.
2. Approved product prices/currency and business rules for format, shipping, taxes, stock, and fulfillment. Configure Stripe test mode and complete end-to-end testing before a separate live-mode change.
3. Tally form, approved guidelines/terms/eligibility and submission status. No deadlines or rights terms have been invented.
4. Staff biographies; confirm final editorial copy, figures, and the footer email retained from Figma (its component documentation still mentions verification).
5. GitHub destination, Cloudflare account, actual domain/origins, and final publication approval. Preserve existing email DNS records.
6. Final real-device mobile and cross-browser review after integrations and final content are supplied.

The placeholder state is intentional and authorized. Cart demonstration works, but prices, sales, PDF content and submissions are not fabricated.
