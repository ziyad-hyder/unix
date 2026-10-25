/**
 * Time and Duration Formatting Utilities for UniX
 * Standardized on DISPLAY_TZ ("Asia/Kolkata")
 */

export const DISPLAY_TZ = 'Asia/Kolkata';

/**
 * Formats an ISO timestamp or Date in DISPLAY_TZ ("Asia/Kolkata").
 * Output style: "28 Oct 2026, 5:45 pm IST"
 * Always explicit IST, never the browser's local time zone.
 *
 * @param {string|Date|number} iso - ISO date string or Date object
 * @returns {string} Formatted date string in IST
 */
export function formatDateTime(iso) {
  if (!iso) return '';
  const date = typeof iso === 'object' && iso instanceof Date ? iso : new Date(iso);
  if (isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: DISPLAY_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';

  const day = get('day');
  const month = get('month');
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');
  const ampm = (get('dayPeriod') || '').toLowerCase();

  return `${day} ${month} ${year}, ${hour}:${minute} ${ampm} IST`;
}

/**
 * Formats a duration in milliseconds into human-readable text.
 * No mental math:
 *   - 2 days 3 hours / 1 day 1 hour / 1 day (when hours = 0)
 *   - 5 hours 20 minutes / 45 minutes / "less than a minute"
 * Rules:
 *   - Singular and plural handled
 *   - Omit zero parts
 *   - Above 1 hour (>= 24h) round remaining time UP to next whole hour (e.g. 6d 23h 59m -> 7 days)
 *   - Under 1 hour show minutes, rounded up
 *   - Less than 1 minute (or 0) shows "less than a minute"
 *   - Negative duration indicates overdue: "overdue by ..."
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Human-readable duration
 */
export function formatDuration(ms) {
  if (ms == null || isNaN(ms)) return '';

  if (ms < 0) {
    return `overdue by ${formatDuration(Math.abs(ms))}`;
  }

  // Under 1 minute (0 to 59,999 ms)
  if (ms < 60000) {
    return 'less than a minute';
  }

  // Under 1 hour (1 to 59 minutes)
  if (ms < 3600000) {
    const mins = Math.ceil(ms / 60000);
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  }

  // Check if total duration is 24 hours or more
  const DAY_MS = 24 * 3600000;
  if (ms >= DAY_MS) {
    const totalHours = Math.ceil(ms / 3600000);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const dayStr = `${days} ${days === 1 ? 'day' : 'days'}`;
    if (hours === 0) {
      return dayStr;
    }
    const hourStr = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${dayStr} ${hourStr}`;
  }

  // Between 1 hour and 24 hours: show hours and minutes (rounded up)
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const hourStr = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  if (minutes === 0) {
    return hourStr;
  }
  const minStr = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  return `${hourStr} ${minStr}`;
}

/**
 * Calculates and formats the auto-complete remaining duration for RETURN_PENDING transactions.
 * Uses returnedAt timestamp + autoCompleteHours window compared to current time.
 *
 * @param {string|Date|number} returnedAt - Timestamp when return was declared
 * @param {number} [now=Date.now()] - Current epoch timestamp in ms
 * @param {number} [autoCompleteHours=48] - Auto-complete policy hours
 * @returns {string} Formatted remaining text ("auto-completes in X" or "Completing shortly")
 */
export function formatAutoCompleteRemaining(returnedAt, now = Date.now(), autoCompleteHours = 48) {
  if (!returnedAt) {
    return `auto-completes in ${autoCompleteHours}h`;
  }
  const returnedTime = new Date(returnedAt).getTime();
  if (isNaN(returnedTime)) {
    return `auto-completes in ${autoCompleteHours}h`;
  }

  const deadline = returnedTime + autoCompleteHours * 3600000;
  const diffMs = deadline - now;

  if (diffMs <= 0) {
    return 'Completing shortly';
  }

  return `auto-completes in ${formatDuration(diffMs)}`;
}
