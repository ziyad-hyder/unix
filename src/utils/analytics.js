/**
 * Hardcoded allowlist schema for GA4 custom events.
 * Only keys explicitly defined here will be forwarded to GA4.
 * Any unlisted parameter is silently dropped to prevent accidental PII leakage.
 */
export const EVENT_SCHEMAS = {
  // Sprint 1: Auth & Errors
  login: ['method'],
  sign_up: ['method'],
  error_shown: ['error_code'],

  // Sprint 2: Marketplace Discovery & Navigation
  search: ['search_term'],
  select_content: ['content_type', 'item_id'],
  listing_load_more: ['page_number', 'category', 'type'],
  tab_view: ['tab_name'],
  history_expanded: ['section'],

  // Sprint 2: Listing Management
  listing_create: ['listing_id', 'category', 'type', 'price', 'has_image'],
  listing_image_upload: ['listing_id', 'file_size_bytes'],

  // Sprint 2: Transaction Lifecycle
  transaction_request: ['listing_id', 'listing_type', 'category'],
  transaction_accept: ['transaction_id'],
  transaction_reject: ['transaction_id', 'listing_id'],
  transaction_cancel: ['transaction_id', 'listing_id', 'previous_status'],
  transaction_verify_handoff: ['transaction_id', 'verification_method'],
  transaction_handoff_fallback: ['transaction_id', 'fallback_step'],
  transaction_verify_return: ['transaction_id', 'verification_method'],
  transaction_return_fallback: ['transaction_id', 'fallback_step'],
  transaction_dispute: ['transaction_id', 'listing_id'],
  transaction_complete: ['transaction_id', 'completion_type'],

  // Sprint 2: Safe WhatsApp Click
  contact_reveal_click: ['transaction_id', 'role', 'listing_id', 'listing_type'],

  // Sprint 3: PWA Lifecycle
  install_banner_shown: ['platform'],
  install_banner_dismissed: ['platform'],
  pwa_install: ['platform', 'outcome'],

  // Sprint 3: Web Push Lifecycle
  push_subscribe: [],
  push_unsubscribe: [],
  push_test_sent: [],
};

/**
 * Sanitizes search terms by redacting phone numbers and email addresses.
 * Avoids aggressive alphanumeric regexes to prevent false positives on item/model names (e.g. ti30x, fx-991ex).
 *
 * @param {string} term
 * @returns {string}
 */
export function sanitizeSearchTerm(term) {
  if (typeof term !== 'string') return '';
  return term
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
    .replace(/(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, '[phone]')
    .slice(0, 100);
}

/**
 * Tracks a GA4 custom event using an allowlist-based parameter filter.
 *
 * @param {string} eventName - Name of the event to track
 * @param {Object} [params={}] - Parameters to filter against EVENT_SCHEMAS
 */
export function trackEvent(eventName, params = {}) {
  try {
    const allowedKeys = EVENT_SCHEMAS[eventName] || [];
    const sanitizedParams = {};

    if (params && typeof params === 'object') {
      for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(params, key) && params[key] !== undefined) {
          sanitizedParams[key] = params[key];
        }
      }
    }

    if (eventName === 'search' && typeof sanitizedParams.search_term === 'string') {
      sanitizedParams.search_term = sanitizeSearchTerm(sanitizedParams.search_term);
    }

    const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

    if (isDev) {
      console.log(`[GA4 Event (DEV)]: ${eventName}`, sanitizedParams);
      return;
    }

    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, sanitizedParams);
    }
  } catch {
    // Fail silently — analytics must never disrupt app execution or throw
  }
}
