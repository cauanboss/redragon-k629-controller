import type { RGBColor } from '../color.js';
import type { IEffect } from '../effect.js';
import type { KeyInfo } from '../layout.js';
import { KeyLayout } from '../layout.js';

export class WaveEffect implements IEffect {
  readonly name = 'wave';
  readonly description = 'Smooth wave sweeping from left to right';

  getColorAt(key: KeyInfo, step: number, _time: number): RGBColor {
    const phase = (key.position.col + step * 0.5) / KeyLayout.COLS;
    const brightness = Math.max(0, Math.sin(phase * Math.PI * 2));

    const r = Math.round(brightness * 255);
    const g = Math.round(brightness * 128);
    const b = Math.round(brightness * 255);

    return { r, g, b };
  }
}
