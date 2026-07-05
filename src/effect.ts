import type { RGBColor } from './color.js';
import type { KeyInfo } from './layout.js';

export interface IEffect {
  readonly name: string;
  readonly description: string;
  getColorAt(key: KeyInfo, step: number, time: number): RGBColor;
}

export type EffectConstructor = new () => IEffect;
