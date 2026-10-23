import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INSTALL_COPY,
  isRunningStandalone,
  isIOSSafari,
} from './pwa.js';

describe('pwa.js logic & copy suite', () => {
  describe('DEFAULT_INSTALL_COPY', () => {
    test('contains expected honest copy without false offline claims', () => {
      assert.strictEqual(DEFAULT_INSTALL_COPY.title, 'Install UniX');
      assert.ok(DEFAULT_INSTALL_COPY.description.includes('faster, app-like access'));
      assert.ok(!DEFAULT_INSTALL_COPY.description.toLowerCase().includes('works offline'));
      assert.ok(DEFAULT_INSTALL_COPY.iosDescription.includes('Share'));
      assert.ok(DEFAULT_INSTALL_COPY.iosDescription.includes('Add to Home Screen'));
      assert.strictEqual(DEFAULT_INSTALL_COPY.installText, 'Install');
    });
  });

  describe('isRunningStandalone', () => {
    test('returns true when window.matchMedia indicates standalone display-mode', () => {
      const mockWin = {
        matchMedia: (query) => ({
          matches: query === '(display-mode: standalone)',
        }),
      };
      assert.strictEqual(isRunningStandalone(mockWin, null), true);
    });

    test('returns true when navigator.standalone is true (iOS standalone)', () => {
      const mockWin = {
        matchMedia: () => ({ matches: false }),
      };
      const mockNav = { standalone: true };
      assert.strictEqual(isRunningStandalone(mockWin, mockNav), true);
    });

    test('returns false when neither matchMedia nor navigator.standalone is true', () => {
      const mockWin = {
        matchMedia: () => ({ matches: false }),
      };
      const mockNav = { standalone: false };
      assert.strictEqual(isRunningStandalone(mockWin, mockNav), false);
    });

    test('returns false when window is undefined/null', () => {
      assert.strictEqual(isRunningStandalone(null, null), false);
    });
  });

  describe('isIOSSafari', () => {
    test('returns true for iPhone user agent', () => {
      const mockNav = {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
      };
      assert.strictEqual(isIOSSafari(mockNav), true);
    });

    test('returns true for iPad user agent', () => {
      const mockNav = {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        maxTouchPoints: 5,
      };
      assert.strictEqual(isIOSSafari(mockNav), true);
    });

    test('returns true for modern iPad desktop UA with touch points', () => {
      const mockNav = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      };
      assert.strictEqual(isIOSSafari(mockNav), true);
    });

    test('returns false for Android user agent', () => {
      const mockNav = {
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      };
      assert.strictEqual(isIOSSafari(mockNav), false);
    });

    test('returns false for Windows Desktop user agent', () => {
      const mockNav = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        maxTouchPoints: 0,
      };
      assert.strictEqual(isIOSSafari(mockNav), false);
    });

    test('returns false when navigator is null/undefined', () => {
      assert.strictEqual(isIOSSafari(null), false);
    });
  });
});
