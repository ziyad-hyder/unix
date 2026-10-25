import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  AUTO_START_HOURS,
  AUTO_COMPLETE_HOURS,
  FREEZE_AFTER_OVERDUE_HOURS,
  CODE_LOCK_MINUTES,
  CODE_MAX_ATTEMPTS,
} from './policy.js';

describe('policy.js test suite', () => {
  test('policy numbers match backend configuration', () => {
    assert.strictEqual(AUTO_START_HOURS, 12);
    assert.strictEqual(AUTO_COMPLETE_HOURS, 48);
    assert.strictEqual(FREEZE_AFTER_OVERDUE_HOURS, 72);
    assert.strictEqual(CODE_LOCK_MINUTES, 10);
    assert.strictEqual(CODE_MAX_ATTEMPTS, 5);
  });
});
