interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  CHECKOUT_ENABLED?: string;
  STRIPE_MODE?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_MAP?: string;
  SITE_URL?: string;
}
interface LineItem { id: string; quantity: number }
const STRIPE_VERSION = '2025-02-24.acacia';
const APP = 'aporia-web-v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'
} });
class RequestError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
function configuration(request: Request, env: Env) {
  let site: URL;
  try { site = new URL(env.SITE_URL || ''); } catch { throw new RequestError('Checkout origin is not configured.', 503); }
  const mode = env.STRIPE_MODE || 'test';
  if (!['test', 'live'].includes(mode) || site.origin !== new URL(request.url).origin ||
      site.username || site.password || site.pathname !== '/' || site.search || site.hash ||
      (site.protocol !== 'https:' && !(mode === 'test' && site.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(site.hostname)))) {
    throw new RequestError('Checkout origin or payment mode is not configured.', 503);
  }
  if (!new RegExp(`^(sk|rk)_${mode}_[A-Za-z0-9]+$`).test(env.STRIPE_SECRET_KEY || '')) {
    throw new RequestError('Payment credentials do not match the configured mode.', 503);
  }
  return { site, live: mode === 'live' };
}
async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.method !== 'POST') throw new RequestError('Use POST.', 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) throw new RequestError('This request must come from this website.', 403);
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new RequestError('Expected JSON.', 415);
  if (Number(request.headers.get('Content-Length')) > 8192) throw new RequestError('Request too large.', 413);
  // Bound streamed bodies too, without buffering an arbitrarily large request.
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError('Invalid JSON request.');
  const decoder = new TextDecoder(); let raw = ''; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new RequestError('Request too large.', 413); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError('Invalid JSON request.');
  } finally { reader.releaseLock(); }
}
export function validateItems(body: unknown, prices: Record<string, string>): LineItem[] {
  if (!body || typeof body !== 'object' || !('items' in body) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) throw new RequestError('Choose at least one valid publication.');
  const seen = new Set<string>();
  return body.items.map((item: unknown) => {
    if (!item || typeof item !== 'object' || !('id' in item) || !('quantity' in item) || typeof item.id !== 'string' || !Object.hasOwn(prices, item.id) || typeof prices[item.id] !== 'string' || !/^price_[A-Za-z0-9]+$/.test(prices[item.id]) || seen.has(item.id) || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 20) throw new RequestError('Invalid publication or quantity. Quantities must be between 1 and 20.');
    seen.add(item.id); return { id: item.id, quantity: Number(item.quantity) };
  }).sort((a, b) => a.id.localeCompare(b.id));
}
function stripeHeaders(env: Env): Record<string, string> {
  return { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Stripe-Version': STRIPE_VERSION };
}
function failure(error: unknown): Response {
  return error instanceof RequestError ? json({ error: error.message }, error.status) : json({ error: 'Stripe is temporarily unavailable. Your cart has been kept. Please try again.' }, 502);
}
export async function checkout(request: Request, env: Env, fetcher: typeof fetch = fetch): Promise<Response> {
  try {
    const body = await readBody(request);
    if (env.CHECKOUT_ENABLED !== 'true') throw new RequestError('Checkout is not available yet. No payment has been taken.', 503);
    const { site, live } = configuration(request, env);
    let prices: Record<string, string>;
    try { prices = JSON.parse(env.STRIPE_PRICE_MAP || '{}'); if (!prices || Array.isArray(prices) || typeof prices !== 'object') throw new Error(); }
    catch { throw new RequestError('Product configuration is unavailable.', 503); }
    const items = validateItems(body, prices);
    if (typeof body.attemptId !== 'string' || !uuid.test(body.attemptId) || !Number.isInteger(body.startedAt)) throw new RequestError('Invalid checkout attempt. Please reload the shop.');
    const now = Math.floor(Date.now() / 1000);
    const startedAt = Number(body.startedAt);
    // Fixed expiry makes retry parameters identical. Refuse a stale key before
    // Stripe's 24-hour idempotency retention can elapse.
    if (startedAt > now + 60 || now - startedAt > 89 * 60) throw new RequestError('This checkout attempt is too old to reopen. Check any previous payment, then return after the two-hour checkout window ends.', 409);
    const params = new URLSearchParams({
      mode: 'payment', ui_mode: 'hosted', currency: 'cad',
      success_url: `${site.origin}/checkout-success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site.origin}/checkout-cancel/`,
      expires_at: String(startedAt + 2 * 60 * 60),
      'payment_method_types[0]': 'card',
      'shipping_address_collection[allowed_countries][0]': 'CA',
      'automatic_tax[enabled]': 'false', 'adaptive_pricing[enabled]': 'false',
      'custom_text[shipping_address][message]': 'Shipping included. Books are mailed within Canada only.',
      'custom_text[submit][message]': 'All sales are final. For complaints or order issues, contact aporialiterary@gmail.com.',
      'metadata[app]': APP, 'metadata[attempt_id]': body.attemptId,
      'metadata[origin]': site.origin,
      'payment_intent_data[metadata][app]': APP,
      'payment_intent_data[description]': 'Aporia print journals — Canada mailing included; manual fulfillment'
    });
    items.forEach((item, n) => {
      params.set(`line_items[${n}][price]`, prices[item.id]);
      params.set(`line_items[${n}][quantity]`, String(item.quantity));
    });
    const res = await fetcher('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: { ...stripeHeaders(env), 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `${APP}:${body.attemptId}` },
      body: params, signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error();
    const session = await res.json() as { id?: string; url?: string; livemode?: boolean };
    if (session.livemode !== live || !session.id?.startsWith(live ? 'cs_live_' : 'cs_test_')) throw new Error();
    const redirect = new URL(session.url || '');
    if (redirect.protocol !== 'https:' || redirect.hostname !== 'checkout.stripe.com' || redirect.username || redirect.password) throw new Error();
    return json({ url: redirect.href, sessionId: session.id });
  } catch (error) { return failure(error); }
}
export async function checkoutStatus(request: Request, env: Env, fetcher: typeof fetch = fetch): Promise<Response> {
  try {
    const body = await readBody(request);
    const { site, live } = configuration(request, env);
    if (typeof body.sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(body.sessionId) ||
        !body.sessionId.startsWith(live ? 'cs_live_' : 'cs_test_') || typeof body.attemptId !== 'string' || !uuid.test(body.attemptId)) throw new RequestError('Unable to verify this checkout.', 400);
    const res = await fetcher(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(body.sessionId)}`, {
      headers: stripeHeaders(env), signal: AbortSignal.timeout(15000)
    });
    if (res.status === 404) throw new RequestError('Checkout not found.', 404);
    if (!res.ok) throw new Error();
    const session = await res.json() as { id?: string; mode?: string; status?: string; payment_status?: string; currency?: string; livemode?: boolean; metadata?: Record<string, string> };
    // The browser-held random attempt token binds this lookup to its purchase.
    // Return no names, emails, addresses, receipt URLs, or full Stripe object.
    if (session.id !== body.sessionId || session.mode !== 'payment' || session.livemode !== live || session.currency !== 'cad' || session.metadata?.app !== APP || session.metadata?.origin !== site.origin || session.metadata?.attempt_id !== body.attemptId) throw new RequestError('Unable to verify this checkout.', 404);
    const status = session.status === 'complete' && session.payment_status === 'paid' ? 'paid' : session.status === 'expired' ? 'expired' : 'unpaid';
    return json({ status, testMode: !live });
  } catch (error) { return failure(error); }
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/api/checkout') return checkout(request, env);
    if (path === '/api/checkout/status') return checkoutStatus(request, env);
    if (path.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  }
};
