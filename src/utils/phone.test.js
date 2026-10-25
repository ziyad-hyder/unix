import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, toWhatsAppUrl } from './phone.js';

describe('phone.js test suite', () => {
  describe('normalizePhone', () => {
    test('10-digit starting 6-9 normalizes to +91 + digits', () => {
      assert.strictEqual(normalizePhone('9876543210'), '+919876543210');
      assert.strictEqual(normalizePhone('7012345678'), '+917012345678');
      assert.strictEqual(normalizePhone('6234567890'), '+916234567890');
      assert.strictEqual(normalizePhone('8901234567'), '+918901234567');
    });

    test('+91 with spaces, dashes, or parentheses strips and normalizes', () => {
      assert.strictEqual(normalizePhone('+91 98765 43210'), '+919876543210');
      assert.strictEqual(normalizePhone('+91-98765-43210'), '+919876543210');
      assert.strictEqual(normalizePhone('+91 (98765) 43210'), '+919876543210');
    });

    test('91-prefixed without + normalizes to +91...', () => {
      assert.strictEqual(normalizePhone('919876543210'), '+919876543210');
      assert.strictEqual(normalizePhone('91 98765 43210'), '+919876543210');
    });

    test('0-prefixed 11-digit treats leading 0 plus 10 digits as 10-digit case', () => {
      assert.strictEqual(normalizePhone('09876543210'), '+919876543210');
      assert.strictEqual(normalizePhone('0 98765 43210'), '+919876543210');
    });

    test('international number starting with + and 8-15 digits is kept', () => {
      assert.strictEqual(normalizePhone('+14155552671'), '+14155552671');
      assert.strictEqual(normalizePhone('+44 20 7946 0958'), '+442079460958');
    });

    test('too short returns null', () => {
      assert.strictEqual(normalizePhone('12345'), null);
      assert.strictEqual(normalizePhone('98765'), null);
      assert.strictEqual(normalizePhone('+91123'), null);
    });

    test('letters or special invalid characters return null', () => {
      assert.strictEqual(normalizePhone('98765abcde'), null);
      assert.strictEqual(normalizePhone('abcdefghij'), null);
      assert.strictEqual(normalizePhone('+91-98765-CALL-ME'), null);
    });

    test('null, undefined, or empty string return null', () => {
      assert.strictEqual(normalizePhone(null), null);
      assert.strictEqual(normalizePhone(undefined), null);
      assert.strictEqual(normalizePhone(''), null);
      assert.strictEqual(normalizePhone('   '), null);
    });
  });

  describe('toWhatsAppUrl', () => {
    test('converts valid 10-digit number to https://wa.me/<digits>', () => {
      assert.strictEqual(toWhatsAppUrl('9876543210'), 'https://wa.me/919876543210');
    });

    test('converts valid +91 with spaces to https://wa.me/<digits>', () => {
      assert.strictEqual(toWhatsAppUrl('+91 98765 43210'), 'https://wa.me/919876543210');
    });

    test('converts valid international number to https://wa.me/<digits>', () => {
      assert.strictEqual(toWhatsAppUrl('+14155552671'), 'https://wa.me/14155552671');
    });

    test('returns null for invalid or bad phone numbers', () => {
      assert.strictEqual(toWhatsAppUrl('invalid'), null);
      assert.strictEqual(toWhatsAppUrl('12345'), null);
      assert.strictEqual(toWhatsAppUrl(null), null);
      assert.strictEqual(toWhatsAppUrl(''), null);
    });
  });
});
