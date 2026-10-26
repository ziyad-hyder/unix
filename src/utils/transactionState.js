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

/**
 * Detects transactions whose status transitioned from a non-terminal to a terminal state.
 * Ids absent from prevStatusById (e.g. initial fetch or newly created requests) are NOT considered newly closed.
 *
 * @param {Object|Map|null} prevStatusById - Mapping of id -> status from previous fetch
 * @param {Array<Object>} nextRequests - The incoming list of transaction objects
 * @returns {Array<string|number>} Array of newly closed transaction IDs
 */
export function detectNewlyClosed(prevStatusById, nextRequests) {
  if (!prevStatusById || !Array.isArray(nextRequests)) return [];

  const isMap = prevStatusById instanceof Map;
  const newlyClosed = [];

  for (const req of nextRequests) {
    if (!req || req.id == null || !req.status) continue;
    const hasPrev = isMap
      ? prevStatusById.has(req.id)
      : Object.prototype.hasOwnProperty.call(prevStatusById, req.id);
    if (!hasPrev) continue;

    const prevStatus = isMap ? prevStatusById.get(req.id) : prevStatusById[req.id];
    if (prevStatus && !TERMINAL_STATUSES.includes(prevStatus) && TERMINAL_STATUSES.includes(req.status)) {
      newlyClosed.push(req.id);
    }
  }

  return newlyClosed;
}

/**
 * Groups requests into { needsAction, inProgress, history }.
 * If an id is in pinnedIds, it goes into inProgress even if terminal, and never counts toward needsAction.
 *
 * @param {Array<Object>} requests - List of transactions
 * @param {'owner'|'incoming'|'borrower'|'outgoing'} role - Current user's perspective
 * @param {Set|Array|Object} [pinnedIds] - Collection or object map of currently pinned IDs
 * @returns {{ needsAction: Array<Object>, inProgress: Array<Object>, history: Array<Object> }}
 */
export function groupRequests(requests, role, pinnedIds = []) {
  const result = {
    needsAction: [],
    inProgress: [],
    history: [],
  };

  if (!Array.isArray(requests)) return result;

  const isPinned = (id) => {
    if (!pinnedIds || id == null) return false;
    if (pinnedIds instanceof Set) return pinnedIds.has(id);
    if (Array.isArray(pinnedIds)) return pinnedIds.includes(id);
    if (typeof pinnedIds === 'object') return Boolean(pinnedIds[id]);
    return false;
  };

  for (const req of requests) {
    if (!req || typeof req !== 'object' || req.id == null) continue;
    if (isPinned(req.id)) {
      result.inProgress.push(req);
    } else if (needsAction(req, role)) {
      result.needsAction.push(req);
    } else if (isHistory(req)) {
      result.history.push(req);
    } else {
      result.inProgress.push(req);
    }
  }

  return result;
}

/**
 * Returns the human-readable notice text for newly closed cards moving to History.
 *
 * @param {string} status - Transaction status
 * @returns {string|null}
 */
export function getClosedNotice(status) {
  switch (status) {
    case 'COMPLETED':
      return 'Completed. Moving to History shortly.';
    case 'CANCELLED':
      return 'Cancelled. Moving to History shortly.';
    case 'REJECTED':
      return 'Declined. Moving to History shortly.';
    case 'EXPIRED':
      return 'Expired. Moving to History shortly.';
    default:
      return null;
  }
}

