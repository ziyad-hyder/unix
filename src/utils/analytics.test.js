import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { trackEvent, EVENT_SCHEMAS, sanitizeSearchTerm } from './analytics.js';

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

  test('EVENT_SCHEMAS defines allowlists for Sprint 1 & Sprint 2 events', () => {
    assert.deepStrictEqual(EVENT_SCHEMAS.login, ['method']);
    assert.deepStrictEqual(EVENT_SCHEMAS.sign_up, ['method']);
    assert.deepStrictEqual(EVENT_SCHEMAS.error_shown, ['error_code']);
    assert.deepStrictEqual(EVENT_SCHEMAS.search, ['search_term']);
    assert.deepStrictEqual(EVENT_SCHEMAS.select_content, ['content_type', 'item_id']);
    assert.deepStrictEqual(EVENT_SCHEMAS.listing_load_more, ['page_number', 'category', 'type']);
    assert.deepStrictEqual(EVENT_SCHEMAS.tab_view, ['tab_name']);
    assert.deepStrictEqual(EVENT_SCHEMAS.history_expanded, ['section']);
    assert.deepStrictEqual(EVENT_SCHEMAS.listing_create, ['listing_id', 'category', 'type', 'price', 'has_image']);
    assert.deepStrictEqual(EVENT_SCHEMAS.listing_image_upload, ['listing_id', 'file_size_bytes']);
    assert.deepStrictEqual(EVENT_SCHEMAS.transaction_request, ['listing_id', 'listing_type', 'category']);
    assert.deepStrictEqual(EVENT_SCHEMAS.transaction_accept, ['transaction_id']);
    assert.deepStrictEqual(EVENT_SCHEMAS.transaction_reject, ['transaction_id', 'listing_id']);
    assert.deepStrictEqual(EVENT_SCHEMAS.transaction_cancel, ['transaction_id', 'listing_id', 'previous_status']);
    assert.deepStrictEqual(EVENT_SCHEMAS.transaction_verify_handoff, ['transaction_id', 'verification_method']);
    assert.deepStrictEqual(EVENT_SCHEMAS.transaction_handoff_fallback, ['transaction_id', 'fallback_step']);
    assert.deepStrictEqual(EVENT_SCHEMAS.transaction_verify_return, ['transaction_id', 'verification_method']);
    assert.deepStrictEqual(EVENT_SCHEMAS.transaction_return_fallback, ['transaction_id', 'fallback_step']);
    assert.deepStrictEqual(EVENT_SCHEMAS.transaction_dispute, ['transaction_id', 'listing_id']);
    assert.deepStrictEqual(EVENT_SCHEMAS.transaction_complete, ['transaction_id', 'completion_type']);
    assert.deepStrictEqual(EVENT_SCHEMAS.contact_reveal_click, ['transaction_id', 'role', 'listing_id', 'listing_type']);
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

  test('contact_reveal_click strictly drops phone number or waUrl if passed', () => {
    trackEvent('contact_reveal_click', {
      transaction_id: 42,
      role: 'owner',
      listing_id: 101,
      listing_type: 'RENT',
      phone: '+919876543210',
      waUrl: 'https://wa.me/919876543210',
    });

    assert.strictEqual(capturedEvents.length, 1);
    assert.deepStrictEqual(capturedEvents[0].params, {
      transaction_id: 42,
      role: 'owner',
      listing_id: 101,
      listing_type: 'RENT',
    });
    assert.strictEqual(capturedEvents[0].params.phone, undefined);
    assert.strictEqual(capturedEvents[0].params.waUrl, undefined);
  });

  test('transaction_verify_handoff strictly drops the 6-digit code', () => {
    trackEvent('transaction_verify_handoff', {
      transaction_id: 99,
      verification_method: 'code',
      code: '123456',
    });

    assert.strictEqual(capturedEvents.length, 1);
    assert.deepStrictEqual(capturedEvents[0].params, {
      transaction_id: 99,
      verification_method: 'code',
    });
    assert.strictEqual(capturedEvents[0].params.code, undefined);
  });

  test('listing_create drops owner object and credentials', () => {
    trackEvent('listing_create', {
      listing_id: 55,
      category: 'CALCULATOR',
      type: 'RENT',
      price: 150,
      has_image: true,
      owner: { fullName: 'Secret Student', email: 'secret@kitsw.ac.in' },
    });

    assert.strictEqual(capturedEvents.length, 1);
    assert.deepStrictEqual(capturedEvents[0].params, {
      listing_id: 55,
      category: 'CALCULATOR',
      type: 'RENT',
      price: 150,
      has_image: true,
    });
    assert.strictEqual(capturedEvents[0].params.owner, undefined);
  });

  test('trackEvent silently drops all params for unlisted event names', () => {
    trackEvent('unknown_event', {
      some_key: 'value',
      sensitive_data: '12345',
    });

    assert.strictEqual(capturedEvents.length, 1);
    assert.deepStrictEqual(capturedEvents[0].params, {});
  });

  test('history_expanded tracks section and drops extra params', () => {
    trackEvent('history_expanded', {
      section: 'incoming',
      unlisted_key: 'sensitive',
    });

    assert.strictEqual(capturedEvents.length, 1);
    assert.deepStrictEqual(capturedEvents[0].params, { section: 'incoming' });
    assert.strictEqual(capturedEvents[0].params.unlisted_key, undefined);
  });

  test('sanitizeSearchTerm redacts phone and email while preserving calculator models', () => {
    assert.strictEqual(
      sanitizeSearchTerm('selling ti30x and fx-991ex call 9876543210'),
      'selling ti30x and fx-991ex call [phone]'
    );
    assert.strictEqual(
      sanitizeSearchTerm('whatsapp +91 9876543210 or email student@campus.edu'),
      'whatsapp [phone] or email [email]'
    );
    assert.strictEqual(sanitizeSearchTerm('casio fx-82ms'), 'casio fx-82ms');
    assert.strictEqual(sanitizeSearchTerm(''), '');
    assert.strictEqual(sanitizeSearchTerm(null), '');
    assert.strictEqual(sanitizeSearchTerm(undefined), '');
  });

  test('trackEvent search automatically sanitizes phone and email in search_term', () => {
    trackEvent('search', {
      search_term: 'need drafter contact 9876543210 at me@campus.edu',
    });

    assert.strictEqual(capturedEvents.length, 1);
    assert.deepStrictEqual(capturedEvents[0].params, {
      search_term: 'need drafter contact [phone] at [email]',
    });
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
