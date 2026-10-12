import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { checkout, checkoutStatus, validateItems } from '../worker/index.ts';
const prices = { 'volume-01': 'price_test123' };
const env = { ASSETS: { fetch: async () => new Response('asset') }, CHECKOUT_ENABLED: 'true', STRIPE_MODE: 'test', STRIPE_SECRET_KEY: 'sk_test_fixture', SITE_URL: 'http://localhost:4321', STRIPE_PRICE_MAP: JSON.stringify(prices) };
const attemptId = 'd25f3230-6b90-4ee6-a64e-15ed12340205';
const items = [{ id: 'volume-01', quantity: 2 }];
const payload = () => ({ items, attemptId, startedAt: Math.floor(Date.now() / 1000) });
const request = (body: unknown, origin = env.SITE_URL, path = '/api/checkout') => new Request(`${env.SITE_URL}${path}`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const sessionId = 'cs_test_fixture';
const session = { id: sessionId, livemode: false, url: 'https://checkout.stripe.com/c/pay/cs_test_fixture' };
const paidSession = { id: sessionId, livemode: false, mode: 'payment', currency: 'cad', status: 'complete', payment_status: 'paid', metadata: { app: 'aporia-web-v1', attempt_id: attemptId, origin: env.SITE_URL } };
const statusRequest = (body = { sessionId, attemptId }) => request(body, env.SITE_URL, '/api/checkout/status');

test('accepts approved identifiers and bounded integer quantities', () => assert.deepEqual(validateItems({ items: [{ id: 'volume-01', quantity: 2, price: 1 }] }, prices), items));
test('rejects malformed, unknown, duplicate and excessive items', () => {
  for (const items of [[], [{ id: 'other', quantity: 1 }], [{ id: '__proto__', quantity: 1 }], [{ id: 'volume-01', quantity: 0 }], [{ id: 'volume-01', quantity: -1 }], [{ id: 'volume-01', quantity: 21 }], [{ id: 'volume-01', quantity: 1.5 }], [{ id: 'volume-01', quantity: '2' }], [{ id: 'volume-01', quantity: 1 }, { id: 'volume-01', quantity: 1 }]]) assert.throws(() => validateItems({ items }, prices));
});
test('disabled checkout cannot call Stripe', async () => {
  let called = false;
  const r = await checkout(request(payload()), { ...env, CHECKOUT_ENABLED: 'false' }, async () => { called = true; return new Response(); });
  assert.equal(r.status, 503); assert.equal(called, false);
});
test('rejects wrong key mode, cross-origin, bad origin config and insecure live mode', async () => {
  assert.equal((await checkout(request(payload()), { ...env, STRIPE_SECRET_KEY: 'sk_live_fixture' })).status, 503);
  assert.equal((await checkout(request(payload(), 'https://untrusted.example'), env)).status, 403);
  for (const SITE_URL of ['', 'https://other.example', 'http://localhost:4321/path']) assert.equal((await checkout(request(payload()), { ...env, SITE_URL })).status, 503);
  assert.equal((await checkout(request(payload()), { ...env, STRIPE_MODE: 'live', STRIPE_SECRET_KEY: 'sk_live_fixture' })).status, 503);
});
test('uses server prices, Canada shipping, card payments, fixed return URL and no added tax or shipping', async () => {
  let sent: URLSearchParams | undefined;
  const r = await checkout(request({ ...payload(), items: [{ ...items[0], price: 1 }], success_url: 'https://untrusted.example', shipping_country: 'US' }), env, async (_url, init) => {
    sent = new URLSearchParams(String(init?.body));
    assert.equal(new Headers(init?.headers).get('Stripe-Version'), '2025-02-24.acacia');
    return Response.json(session);
  });
  assert.equal(r.status, 200);
  assert.equal(sent!.get('line_items[0][price]'), 'price_test123');
  assert.equal(sent!.get('line_items[0][quantity]'), '2');
  assert.equal(sent!.get('success_url'), 'http://localhost:4321/checkout-success/?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(sent!.get('shipping_address_collection[allowed_countries][0]'), 'CA');
  assert.equal(sent!.get('payment_method_types[0]'), 'card');
  assert.equal(sent!.get('automatic_tax[enabled]'), 'false');
  assert.equal(sent!.get('adaptive_pricing[enabled]'), 'false');
  assert.equal([...sent!.keys()].some(k => k.startsWith('shipping_options') || k.includes('tax_rates')), false);
  assert.match(sent!.get('custom_text[submit][message]')!, /All sales are final/);
});
test('retry after a lost response uses identical Stripe parameters and idempotency key', async () => {
  const body = payload(); const calls: { key: string | null; body: string }[] = [];
  const fetcher: typeof fetch = async (_url, init) => {
    calls.push({ key: new Headers(init?.headers).get('Idempotency-Key'), body: String(init?.body) });
    if (calls.length === 1) throw new Error('lost response');
    return Response.json(session);
  };
  assert.equal((await checkout(request(body), env, fetcher)).status, 502);
  assert.equal((await checkout(request(body), env, fetcher)).status, 200);
  assert.deepEqual(calls[0], calls[1]); assert.match(calls[0].key!, new RegExp(attemptId));
});
test('invalid and old attempt IDs never reach Stripe', async () => {
  let called = false;
  for (const body of [{ items }, { ...payload(), attemptId: 'bad' }, { ...payload(), startedAt: 0 }, { ...payload(), startedAt: Math.floor(Date.now() / 1000) + 3600 }]) {
    assert.ok((await checkout(request(body), env, async () => { called = true; return Response.json(session); })).status >= 400);
  }
  assert.equal(called, false);
});
test('live mode requires explicit configuration and matching Stripe response', async () => {
  const origin = 'https://aporialiterary.ca';
  const liveEnv = { ...env, STRIPE_MODE: 'live', STRIPE_SECRET_KEY: 'rk_live_fixture', SITE_URL: origin };
  const req = () => new Request(`${origin}/api/checkout`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
  assert.equal((await checkout(req(), liveEnv, async () => Response.json({ ...session, id: 'cs_live_fixture', livemode: true }))).status, 200);
  assert.equal((await checkout(req(), liveEnv, async () => Response.json(session))).status, 502);
});
test('handles Stripe errors without exposing secrets', async () => {
  const r = await checkout(request(payload()), env, async () => new Response('private upstream error', { status: 400 }));
  assert.equal(r.status, 502); assert.doesNotMatch(await r.text(), /private|sk_test/);
});
test('rejects unsafe redirects and invalid bodies', async () => {
  for (const url of ['https://untrusted.example', 'https://user@checkout.stripe.com/', 'http://checkout.stripe.com/']) {
    assert.equal((await checkout(request(payload()), env, async () => Response.json({ ...session, url }))).status, 502);
  }
  assert.equal((await checkout(request({ items: [{ id: 'other', quantity: 1 }] }), env)).status, 400);
  assert.equal((await checkout(request(null), env)).status, 400);
});
test('bounds actual body bytes and enforces HTTP method and content type', async () => {
  assert.equal((await checkout(request({ x: 'é'.repeat(5000) }), env)).status, 413);
  assert.equal((await checkout(new Request(`${env.SITE_URL}/api/checkout`), env)).status, 405);
  assert.equal((await checkout(new Request(`${env.SITE_URL}/api/checkout`, { method: 'POST', headers: { Origin: env.SITE_URL, 'Content-Type': 'text/plain' }, body: '{}' }), env)).status, 415);
});
test('status requires browser attempt proof and returns no personal data', async () => {
  const r = await checkoutStatus(statusRequest(), env, async () => Response.json({ ...paidSession, customer_details: { email: 'private@example.com' }, shipping_details: { name: 'Private Buyer' } }));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { status: 'paid', testMode: true });
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  for (const changed of [{ metadata: { ...paidSession.metadata, attempt_id: crypto.randomUUID() } }, { metadata: { ...paidSession.metadata, origin: 'https://other.example' } }, { livemode: true }, { mode: 'subscription' }, { currency: 'usd' }]) {
    assert.equal((await checkoutStatus(statusRequest(), env, async () => Response.json({ ...paidSession, ...changed }))).status, 404);
  }
});
test('incomplete, unpaid and expired sessions never confirm payment', async () => {
  for (const [status, payment_status, expected] of [['open', 'paid', 'unpaid'], ['complete', 'unpaid', 'unpaid'], ['complete', 'no_payment_required', 'unpaid'], ['expired', 'unpaid', 'expired']]) {
    const r = await checkoutStatus(statusRequest(), env, async () => Response.json({ ...paidSession, status, payment_status }));
    assert.equal((await r.json() as { status: string }).status, expected);
  }
});
test('status remains available when new purchases are disabled and rejects foreign mode IDs', async () => {
  assert.equal((await checkoutStatus(statusRequest(), { ...env, CHECKOUT_ENABLED: 'false' }, async () => Response.json(paidSession))).status, 200);
  let called = false;
  const r = await checkoutStatus(statusRequest({ sessionId: 'cs_live_fixture', attemptId }), env, async () => { called = true; return Response.json(paidSession); });
  assert.equal(r.status, 400); assert.equal(called, false);
});
test('routes status through Worker and preserves static assets', async () => {
  assert.equal((await worker.fetch(new Request(`${env.SITE_URL}/api/checkout/status`), env)).status, 405);
  assert.equal((await worker.fetch(new Request(`${env.SITE_URL}/api/unknown`), env)).status, 404);
  assert.equal(await (await worker.fetch(new Request(`${env.SITE_URL}/shop/`), env)).text(), 'asset');
});
