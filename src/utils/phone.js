/**
 * Phone normalization and WhatsApp URL utilities for UniX.
 */

/**
 * Normalizes phone numbers according to UniX rules:
 * - Strips spaces, dashes, and parentheses
 * - Treats leading 0 + 10 digits as the 10-digit case
 * - If 10 digits starting 6-9 -> +91 + digits
 * - If 91 + 10 digits (with or without +) -> +91...
 * - If it already starts with + and has 8-15 digits -> keep
 * - Otherwise returns null (invalid)
 *
 * @param {string|number} input - Raw phone input
 * @returns {string|null} E.164 formatted phone or null if invalid
 */
export function normalizePhone(input) {
  if (input == null) return null;
  const str = String(input).trim();
  if (!str) return null;

  // Strip spaces, dashes, and parentheses
  const cleaned = str.replace(/[\s\-()]/g, '');

  // Must only contain digits and an optional leading '+'
  if (!/^\+?\d+$/.test(cleaned)) {
    return null;
  }

  // Treat a leading 0 plus 10 digits as the 10-digit case
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }

  // 10 digits starting with 6-9 -> +91 + digits
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // 91 + 10 digits (with or without +) -> +91...
  if (/^\+?91\d{10}$/.test(cleaned)) {
    const tenDigits = cleaned.startsWith('+91') ? cleaned.slice(3) : cleaned.slice(2);
    return `+91${tenDigits}`;
  }

  // If it already starts with '+' and has 8-15 digits -> keep
  if (/^\+\d{8,15}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Converts a phone number to a WhatsApp click-to-chat URL.
 * Normalizes, drops the '+', and returns https://wa.me/<digits>.
 * Returns null if the phone is invalid.
 *
 * @param {string|number} phone
 * @returns {string|null} WhatsApp link or null
 */
export function toWhatsAppUrl(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const digits = normalized.replace(/^\+/, '');
  return `https://wa.me/${digits}`;
}
