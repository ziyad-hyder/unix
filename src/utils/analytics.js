/**
 * Hardcoded allowlist schema for GA4 custom events.
 * Only keys explicitly defined here will be forwarded to GA4.
 * Any unlisted parameter is silently dropped to prevent accidental PII leakage.
 */
export const EVENT_SCHEMAS = {
  login: ['method'],
  sign_up: ['method'],
  error_shown: ['error_code'],
};

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
