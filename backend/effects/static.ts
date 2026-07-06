import type { RGBColor } from '../color.js';
import type { IEffect } from '../effect.js';
import type { KeyInfo } from '../layout.js';

const DEFAULT_STATIC_COLOR: RGBColor = { r: 255, g: 100, b: 0 };

export class StaticEffect implements IEffect {
  readonly name = 'static';
  readonly description = 'Solid color on all keys (host-driven)';

  private color: RGBColor = { ...DEFAULT_STATIC_COLOR };

  setColor(color: RGBColor): void {
    this.color = { ...color };
  }

  getColorAt(_key: KeyInfo, _step: number, _time: number): RGBColor {
    return { ...this.color };
  }
}
