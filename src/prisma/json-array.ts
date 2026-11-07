/**
 * MySQL has no native array columns, so list fields such as `images` and
 * `productIds` are stored as JSON arrays. This turns a stored JSON value back
 * into a clean `string[]` (anything that is not an array becomes `[]`).
 */
export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}
