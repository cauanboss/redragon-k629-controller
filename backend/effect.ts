import type { RGBColor } from './color.js';
import type { KeyInfo } from './layout.js';

export interface IEffect {
  readonly name: string;
  readonly description: string;
  getColorAt(key: KeyInfo, step: number, time: number): RGBColor;
}

/** Optional lifecycle hooks for effects that need setup/teardown (audio, evdev). */
export interface IEffectLifecycle {
  onStart(): void;
  onStop(): void;
}

/** Type guard — checks if an effect implements lifecycle hooks. */
export function hasLifecycle(effect: IEffect): effect is IEffect & IEffectLifecycle {
  return (
    typeof (effect as Partial<IEffectLifecycle>).onStart === 'function' &&
    typeof (effect as Partial<IEffectLifecycle>).onStop === 'function'
  );
}

export type EffectConstructor = new () => IEffect;
