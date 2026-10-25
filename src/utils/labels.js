/**
 * Standardized Labels and Enum Display Mappings
 * Ensures consistent vocabulary across filters, cards, modals, and request views.
 */

export const CATEGORY_LABELS = {
  ALL: 'All Items',
  CALCULATOR: 'Calculators',
  DRAFTING: 'Drafting Kits',
  ELECTRONICS: 'Electronics',
  OTHER: 'Other Resources',
};

export const TYPE_LABELS = {
  ALL: 'All Types',
  SELL: 'Buy',
  RENT: 'Rent',
  SWAP: 'Swap',
};

export const RENTAL_PERIOD_LABELS = {
  DAILY: 'per day',
  WEEKLY: 'per week',
  MONTHLY: 'per month',
  SEMESTER: 'per semester',
};

/**
 * Fallback helper that formats strings into Title Case.
 * e.g. "LAB_EQUIPMENT" -> "Lab Equipment", "textbooks" -> "Textbooks"
 */
export function toTitleCase(val) {
  if (val == null || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Returns human-friendly label for a category.
 * Falls back to Title Case for unknown values.
 */
export function categoryLabel(category) {
  if (!category) return '';
  return CATEGORY_LABELS[category] || toTitleCase(category);
}

/**
 * Returns human-friendly label for a listing type (Buy, Rent, Swap).
 * Falls back to Title Case for unknown values.
 */
export function typeLabel(type) {
  if (!type) return '';
  return TYPE_LABELS[type] || toTitleCase(type);
}

/**
 * Returns action/CTA label for a listing type (e.g. "Request to Buy").
 */
export function typeActionLabel(type) {
  const label = typeLabel(type);
  if (!label) return 'Request Item';
  return `Request to ${label}`;
}

/**
 * Returns human-friendly label for a rental period ("per day", "per week", etc.).
 * Falls back to Title Case for unknown values.
 */
export function rentalPeriodLabel(period) {
  if (!period) return '';
  return RENTAL_PERIOD_LABELS[period] || toTitleCase(period);
}

/**
 * Formats a price value.
 * - If null, undefined, or empty string: returns fallback ("Price on request" or "").
 * - If real 0 (number or string '0'): returns "Free".
 * - If positive number: returns formatted currency "₹X,XXX".
 * - Never returns "₹0".
 */
export function formatPrice(price, { fallback = 'Price on request' } = {}) {
  if (price === null || price === undefined || price === '') {
    return fallback;
  }
  const num = Number(price);
  if (isNaN(num)) {
    return fallback;
  }
  if (num === 0) {
    return 'Free';
  }
  return `₹${num.toLocaleString('en-IN')}`;
}
