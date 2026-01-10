'use client';

/**
 * Normalizes a string to be used as a key for searching or indexing.
 * It trims, converts to lower-case, and collapses multiple spaces into one.
 * Supports Thai characters.
 *
 * @param s The input string.
 * @returns The normalized string key.
 */
export function normalizeKey(s: string | null | undefined): string {
  if (!s) {
    return '';
  }
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // Collapse multiple spaces into a single space
}
