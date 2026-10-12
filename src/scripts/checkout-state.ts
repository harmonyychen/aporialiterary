export type CartItem = { id: string; quantity: number };
export type CheckoutAttempt = {
  id: string;
  startedAt: number;
  fingerprint: string;
  revision: string;
  sessionId?: string;
  completed?: boolean;
};
export const ATTEMPTS_KEY = 'aporia-checkout-attempts-v1';
export const REVISION_KEY = 'aporia-cart-revision-v1';
export function fingerprint(items: CartItem[]): string {
  return JSON.stringify(items.map(({ id, quantity }) => ({ id, quantity })).sort((a, b) => a.id.localeCompare(b.id)));
}
export function readAttempts(raw: string | null): CheckoutAttempt[] {
  try {
    const value: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((a): a is CheckoutAttempt => a && typeof a.id === 'string' && /^[0-9a-f-]{36}$/i.test(a.id) && Number.isInteger(a.startedAt) && typeof a.fingerprint === 'string' && typeof a.revision === 'string' && (a.sessionId === undefined || typeof a.sessionId === 'string') && (a.completed === undefined || typeof a.completed === 'boolean')).slice(-20);
  } catch { return []; }
}
export function reusableAttempt(attempts: CheckoutAttempt[], items: CartItem[], revision: string, now: number): CheckoutAttempt | undefined {
  return attempts.findLast(a => !a.completed && a.fingerprint === fingerprint(items) && a.revision === revision && now >= a.startedAt && now - a.startedAt < 2 * 60 * 60);
}
export function canClearPurchasedCart(attempt: CheckoutAttempt, items: CartItem[], revision: string): boolean {
  return !attempt.completed && attempt.revision === revision && attempt.fingerprint === fingerprint(items);
}
