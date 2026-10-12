# Manual order review and mailing

## Launch policy

- Aporia Volume 01: CA$17.50 per copy. Shipping included; Canadian mailing addresses only.
- All sales are final. For complaints or order issues, contact aporialiterary@gmail.com.
- Staff manually review and mail orders. No carrier integration, automatic shipment, or stock reservation is implemented.
- Aporia reports that it is not registered for GST/HST. Checkout does not add tax. This is configuration, not a determination of tax obligations.

## Review each paid order

1. Open the intended **live** Stripe account. Sandbox orders must never be mailed.
2. Review new successful payments in Stripe Dashboard at an agreed daily interval. Enable payment notifications if useful; reconcile against Dashboard so a missed email does not lose an order.
3. Verify that payment succeeded, the Checkout Session belongs to Aporia, and the products, quantities, total and Canadian mailing address are correct. For one copy the configured total is CA$17.50; for two, CA$35.00. Never mail based only on the buyer's return page, an email screenshot, an unpaid/processing payment, or an authorization awaiting capture.
4. Use the Checkout Session or payment ID as the unique order reference. Check the private fulfillment log before packing to prevent mailing the same purchase twice. Record actual duplicate *payments* separately and resolve them before fulfillment.
5. Verify stock, pack the exact quantity, and mail to the address collected by Stripe. Record the mailed date and tracking reference if the service provides one. Never promise a tracking number if none exists.
6. Review complaints using the payment reference. Ask only for the information needed to locate the order; never request a full card number.

## Private fulfillment log

Keep real customer records in an access-controlled business workspace, not this source repository or a public website. Suggested columns:

| Order reference | Paid date | Issue / quantity | Review status | Mailed date | Tracking (if any) | Issue notes |
| --- | --- | --- | --- | --- | --- | --- |

Use statuses such as pending review, ready to mail, mailed, and needs attention. Retrieve names and addresses from Stripe as needed rather than copying them into multiple places. Restrict access to staff who fulfill orders.

## Inventory and stopping sales

Confirm the available copy count before launch. The cart's maximum of 20 copies is an input limit, not stock tracking. Reconcile quantities against available stock; if stock is low or unavailable, set production `CHECKOUT_ENABLED=false` and redeploy. Already-created Checkout Sessions can remain payable until they expire (up to two hours); review/expire those in Stripe if immediate suspension is needed. Status verification stays available while new checkouts are disabled.
