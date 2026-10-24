import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  urlBase64ToUint8Array,
  isPushSupported,
  getPushSupportDetails,
} from './push.js';

describe('push.js web push utility suite', () => {
  describe('urlBase64ToUint8Array', () => {
    test('converts standard base64url string to Uint8Array', () => {
      // Base64url representation of [1, 2, 3, 4]
      // [1, 2, 3, 4] in base64 is "AQIDBA==" -> base64url "AQIDBA"
      const uint8 = urlBase64ToUint8Array('AQIDBA');
      assert.ok(uint8 instanceof Uint8Array);
      assert.strictEqual(uint8.length, 4);
      assert.strictEqual(uint8[0], 1);
      assert.strictEqual(uint8[1], 2);
      assert.strictEqual(uint8[2], 3);
      assert.strictEqual(uint8[3], 4);
    });

    test('handles base64url characters (- and _) correctly', () => {
      // 254 (0xFE) and 255 (0xFF) -> in base64 "/v8=" -> in base64url "_v8"
      const uint8 = urlBase64ToUint8Array('_v8');
      assert.ok(uint8 instanceof Uint8Array);
      assert.strictEqual(uint8.length, 2);
      assert.strictEqual(uint8[0], 254);
      assert.strictEqual(uint8[1], 255);
    });

    test('converts sample VAPID public key without throwing', () => {
      const vapidKey = 'BPwHUVZucXamsmhRcHBnwfIdF75JFGeU1iyYUzqMcNjESzrA5mHr34fpP8XLEWZuHNtz9N6kwH5trSr4aVBs1So';
      const uint8 = urlBase64ToUint8Array(vapidKey);
      assert.ok(uint8 instanceof Uint8Array);
      assert.strictEqual(uint8.length, 65); // uncompressed P-256 public key is 65 bytes
      assert.strictEqual(uint8[0], 0x04); // uncompressed point prefix 0x04
    });

    test('throws error when input string is empty or null', () => {
      assert.throws(() => urlBase64ToUint8Array(''), /empty/);
      assert.throws(() => urlBase64ToUint8Array(null), /empty/);
    });
  });

  describe('isPushSupported', () => {
    test('returns true when serviceWorker, PushManager, and Notification are present', () => {
      const mockNav = { serviceWorker: {} };
      const mockWin = {
        PushManager: function () {},
        Notification: function () {},
      };
      assert.strictEqual(isPushSupported(mockNav, mockWin), true);
    });

    test('returns false when PushManager is missing (e.g. regular Safari on iOS)', () => {
      const mockNav = { serviceWorker: {} };
      const mockWin = {
        Notification: function () {},
        // PushManager is undefined
      };
      assert.strictEqual(isPushSupported(mockNav, mockWin), false);
    });

    test('returns false when serviceWorker is missing', () => {
      const mockNav = {};
      const mockWin = {
        PushManager: function () {},
        Notification: function () {},
      };
      assert.strictEqual(isPushSupported(mockNav, mockWin), false);
    });

    test('returns false when window or navigator is null', () => {
      assert.strictEqual(isPushSupported(null, null), false);
      assert.strictEqual(isPushSupported({}, null), false);
      assert.strictEqual(isPushSupported(null, {}), false);
    });
  });

  describe('getPushSupportDetails', () => {
    test('identifies iOS browser requiring Home Screen install', () => {
      const mockNav = {
        serviceWorker: {},
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
        standalone: false,
      };
      const mockWin = {
        // PushManager is not in window on regular iOS Safari
        Notification: function () {},
        matchMedia: () => ({ matches: false }),
      };

      const details = getPushSupportDetails(mockNav, mockWin);
      assert.strictEqual(details.supported, false);
      assert.strictEqual(details.isIOS, true);
      assert.strictEqual(details.isStandalone, false);
      assert.strictEqual(details.needsIOSInstall, true);
    });

    test('identifies iOS installed standalone with push support', () => {
      const mockNav = {
        serviceWorker: {},
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
        standalone: true,
      };
      const mockWin = {
        PushManager: function () {},
        Notification: function () {},
        matchMedia: () => ({ matches: true }),
      };

      const details = getPushSupportDetails(mockNav, mockWin);
      assert.strictEqual(details.supported, true);
      assert.strictEqual(details.isIOS, true);
      assert.strictEqual(details.isStandalone, true);
      assert.strictEqual(details.needsIOSInstall, false);
    });
  });
});
