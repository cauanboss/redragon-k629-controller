import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';
import type { RGBColor } from '../color.js';

// ── Types ──────────────────────────────────────────────────────

export interface StoredProfile {
  name: string;
  colors: Record<string, RGBColor>;
  effect?: string;
  brightness?: number;
  speed?: number;
}

// ── Store ──────────────────────────────────────────────────────

const STORE_DIR = resolve(homedir(), '.config', 'redragon-k629');
const STORE_PATH = resolve(STORE_DIR, 'profiles.json');

function ensureDir(): void {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
}

function readAll(): StoredProfile[] {
  try {
    ensureDir();
    const raw = readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as StoredProfile[];
  } catch {
    return [];
  }
}

function writeAll(profiles: StoredProfile[]): void {
  ensureDir();
  writeFileSync(STORE_PATH, JSON.stringify(profiles, null, 2), 'utf-8');
}

// ── Public API ─────────────────────────────────────────────────

export function listProfiles(): string[] {
  return readAll().map(p => p.name);
}

export function saveProfile(profile: StoredProfile): void {
  const all = readAll();
  const idx = all.findIndex(p => p.name === profile.name);
  if (idx >= 0) {
    all[idx] = profile;
  } else {
    all.push(profile);
  }
  writeAll(all);
}

export function loadProfile(name: string): StoredProfile | undefined {
  return readAll().find(p => p.name === name);
}

export function deleteProfile(name: string): boolean {
  const all = readAll();
  const filtered = all.filter(p => p.name !== name);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}
