import type { RGBColor } from '../color.js';

/** Domain model persisted by the profile Repository. */
export interface StoredProfile {
  name: string;
  colors: Record<string, RGBColor>;
  effect?: string;
  brightness?: number;
  speed?: number;
  builtin?: boolean;
}

/**
 * Port — profile persistence (Repository pattern).
 *
 * Infrastructure adapters (e.g. FileProfileRepository) implement this
 * interface so the server/commands stay storage-agnostic.
 */
export interface IProfileRepository {
  list(): string[];
  save(profile: StoredProfile): { saved: boolean; name: string };
  load(name: string): StoredProfile | undefined;
  delete(name: string): boolean;
  isBuiltin(name: string): boolean;
}
