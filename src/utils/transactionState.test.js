import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  needsAction,
  isHistory,
  detectNewlyClosed,
  groupRequests,
  getClosedNotice,
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

    test('returns true for owner on RETURN_PENDING even when disputed (Confirm Return button still available)', () => {
      assert.strictEqual(needsAction({ status: 'RETURN_PENDING', disputed: true }, 'owner'), true);
      assert.strictEqual(needsAction({ status: 'RETURN_PENDING', disputed: true }, 'incoming'), true);
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

    test('returns false for borrower on RETURN_PENDING even when disputed (no action buttons offered)', () => {
      assert.strictEqual(needsAction({ status: 'RETURN_PENDING', disputed: true }, 'borrower'), false);
      assert.strictEqual(needsAction({ status: 'RETURN_PENDING', disputed: true }, 'outgoing'), false);
      assert.strictEqual(needsAction({ status: 'RETURN_PENDING', disputed: false }, 'borrower'), false);
      assert.strictEqual(needsAction({ status: 'RETURN_PENDING', disputed: false }, 'outgoing'), false);
    });

    test('returns false for borrower on PENDING, ACTIVE_LEASE, and terminal statuses', () => {
      ['PENDING', 'ACTIVE_LEASE', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].forEach((status) => {
        assert.strictEqual(needsAction({ status }, 'borrower'), false);
        assert.strictEqual(needsAction({ status }, 'outgoing'), false);
      });
    });

    test('handles null, undefined, dead status strings, and malformed inputs safely without throwing', () => {
      assert.strictEqual(needsAction(null, 'owner'), false);
      assert.strictEqual(needsAction({}, 'owner'), false);
      assert.strictEqual(needsAction({ status: 'PENDING' }, null), false);
      assert.strictEqual(needsAction(undefined, undefined), false);
      assert.strictEqual(needsAction({ status: 'UNKNOWN' }, 'owner'), false);
      assert.strictEqual(needsAction({ status: 'DISPUTED' }, 'owner'), false);
      assert.strictEqual(needsAction({ status: 'DISPUTED' }, 'borrower'), false);
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

    test('unknown statuses must NEVER be hidden under History', () => {
      ['UNKNOWN', 'UNKNOWN_STATUS', 'CUSTOM_STATE', 'UNDER_REVIEW', 'ARBITRATION', 'DISPUTED'].forEach((status) => {
        assert.strictEqual(isHistory({ status }), false, `Unknown status '${status}' must not be hidden in History`);
      });
    });

    test('handles null, undefined, and non-object inputs gracefully', () => {
      assert.strictEqual(isHistory(null), false);
      assert.strictEqual(isHistory(undefined), false);
      assert.strictEqual(isHistory({}), false);
      assert.strictEqual(isHistory('PENDING'), false);
    });
  });

  describe('detectNewlyClosed', () => {
    test('returns empty array when prevStatusById is empty or null (initial load / no previous record)', () => {
      const nextRequests = [
        { id: 1, status: 'COMPLETED' },
        { id: 2, status: 'CANCELLED' },
      ];
      assert.deepStrictEqual(detectNewlyClosed({}, nextRequests), []);
      assert.deepStrictEqual(detectNewlyClosed(null, nextRequests), []);
      assert.deepStrictEqual(detectNewlyClosed(undefined, nextRequests), []);
      assert.deepStrictEqual(detectNewlyClosed(new Map(), nextRequests), []);
    });

    test('returns newly closed ids when previous status was non-terminal and next is terminal', () => {
      const prevMap = {
        1: 'ACTIVE_LEASE',
        2: 'RETURN_PENDING',
        3: 'PENDING',
        4: 'ACCEPTED',
      };
      const nextRequests = [
        { id: 1, status: 'COMPLETED' },
        { id: 2, status: 'COMPLETED' },
        { id: 3, status: 'REJECTED' },
        { id: 4, status: 'CANCELLED' },
      ];
      const newlyClosed = detectNewlyClosed(prevMap, nextRequests);
      assert.deepStrictEqual(newlyClosed, [1, 2, 3, 4]);
    });

    test('does NOT return ids that were already terminal in prevStatusById', () => {
      const prevMap = {
        1: 'COMPLETED',
        2: 'CANCELLED',
        3: 'REJECTED',
        4: 'EXPIRED',
      };
      const nextRequests = [
        { id: 1, status: 'COMPLETED' },
        { id: 2, status: 'CANCELLED' },
        { id: 3, status: 'REJECTED' },
        { id: 4, status: 'EXPIRED' },
      ];
      assert.deepStrictEqual(detectNewlyClosed(prevMap, nextRequests), []);
    });

    test('does NOT return ids that were absent from prevStatusById (newly seen requests)', () => {
      const prevMap = { 1: 'ACTIVE_LEASE' };
      const nextRequests = [
        { id: 1, status: 'ACTIVE_LEASE' },
        { id: 2, status: 'COMPLETED' }, // new id not in prevMap
      ];
      assert.deepStrictEqual(detectNewlyClosed(prevMap, nextRequests), []);
    });

    test('does NOT return ids when transitioning between non-terminal statuses', () => {
      const prevMap = {
        1: 'PENDING',
        2: 'ACCEPTED',
      };
      const nextRequests = [
        { id: 1, status: 'ACCEPTED' },
        { id: 2, status: 'ACTIVE_LEASE' },
      ];
      assert.deepStrictEqual(detectNewlyClosed(prevMap, nextRequests), []);
    });

    test('works with Map instance as prevStatusById', () => {
      const prevMap = new Map([
        [10, 'RETURN_PENDING'],
        [20, 'COMPLETED'],
      ]);
      const nextRequests = [
        { id: 10, status: 'COMPLETED' },
        { id: 20, status: 'COMPLETED' },
      ];
      assert.deepStrictEqual(detectNewlyClosed(prevMap, nextRequests), [10]);
    });

    test('handles null, undefined, or empty nextRequests safely', () => {
      assert.deepStrictEqual(detectNewlyClosed({ 1: 'ACTIVE_LEASE' }, null), []);
      assert.deepStrictEqual(detectNewlyClosed({ 1: 'ACTIVE_LEASE' }, undefined), []);
      assert.deepStrictEqual(detectNewlyClosed({ 1: 'ACTIVE_LEASE' }, []), []);
      assert.deepStrictEqual(detectNewlyClosed({ 1: 'ACTIVE_LEASE' }, [null, {}]), []);
    });
  });

  describe('groupRequests', () => {
    const r1 = { id: 1, status: 'PENDING' };
    const r2 = { id: 2, status: 'ACCEPTED' };
    const r3 = { id: 3, status: 'ACTIVE_LEASE' };
    const r4 = { id: 4, status: 'COMPLETED' };
    const r5 = { id: 5, status: 'CANCELLED' };

    test('correctly groups non-pinned requests for owner role', () => {
      const requests = [r1, r2, r3, r4, r5];
      const { needsAction, inProgress, history } = groupRequests(requests, 'owner');

      assert.deepStrictEqual(needsAction, [r1, r2]);
      assert.deepStrictEqual(inProgress, [r3]);
      assert.deepStrictEqual(history, [r4, r5]);
    });

    test('correctly groups non-pinned requests for borrower role', () => {
      const requests = [r1, r2, r3, r4, r5];
      const { needsAction, inProgress, history } = groupRequests(requests, 'borrower');

      assert.deepStrictEqual(needsAction, [r2]);
      assert.deepStrictEqual(inProgress, [r1, r3]);
      assert.deepStrictEqual(history, [r4, r5]);
    });

    test('places pinned terminal requests into inProgress instead of history', () => {
      const requests = [r1, r2, r3, r4, r5];
      // Pin r4 (COMPLETED)
      const { needsAction, inProgress, history } = groupRequests(requests, 'owner', [4]);

      assert.deepStrictEqual(needsAction, [r1, r2]);
      assert.deepStrictEqual(inProgress, [r3, r4]);
      assert.deepStrictEqual(history, [r5]);
    });

    test('pinned requests never count towards needsAction even if role would normally require it', () => {
      const requests = [r1, r2];
      // Pin r1 (PENDING)
      const { needsAction, inProgress } = groupRequests(requests, 'owner', [1]);

      assert.deepStrictEqual(needsAction, [r2]);
      assert.deepStrictEqual(inProgress, [r1]);
    });

    test('supports pinnedIds as Set, Array, or Object map', () => {
      const requests = [r4]; // COMPLETED
      // Set
      assert.strictEqual(groupRequests(requests, 'owner', new Set([4])).inProgress.length, 1);
      assert.strictEqual(groupRequests(requests, 'owner', new Set([4])).history.length, 0);

      // Array
      assert.strictEqual(groupRequests(requests, 'owner', [4]).inProgress.length, 1);
      assert.strictEqual(groupRequests(requests, 'owner', [4]).history.length, 0);

      // Object map {[id]: { status, until }}
      const pinnedMap = { 4: { status: 'COMPLETED', until: Date.now() + 6000 } };
      assert.strictEqual(groupRequests(requests, 'owner', pinnedMap).inProgress.length, 1);
      assert.strictEqual(groupRequests(requests, 'owner', pinnedMap).history.length, 0);
    });

    test('handles null, undefined, and non-array requests safely', () => {
      const empty = { needsAction: [], inProgress: [], history: [] };
      assert.deepStrictEqual(groupRequests(null, 'owner'), empty);
      assert.deepStrictEqual(groupRequests(undefined, 'borrower'), empty);
      assert.deepStrictEqual(groupRequests('not an array', 'owner'), empty);
      assert.deepStrictEqual(groupRequests([null, undefined, {}], 'owner'), empty);
    });
  });

  describe('getClosedNotice', () => {
    test('returns correct calm/neutral notice for terminal statuses', () => {
      assert.strictEqual(getClosedNotice('COMPLETED'), 'Completed. Moving to History shortly.');
      assert.strictEqual(getClosedNotice('CANCELLED'), 'Cancelled. Moving to History shortly.');
      assert.strictEqual(getClosedNotice('REJECTED'), 'Declined. Moving to History shortly.');
      assert.strictEqual(getClosedNotice('EXPIRED'), 'Expired. Moving to History shortly.');
    });

    test('returns null for non-terminal or unknown statuses', () => {
      assert.strictEqual(getClosedNotice('PENDING'), null);
      assert.strictEqual(getClosedNotice('ACCEPTED'), null);
      assert.strictEqual(getClosedNotice('ACTIVE_LEASE'), null);
      assert.strictEqual(getClosedNotice('RETURN_PENDING'), null);
      assert.strictEqual(getClosedNotice('UNKNOWN'), null);
      assert.strictEqual(getClosedNotice(null), null);
      assert.strictEqual(getClosedNotice(undefined), null);
    });
  });
});
