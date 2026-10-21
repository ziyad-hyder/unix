import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DISPLAY_TZ, formatDateTime, formatDuration } from './time.js';

describe('time.js test suite', () => {
  describe('DISPLAY_TZ', () => {
    test('is Asia/Kolkata', () => {
      assert.strictEqual(DISPLAY_TZ, 'Asia/Kolkata');
    });
  });

  describe('formatDateTime', () => {
    test('formats timestamp in Asia/Kolkata with explicit IST: 28 Oct 2026, 5:45 pm IST', () => {
      // 12:15 UTC is 17:45 (5:45 pm) IST
      const iso = '2026-10-28T12:15:00Z';
      assert.strictEqual(formatDateTime(iso), '28 Oct 2026, 5:45 pm IST');
    });

    test('timestamp crossing midnight IST vs UTC (2026-10-21T19:00:00Z -> 22 Oct 2026, 12:30 am IST)', () => {
      // 19:00 UTC on 21 Oct is 00:30 (12:30 am) IST on 22 Oct
      const iso = '2026-10-21T19:00:00Z';
      const formatted = formatDateTime(iso);
      assert.strictEqual(formatted, '22 Oct 2026, 12:30 am IST');
      assert.ok(formatted.includes('22 Oct'));
      assert.ok(formatted.includes('12:30 am IST'));
    });

    test('handles null, undefined, and empty string gracefully', () => {
      assert.strictEqual(formatDateTime(null), '');
      assert.strictEqual(formatDateTime(undefined), '');
      assert.strictEqual(formatDateTime(''), '');
    });
  });

  describe('formatDuration', () => {
    test('exactly 7 days', () => {
      const ms = 7 * 24 * 60 * 60 * 1000;
      assert.strictEqual(formatDuration(ms), '7 days');
    });

    test('6 days 23h 59m rounds up to 7 days', () => {
      const ms = (6 * 24 + 23) * 60 * 60 * 1000 + 59 * 60 * 1000;
      assert.strictEqual(formatDuration(ms), '7 days');
    });

    test('1 day (when hours = 0)', () => {
      const ms = 24 * 60 * 60 * 1000;
      assert.strictEqual(formatDuration(ms), '1 day');
    });

    test('1 day 1 hour', () => {
      const ms = 25 * 60 * 60 * 1000;
      assert.strictEqual(formatDuration(ms), '1 day 1 hour');
    });

    test('2 days 3 hours', () => {
      const ms = (2 * 24 + 3) * 60 * 60 * 1000;
      assert.strictEqual(formatDuration(ms), '2 days 3 hours');
    });

    test('90 minutes', () => {
      const ms = 90 * 60 * 1000;
      assert.strictEqual(formatDuration(ms), '1 hour 30 minutes');
    });

    test('5 hours 20 minutes', () => {
      const ms = (5 * 60 + 20) * 60 * 1000;
      assert.strictEqual(formatDuration(ms), '5 hours 20 minutes');
    });

    test('45 minutes', () => {
      const ms = 45 * 60 * 1000;
      assert.strictEqual(formatDuration(ms), '45 minutes');
    });

    test('1 minute', () => {
      const ms = 60 * 1000;
      assert.strictEqual(formatDuration(ms), '1 minute');
    });

    test('59 seconds', () => {
      const ms = 59 * 1000;
      assert.strictEqual(formatDuration(ms), 'less than a minute');
    });

    test('0', () => {
      assert.strictEqual(formatDuration(0), 'less than a minute');
    });

    test('negative (overdue by 1 day 4 hours)', () => {
      const ms = -(28 * 60 * 60 * 1000);
      assert.strictEqual(formatDuration(ms), 'overdue by 1 day 4 hours');
    });

    test('negative (overdue by 1 day)', () => {
      const ms = -(24 * 60 * 60 * 1000);
      assert.strictEqual(formatDuration(ms), 'overdue by 1 day');
    });

    test('null and NaN return empty string', () => {
      assert.strictEqual(formatDuration(null), '');
      assert.strictEqual(formatDuration(NaN), '');
    });
  });
});
