/** Maximum accepted length of the home search query; longer input is cut off. */
export const MAX_SEARCH_LENGTH = 50;

/**
 * Normalizes the raw ?q= value: trims, collapses inner whitespace, caps the
 * length. Returns undefined when nothing searchable remains.
 */
export function normalizeSearchQuery(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const query = value.trim().replace(/\s+/g, " ").slice(0, MAX_SEARCH_LENGTH).trim();
  return query.length > 0 ? query : undefined;
}

/** Builds the home URL carrying the given tag/search filters (omits empty ones). */
export function homeHref({ tag, q }: { tag?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (tag) {
    params.set("tag", tag);
  }
  if (q) {
    params.set("q", q);
  }
  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}
