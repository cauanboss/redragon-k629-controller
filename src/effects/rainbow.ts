import type { RGBColor } from '../color.js';
import type { IEffect } from '../effect.js';
import { KeyInfo } from '../layout.js';

export class RainbowEffect implements IEffect {
  readonly name = 'rainbow';
  readonly description = 'Rainbow wave that scrolls across the keyboard';

  getColorAt(key: KeyInfo, step: number, _time: number): RGBColor {
    const hue = ((key.position.row * 6 + key.position.col) * 15 + step) % 360;
    return this.hsvToRgb(hue, 1.0, 1.0);
  }

  private hsvToRgb(h: number, s: number, v: number): RGBColor {
    const region = Math.floor(h / 60) % 6;
    const f = h / 60 - Math.floor(h / 60);
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    const scale = (x: number): number => Math.round(Math.max(0, Math.min(255, x * 255)));

    switch (region) {
      case 0: return { r: scale(v), g: scale(t), b: scale(p) };
      case 1: return { r: scale(q), g: scale(v), b: scale(p) };
      case 2: return { r: scale(p), g: scale(v), b: scale(t) };
      case 3: return { r: scale(p), g: scale(q), b: scale(v) };
      case 4: return { r: scale(t), g: scale(p), b: scale(v) };
      case 5: return { r: scale(v), g: scale(p), b: scale(q) };
      default: return { r: 0, g: 0, b: 0 };
    }
  }
}
