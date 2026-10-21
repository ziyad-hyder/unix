/**
 * Central Error Code Mapping & Sanitizer for UniX Frontend
 * Eliminates raw machine error codes and raw Spring exceptions from user-visible UI.
 */

export const ERROR_CODE_MAP = {
  ACCOUNT_FROZEN: 'Items overdue by more than 72 hours will freeze your account, which blocks new requests until the item is returned.',
  INVALID_CODE: 'Invalid verification code. Please check the 6-digit code and try again.',
  CODE_LOCKED: 'Code verification is locked due to too many failed attempts.',
  IN_FLIGHT_TRANSACTION: 'Cannot modify or delete this item because an active transaction is currently in progress.',
  ILLEGAL_TRANSITION: 'This transaction action cannot be performed in its current status.',
  PHONE_REQUIRED: 'A phone number is required on your profile before requesting or accepting transactions.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  RESOURCE_NOT_FOUND: 'The requested item or transaction could not be found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
};

export const HTTP_STATUS_MAP = {
  400: 'Invalid request. Please check the details and try again.',
  401: 'Please log in to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource could not be found.',
  409: 'This transaction was updated by another action. Please refresh the page.',
  429: 'Too many requests. Please wait a moment before trying again.',
  500: 'A server error occurred. Please try again later.',
  502: 'The server is temporarily unavailable. Please try again shortly.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
};

/**
 * Returns a user-friendly error message for any API error.
 * In development, logs the full raw error to the console.
 * In production, guarantees that internal strings like "No static resource..." never show.
 *
 * @param {Error|Object} err - The error caught from an api call
 * @param {string} fallbackMessage - Fallback user message if error cannot be resolved
 * @returns {string} Sanitized, user-facing error message
 */
export function getFriendlyErrorMessage(err, fallbackMessage = 'An unexpected error occurred. Please try again.') {
  if (import.meta.env.DEV) {
    console.error('[API Error Detail]:', err);
  }

  if (!err) return fallbackMessage;

  const errorCode = err.errorCode || err.response?.data?.errorCode;

  // 1. Check for CODE_LOCKED to show formatted retry time
  if (errorCode === 'CODE_LOCKED') {
    const rawMsg = err.message || err.response?.data?.message || '';
    const match = rawMsg.match(/Try again after\s+([^\s.]+)/i);
    if (match && match[1]) {
      try {
        const lockTime = new Date(match[1]);
        if (!isNaN(lockTime.getTime())) {
          const timeStr = lockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `Code verification is locked due to failed attempts. Try again after ${timeStr}.`;
        }
      } catch {
        // Ignore date parse failure and use fallback code text
      }
    }
    return ERROR_CODE_MAP.CODE_LOCKED;
  }

  // 2. Check known error code map
  if (errorCode && ERROR_CODE_MAP[errorCode]) {
    return ERROR_CODE_MAP[errorCode];
  }

  // 3. Inspect raw message for internal strings that must NEVER be shown to user
  const rawMessage = err.message || err.response?.data?.message || err.response?.data?.error;
  if (rawMessage && typeof rawMessage === 'string') {
    const isInternalString =
      rawMessage.toLowerCase().includes('static resource') ||
      rawMessage.toLowerCase().includes('exception') ||
      rawMessage.toLowerCase().includes('spring') ||
      rawMessage.toLowerCase().includes('hibernate') ||
      rawMessage.toLowerCase().includes('stack trace') ||
      rawMessage.toLowerCase().includes('sql') ||
      rawMessage.includes('/');

    if (!isInternalString && rawMessage.trim().length > 0 && rawMessage.trim().length < 150) {
      return rawMessage;
    }
  }

  // 4. Fallback to HTTP status mapping
  const status = err.status || err.response?.status;
  if (status && HTTP_STATUS_MAP[status]) {
    return HTTP_STATUS_MAP[status];
  }

  return fallbackMessage;
}
