/**
 * Pure helpers for Transaction State classification, badge counters, and grouping.
 */

// Terminal statuses that belong strictly under History disclosure.
// Note: Unknown or active statuses must NEVER be hidden under History.
export const TERMINAL_STATUSES = Object.freeze([
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
]);

// Action statuses requiring owner intervention
// (RETURN_PENDING remains an action for owner even when disputed, because Confirm Return is still available)
export const OWNER_ACTION_STATUSES = Object.freeze([
  'PENDING',
  'ACCEPTED',
  'RETURN_PENDING',
  'OVERDUE',
]);

// Action statuses requiring borrower intervention
// (RETURN_PENDING does not count toward needs-action badge for the borrower, disputed or not)
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
 * IMPORTANT: Unknown or active statuses must never be hidden under History.
 *
 * @param {Object} req - The transaction object
 * @returns {boolean}
 */
export function isHistory(req) {
  if (!req || typeof req !== 'object' || !req.status) return false;
  return TERMINAL_STATUSES.includes(req.status);
}
