import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { trackEvent, EVENT_SCHEMAS } from './analytics.js';

describe('analytics.js test suite', () => {
  let originalGtag;
  let originalConsoleLog;
  let capturedEvents;
  let capturedLogs;

  beforeEach(() => {
    capturedEvents = [];
    capturedLogs = [];
    originalGtag = globalThis.window?.gtag;
    originalConsoleLog = console.log;

    if (!globalThis.window) {
      globalThis.window = {};
    }
    globalThis.window.gtag = (type, name, params) => {
      capturedEvents.push({ type, name, params });
    };
    console.log = (...args) => {
      capturedLogs.push(args);
    };
  });

  afterEach(() => {
    if (originalGtag) {
      globalThis.window.gtag = originalGtag;
    } else if (globalThis.window) {
      delete globalThis.window.gtag;
    }
    console.log = originalConsoleLog;
  });

  test('EVENT_SCHEMAS defines allowlists for login, sign_up, and error_shown', () => {
    assert.deepStrictEqual(EVENT_SCHEMAS.login, ['method']);
    assert.deepStrictEqual(EVENT_SCHEMAS.sign_up, ['method']);
    assert.deepStrictEqual(EVENT_SCHEMAS.error_shown, ['error_code']);
  });

  test('trackEvent forwards only allowlisted keys and drops unlisted/PII parameters', () => {
    trackEvent('login', {
      method: 'password',
      email: 'student@kitsw.ac.in',
      phone: '9876543210',
      token: 'jwt.secret.token',
    });

    assert.strictEqual(capturedEvents.length, 1);
    assert.strictEqual(capturedEvents[0].name, 'login');
    assert.deepStrictEqual(capturedEvents[0].params, { method: 'password' });
    assert.strictEqual(capturedEvents[0].params.email, undefined);
    assert.strictEqual(capturedEvents[0].params.phone, undefined);
    assert.strictEqual(capturedEvents[0].params.token, undefined);
  });

  test('trackEvent filters sign_up params to method only', () => {
    trackEvent('sign_up', {
      method: 'email_otp',
      rollNumber: 'b24cs052',
      fullName: 'John Doe',
    });

    assert.strictEqual(capturedEvents.length, 1);
    assert.deepStrictEqual(capturedEvents[0].params, { method: 'email_otp' });
  });

  test('trackEvent filters error_shown params to error_code only', () => {
    trackEvent('error_shown', {
      error_code: 'ACCOUNT_FROZEN',
      message: 'Sensitive backend details',
      status: 403,
    });

    assert.strictEqual(capturedEvents.length, 1);
    assert.deepStrictEqual(capturedEvents[0].params, { error_code: 'ACCOUNT_FROZEN' });
  });

  test('trackEvent silently drops all params for unlisted event names', () => {
    trackEvent('unknown_event', {
      some_key: 'value',
      sensitive_data: '12345',
    });

    assert.strictEqual(capturedEvents.length, 1);
    assert.deepStrictEqual(capturedEvents[0].params, {});
  });

  test('trackEvent fails silently when window.gtag is undefined or throws', () => {
    delete globalThis.window.gtag;
    assert.doesNotThrow(() => {
      trackEvent('login', { method: 'password' });
    });

    globalThis.window.gtag = () => {
      throw new Error('gtag network error');
    };
    assert.doesNotThrow(() => {
      trackEvent('login', { method: 'password' });
    });
  });
});
