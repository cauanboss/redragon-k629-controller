import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';
import type { IProfileRepository, StoredProfile } from '../ports/iprofile-repository.js';
import { BUILTIN_PROFILE_NAMES } from './builtin-profiles.js';
import { BUILTIN_COLORS } from './builtin-profiles-data.js';

export type { StoredProfile } from '../ports/iprofile-repository.js';

const DEFAULT_STORE_DIR = resolve(homedir(), '.config', 'redragon-k629');
const DEFAULT_STORE_PATH = resolve(DEFAULT_STORE_DIR, 'profiles.json');

/**
 * Repository — file-system persistence for keyboard profiles.
 *
 * Stores JSON at `~/.config/redragon-k629/profiles.json`.
 * Supports built-in (immutable) profiles with copy-on-write semantics.
 */
export class FileProfileRepository implements IProfileRepository {
  constructor(
    private readonly storeDir = DEFAULT_STORE_DIR,
    private readonly storePath = DEFAULT_STORE_PATH,
    private readonly builtinNames: ReadonlySet<string> = new Set(),
  ) {}

  list(): string[] {
    const user = this.readAll().map(p => p.name);
    const all = new Set([...this.builtinNames, ...user]);
    return Array.from(all);
  }

  save(profile: StoredProfile): { saved: boolean; name: string } {
    let actualName = profile.name;

    // Copy-on-write: if saving with a built-in name and no user override
    // exists yet, auto-rename to avoid overwriting the built-in.
    if (this.builtinNames.has(profile.name)) {
      const all = this.readAll();
      const userEntry = all.find(p => p.name === profile.name);
      if (!userEntry) {
        actualName = `${profile.name} (custom)`;
      }
    }

    const all = this.readAll();
    const index = all.findIndex(entry => entry.name === actualName);

    const stored: StoredProfile = { ...profile, name: actualName, builtin: this.builtinNames.has(actualName) };

    if (index >= 0) {
      all[index] = stored;
    } else {
      all.push(stored);
    }

    this.writeAll(all);
    return { saved: true, name: actualName };
  }

  load(name: string): StoredProfile | undefined {
    // User-stored profiles take precedence (they may override builtins)
    const userProfile = this.readAll().find(p => p.name === name);
    if (userProfile) return userProfile;

    // Fallback to built-in color data
    if (this.builtinNames.has(name)) {
      const colors = BUILTIN_COLORS[name];
      if (colors) {
        return { name, colors, builtin: true };
      }
    }

    return undefined;
  }

  delete(name: string): boolean {
    if (this.builtinNames.has(name)) {
      return false; // built-in profiles cannot be deleted
    }

    const all = this.readAll();
    const filtered = all.filter((profile) => profile.name !== name);

    if (filtered.length === all.length) {
      return false;
    }

    this.writeAll(filtered);
    return true;
  }

  isBuiltin(name: string): boolean {
    return this.builtinNames.has(name);
  }

  private ensureDir(): void {
    if (!existsSync(this.storeDir)) {
      mkdirSync(this.storeDir, { recursive: true });
    }
  }

  private readAll(): StoredProfile[] {
    try {
      this.ensureDir();
      const raw = readFileSync(this.storePath, 'utf-8');
      return JSON.parse(raw) as StoredProfile[];
    } catch {
      return [];
    }
  }

  private writeAll(profiles: StoredProfile[]): void {
    this.ensureDir();
    writeFileSync(this.storePath, JSON.stringify(profiles, null, 2), 'utf-8');
  }
}

/** Default singleton used by the application (includes built-in profiles). */
export const defaultProfileRepository = new FileProfileRepository(
  DEFAULT_STORE_DIR, DEFAULT_STORE_PATH, BUILTIN_PROFILE_NAMES
);

// Legacy module-level API (backward compatible)
export function listProfiles(): string[] {
  return defaultProfileRepository.list();
}

export function saveProfile(profile: StoredProfile): { saved: boolean; name: string } {
  return defaultProfileRepository.save(profile);
}

export function loadProfile(name: string): StoredProfile | undefined {
  return defaultProfileRepository.load(name);
}

export function deleteProfile(name: string): boolean {
  return defaultProfileRepository.delete(name);
}

export function isBuiltinProfile(name: string): boolean {
  return defaultProfileRepository.isBuiltin(name);
}
