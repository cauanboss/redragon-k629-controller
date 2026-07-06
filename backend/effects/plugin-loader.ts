import { readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerEffect } from './registry.js';
import type { IEffect } from '../effect.js';

export async function loadPlugins(): Promise<void> {
  const pluginsDir = resolve(dirname(fileURLToPath(import.meta.url)), 'plugins');

  let entries: string[];
  try {
    entries = readdirSync(pluginsDir);
  } catch {
    return; // plugins/ directory doesn't exist yet
  }

  for (const entry of entries) {
    if (!entry.endsWith('.ts') && !entry.endsWith('.js')) continue;

    try {
      const mod = (await import(resolve(pluginsDir, entry))) as Record<string, unknown>;
      for (const exported of Object.values(mod)) {
        if (isEffect(exported)) {
          registerEffect(exported);
          console.log(`[plugin] Loaded effect "${exported.name}" from ${entry}`);
        }
      }
    } catch (err) {
      console.warn(`[plugin] Failed to load ${entry}:`, (err as Error).message);
    }
  }
}

function isEffect(obj: unknown): obj is IEffect {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as IEffect).name === 'string' &&
    typeof (obj as IEffect).getColorAt === 'function'
  );
}
