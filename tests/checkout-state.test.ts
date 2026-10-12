import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAttempts, reusableAttempt, fingerprint, canClearPurchasedCart } from '../src/scripts/checkout-state.ts';
const cart = [{ id: 'volume-01', quantity: 2 }];
const attempt = { id: 'd25f3230-6b90-4ee6-a64e-15ed12340205', startedAt: 10000, fingerprint: fingerprint(cart), revision: 'revision-1' };
test('reuses persisted attempts across retries but not changed, completed or expired purchases', () => {
  const saved = readAttempts(JSON.stringify([attempt]));
  assert.equal(reusableAttempt(saved, cart, 'revision-1', 10001)?.id, attempt.id);
  assert.equal(reusableAttempt(saved, [{ id: 'volume-01', quantity: 1 }], 'revision-1', 10001), undefined);
  assert.equal(reusableAttempt(saved, cart, 'revision-2', 10001), undefined);
  assert.equal(reusableAttempt(saved, cart, 'revision-1', 17200), undefined);
  assert.equal(reusableAttempt([{ ...attempt, completed: true }], cart, 'revision-1', 10001), undefined);
});
test('only clears the unchanged purchased cart once', () => {
  assert.equal(canClearPurchasedCart(attempt, cart, 'revision-1'), true);
  assert.equal(canClearPurchasedCart(attempt, [{ id: 'volume-01', quantity: 3 }], 'revision-1'), false);
  assert.equal(canClearPurchasedCart(attempt, cart, 'revision-2'), false);
  assert.equal(canClearPurchasedCart({ ...attempt, completed: true }, cart, 'revision-1'), false);
});
test('ignores malformed local state', () => {
  for (const raw of ['bad', '{}', '[null,{},1]']) assert.deepEqual(readAttempts(raw), []);
});
