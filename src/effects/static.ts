import type { RGBColor } from '../color.js';
import type { IEffect } from '../effect.js';
import { KeyInfo } from '../layout.js';

export class StaticEffect implements IEffect {
  readonly name = 'static';
  readonly description = 'Static solid color on all keys';

  private color: RGBColor = { r: 255, g: 0, b: 0 };

  setColor(color: RGBColor): void {
    this.color = { ...color };
  }

  getColorAt(_key: KeyInfo, _step: number, _time: number): RGBColor {
    return { ...this.color };
  }
}
