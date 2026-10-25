import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  needsAction,
  isHistory,
  TERMINAL_STATUSES,
  OWNER_ACTION_STATUSES,
  BORROWER_ACTION_STATUSES,
} from './transactionState.js';

describe('transactionState.js test suite', () => {
  describe('needsAction', () => {
    test('returns true for owner on PENDING, ACCEPTED, RETURN_PENDING, OVERDUE', () => {
      OWNER_ACTION_STATUSES.forEach((status) => {
        assert.strictEqual(needsAction({ status }, 'owner'), true);
        assert.strictEqual(needsAction({ status }, 'incoming'), true);
      });
    });

    test('returns false for owner on ACTIVE_LEASE and terminal statuses', () => {
      ['ACTIVE_LEASE', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].forEach((status) => {
        assert.strictEqual(needsAction({ status }, 'owner'), false);
        assert.strictEqual(needsAction({ status }, 'incoming'), false);
      });
    });

    test('returns true for borrower on ACCEPTED and OVERDUE', () => {
      BORROWER_ACTION_STATUSES.forEach((status) => {
        assert.strictEqual(needsAction({ status }, 'borrower'), true);
        assert.strictEqual(needsAction({ status }, 'outgoing'), true);
      });
    });

    test('returns false for borrower on PENDING, ACTIVE_LEASE, RETURN_PENDING, and terminal statuses', () => {
      ['PENDING', 'ACTIVE_LEASE', 'RETURN_PENDING', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].forEach((status) => {
        assert.strictEqual(needsAction({ status }, 'borrower'), false);
        assert.strictEqual(needsAction({ status }, 'outgoing'), false);
      });
    });

    test('handles null, undefined, and malformed inputs safely without throwing', () => {
      assert.strictEqual(needsAction(null, 'owner'), false);
      assert.strictEqual(needsAction({}, 'owner'), false);
      assert.strictEqual(needsAction({ status: 'PENDING' }, null), false);
      assert.strictEqual(needsAction(undefined, undefined), false);
      assert.strictEqual(needsAction({ status: 'UNKNOWN' }, 'owner'), false);
    });
  });

  describe('isHistory', () => {
    test('returns true for terminal statuses (COMPLETED, CANCELLED, REJECTED, EXPIRED)', () => {
      TERMINAL_STATUSES.forEach((status) => {
        assert.strictEqual(isHistory({ status }), true);
      });
    });

    test('returns false for active or pending statuses', () => {
      ['PENDING', 'ACCEPTED', 'ACTIVE_LEASE', 'OVERDUE', 'RETURN_PENDING'].forEach((status) => {
        assert.strictEqual(isHistory({ status }), false);
      });
    });

    test('handles null, undefined, and non-object inputs gracefully', () => {
      assert.strictEqual(isHistory(null), false);
      assert.strictEqual(isHistory(undefined), false);
      assert.strictEqual(isHistory({}), false);
      assert.strictEqual(isHistory('PENDING'), false);
    });
  });
});
