/**
 * Built-in profile names for the redragon-k629 controller.
 *
 * These profiles are immutable — they cannot be deleted, and saving
 * with the same name auto-creates a copy (copy-on-write).
 */

export const BUILTIN_PROFILE_NAMES: ReadonlySet<string> = new Set([
  'gamming',
  'programmer',
  'synthwave',
  'matrix',
  'nord',
  'gruvbox',
  'ocean',
  'cyberpunk',
]);

export function isBuiltin(name: string): boolean {
  return BUILTIN_PROFILE_NAMES.has(name);
}
