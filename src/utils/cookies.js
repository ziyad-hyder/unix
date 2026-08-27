/**
 * Retrieves a cookie value by name from document.cookie
 * @param {string} name
 * @returns {string|null}
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}
