/**
 * Pagination helper utilities for UniX.
 */

/**
 * Merges a newly fetched page of items into an existing list of items.
 * Deduplicates by item.id, preserving the order of existing items
 * and appending new incoming items in the order they were received.
 *
 * @template T
 * @param {Array<T>} [existing=[]] - Current items in state
 * @param {Array<T>} [incoming=[]] - New items from the API page
 * @returns {Array<T>} Combined, deduplicated items
 */
export function mergePage(existing = [], incoming = []) {
  if (!Array.isArray(existing)) existing = [];
  if (!Array.isArray(incoming)) incoming = [];

  const seenIds = new Set(existing.map((item) => item?.id).filter(Boolean));
  const merged = [...existing];

  for (const item of incoming) {
    if (item && item.id != null) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        merged.push(item);
      }
    } else if (item) {
      merged.push(item);
    }
  }

  return merged;
}
