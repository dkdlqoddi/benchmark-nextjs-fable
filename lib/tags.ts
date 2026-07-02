/** Maximum number of tags one habit can carry. */
export const MAX_TAGS_PER_HABIT = 5;

/** Maximum length of a single normalized tag name. */
export const MAX_TAG_LENGTH = 20;

/**
 * Normalizes one tag name the way it is stored and matched: trimmed, inner
 * whitespace collapsed to single spaces, lowercased.
 */
export function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Parses the comma-separated tags input ("Health, morning") into unique
 * normalized names; empty entries are dropped. Order of first appearance is
 * preserved.
 */
export function parseTagList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map(normalizeTagName)
        .filter((name) => name.length > 0),
    ),
  );
}
