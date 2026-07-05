import type { IEffect } from '../effect.js';
import { StaticEffect } from './static.js';
import { RainbowEffect } from './rainbow.js';
import { WaveEffect } from './wave.js';

const registry = new Map<string, IEffect>();

export function registerEffect(effect: IEffect): void {
  registry.set(effect.name, effect);
}

export function getEffect(name: string): IEffect | undefined {
  return registry.get(name);
}

export function listEffects(): string[] {
  return Array.from(registry.keys());
}

// Register built-in effects
registerEffect(new StaticEffect());
registerEffect(new RainbowEffect());
registerEffect(new WaveEffect());
