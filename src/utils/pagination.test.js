import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mergePage } from './pagination.js';

describe('pagination.js test suite', () => {
  describe('mergePage', () => {
    test('merges two disjoint arrays preserving ordering', () => {
      const existing = [{ id: 1, title: 'Item 1' }, { id: 2, title: 'Item 2' }];
      const incoming = [{ id: 3, title: 'Item 3' }, { id: 4, title: 'Item 4' }];

      const result = mergePage(existing, incoming);
      assert.deepStrictEqual(result, [
        { id: 1, title: 'Item 1' },
        { id: 2, title: 'Item 2' },
        { id: 3, title: 'Item 3' },
        { id: 4, title: 'Item 4' },
      ]);
    });

    test('deduplicates items by id when incoming contains already-existing items', () => {
      const existing = [
        { id: 'a', title: 'Alpha' },
        { id: 'b', title: 'Beta' },
      ];
      const incoming = [
        { id: 'b', title: 'Beta Duplicate' },
        { id: 'c', title: 'Gamma' },
      ];

      const result = mergePage(existing, incoming);
      assert.strictEqual(result.length, 3);
      assert.deepStrictEqual(result, [
        { id: 'a', title: 'Alpha' },
        { id: 'b', title: 'Beta' },
        { id: 'c', title: 'Gamma' },
      ]);
    });

    test('handles empty existing or empty incoming lists', () => {
      const items = [{ id: 10, title: 'Ten' }];
      assert.deepStrictEqual(mergePage([], items), items);
      assert.deepStrictEqual(mergePage(items, []), items);
      assert.deepStrictEqual(mergePage([], []), []);
    });

    test('handles null or non-array parameters safely without throwing', () => {
      const items = [{ id: 1 }];
      assert.deepStrictEqual(mergePage(null, items), items);
      assert.deepStrictEqual(mergePage(items, null), items);
      assert.deepStrictEqual(mergePage(undefined, undefined), []);
    });

    test('preserves ordering when incoming has multiple unique items', () => {
      const existing = [{ id: 5 }, { id: 3 }];
      const incoming = [{ id: 9 }, { id: 1 }, { id: 5 }];

      const result = mergePage(existing, incoming);
      assert.deepStrictEqual(result, [
        { id: 5 },
        { id: 3 },
        { id: 9 },
        { id: 1 },
      ]);
    });
  });
});
