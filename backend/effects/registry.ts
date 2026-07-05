import type { IEffect } from '../effect.js';

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
