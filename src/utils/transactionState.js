/**
 * Pure helpers for Transaction State classification, badge counters, and grouping.
 */

export const TERMINAL_STATUSES = Object.freeze([
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
]);

export const OWNER_ACTION_STATUSES = Object.freeze([
  'PENDING',
  'ACCEPTED',
  'RETURN_PENDING',
  'OVERDUE',
]);

export const BORROWER_ACTION_STATUSES = Object.freeze([
  'ACCEPTED',
  'OVERDUE',
]);

/**
 * Determines whether a transaction requires immediate user action based on their role.
 *
 * @param {Object} req - The transaction object
 * @param {'owner'|'incoming'|'borrower'|'outgoing'} role - The user's role in this transaction
 * @returns {boolean}
 */
export function needsAction(req, role) {
  if (!req || typeof req !== 'object' || !req.status) return false;

  const normalizedRole = (role || '').toLowerCase();
  if (normalizedRole === 'owner' || normalizedRole === 'incoming') {
    return OWNER_ACTION_STATUSES.includes(req.status);
  }
  if (normalizedRole === 'borrower' || normalizedRole === 'outgoing') {
    return BORROWER_ACTION_STATUSES.includes(req.status);
  }
  return false;
}

/**
 * Determines whether a transaction is closed / terminal and belongs in the History disclosure.
 *
 * Terminal statuses:
 * - COMPLETED: Item returned/exchanged successfully.
 * - CANCELLED: Request cancelled before completion.
 * - REJECTED: Request declined by item owner.
 * - EXPIRED: Request expired before acceptance or completion.
 *
 * @param {Object} req - The transaction object
 * @returns {boolean}
 */
export function isHistory(req) {
  if (!req || typeof req !== 'object' || !req.status) return false;
  return TERMINAL_STATUSES.includes(req.status);
}
