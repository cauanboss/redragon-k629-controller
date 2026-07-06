import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { FileProfileRepository } from '../infrastructure/profile-store.js';
import { BUILTIN_PROFILE_NAMES } from '../infrastructure/builtin-profiles.js';
import { BUILTIN_COLORS } from '../infrastructure/builtin-profiles-data.js';

describe('FileProfileRepository', () => {
  let tempDir: string;
  let repository: FileProfileRepository;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'redragon-profiles-'));
    repository = new FileProfileRepository(tempDir, join(tempDir, 'profiles.json'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('saves and loads a profile', () => {
    repository.save({
      name: 'gaming',
      colors: { esc: { r: 255, g: 0, b: 0 } },
      effect: 'rainbow',
      brightness: 3,
      speed: 2,
    });

    const loaded = repository.load('gaming');

    expect(loaded).toEqual({
      name: 'gaming',
      colors: { esc: { r: 255, g: 0, b: 0 } },
      effect: 'rainbow',
      brightness: 3,
      speed: 2,
      builtin: false,
    });
  });

  it('lists profile names', () => {
    repository.save({ name: 'a', colors: {} });
    repository.save({ name: 'b', colors: {} });

    expect(repository.list()).toEqual(['a', 'b']);
  });

  it('overwrites an existing profile with the same name', () => {
    repository.save({ name: 'a', colors: { esc: { r: 1, g: 2, b: 3 } } });
    repository.save({ name: 'a', colors: { esc: { r: 4, g: 5, b: 6 } } });

    expect(repository.load('a')?.colors.esc).toEqual({ r: 4, g: 5, b: 6 });
    expect(repository.list()).toEqual(['a']);
  });

  it('deletes an existing profile', () => {
    repository.save({ name: 'temp', colors: {} });

    expect(repository.delete('temp')).toBe(true);
    expect(repository.load('temp')).toBeUndefined();
    expect(repository.list()).toEqual([]);
  });

  it('persists profiles to disk as JSON', () => {
    repository.save({ name: 'disk', colors: {} });

    expect(existsSync(join(tempDir, 'profiles.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(tempDir, 'profiles.json'), 'utf-8'))).toEqual([
      { name: 'disk', colors: {}, builtin: false },
    ]);
  });
});

describe('FileProfileRepository with built-in profiles', () => {
  let tempDir: string;
  let repository: FileProfileRepository;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'redragon-builtin-'));
    repository = new FileProfileRepository(
      tempDir,
      join(tempDir, 'profiles.json'),
      BUILTIN_PROFILE_NAMES
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists built-in names even when no profiles are saved', () => {
    const names = repository.list();
    for (const builtin of BUILTIN_PROFILE_NAMES) {
      expect(names).toContain(builtin);
    }
  });

  it('marks builtin profiles as builtin', () => {
    for (const name of BUILTIN_PROFILE_NAMES) {
      expect(repository.isBuiltin(name)).toBe(true);
    }
    expect(repository.isBuiltin('custom')).toBe(false);
  });

  it('rejects delete for built-in profiles', () => {
    expect(repository.delete('synthwave')).toBe(false);
  });

  it('creates a copy when saving with a built-in name (copy-on-write)', () => {
    const result = repository.save({
      name: 'synthwave',
      colors: { esc: { r: 255, g: 0, b: 0 } },
    });

    expect(result.saved).toBe(true);
    expect(result.name).toBe('synthwave (custom)');

    // built-in should still exist
    expect(repository.list()).toContain('synthwave');
    // custom copy should also exist
    expect(repository.list()).toContain('synthwave (custom)');
  });

  it('allows overwriting a previously-saved user profile with same name', () => {
    // First save creates a copy
    repository.save({ name: 'matrix', colors: { a: { r: 1, g: 2, b: 3 } } });
    // Second save with the same name should update the copy, not create another
    const result = repository.save({
      name: 'matrix (custom)',
      colors: { a: { r: 4, g: 5, b: 6 } },
    });

    expect(result.saved).toBe(true);
    expect(result.name).toBe('matrix (custom)');
    expect(repository.load('matrix (custom)')?.colors.a).toEqual({ r: 4, g: 5, b: 6 });
  });

  it('returns builtin color data when loading a builtin name with no user override', () => {
    const loaded = repository.load('nord');
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe('nord');
    expect(loaded!.builtin).toBe(true);
    expect(loaded!.colors).toEqual(BUILTIN_COLORS['nord']);
  });

  it('returns builtin data for all 8 builtin profile names', () => {
    for (const name of BUILTIN_PROFILE_NAMES) {
      const loaded = repository.load(name);
      expect(loaded).toBeDefined();
      expect(loaded!.name).toBe(name);
      expect(loaded!.builtin).toBe(true);
      expect(loaded!.colors).toEqual(BUILTIN_COLORS[name]);
    }
  });

  it('returns user-stored profile when loading a non-builtin name', () => {
    repository.save({ name: 'my-custom', colors: { esc: { r: 1, g: 2, b: 3 } } });
    const loaded = repository.load('my-custom');
    expect(loaded).toBeDefined();
    expect(loaded!.colors.esc).toEqual({ r: 1, g: 2, b: 3 });
  });

  it('returns builtin data when user saved with builtin name (copy-on-write)', () => {
    // Save with a builtin name — copy-on-write creates "nord (custom)", not "nord"
    repository.save({ name: 'nord', colors: { esc: { r: 1, g: 2, b: 3 } } });
    // Loading "nord" still returns the builtin data, not the custom copy
    const loaded = repository.load('nord');
    expect(loaded).toBeDefined();
    expect(loaded!.builtin).toBe(true);
    expect(loaded!.colors.esc).toEqual(BUILTIN_COLORS['nord'].esc);
    // The custom copy is accessible under the renamed name
    const custom = repository.load('nord (custom)');
    expect(custom).toBeDefined();
    expect(custom!.colors.esc).toEqual({ r: 1, g: 2, b: 3 });
    expect(custom!.builtin).toBe(false);
  });
});
