import type { RGBColor } from '../color.js';
import { clampByte, hslToRgb } from '../color.js';
import type { IEffect } from '../effect.js';
import type { KeyInfo } from '../layout.js';
import { KeyLayout } from '../layout.js';

const BLACK: RGBColor = { r: 0, g: 0, b: 0 };

function hueColor(hueDeg: number, saturation = 1, lightness = 0.5): RGBColor {
  const h = (((hueDeg % 360) + 360) % 360) / 360;
  return hslToRgb(h, saturation, lightness);
}

function hashKey(id: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Host-driven snake — moving green head with fading tail. */
export class SnakeEffect implements IEffect {
  readonly name = 'snake';
  readonly description = 'Snake head crawling across the key matrix (host-driven)';

  getColorAt(key: KeyInfo, step: number, _time: number): RGBColor {
    const headRow = step % KeyLayout.ROWS;
    const headCol = Math.floor(step / KeyLayout.ROWS) % KeyLayout.COLS;
    const dist = Math.abs(key.position.row - headRow) + Math.abs(key.position.col - headCol);
    if (dist > 4) return BLACK;
    const intensity = 1 - dist / 4;
    return {
      r: 0,
      g: clampByte(intensity * 255),
      b: clampByte(intensity * 60),
    };
  }
}

/** Host-driven star twinkle — random keys flash like stars. */
export class StarTwinkleEffect implements IEffect {
  readonly name = 'star-twinkle';
  readonly description = 'Random keys twinkle like stars (host-driven)';

  getColorAt(key: KeyInfo, step: number, _time: number): RGBColor {
    const phase = hashKey(key.id, Math.floor(step / 4));
    const pulse = Math.sin(step * 0.35 + phase * 0.01);
    if (pulse < 0.55) return BLACK;
    const intensity = (pulse - 0.55) / 0.45;
    return {
      r: clampByte(intensity * 255),
      g: clampByte(intensity * 240),
      b: clampByte(intensity * 180),
    };
  }
}

/** Host-driven sine wave — vertical ripple (distinct from horizontal wave). */
export class SineWaveEffect implements IEffect {
  readonly name = 'sine-wave';
  readonly description = 'Vertical sine ripple across rows (host-driven)';

  getColorAt(key: KeyInfo, step: number, _time: number): RGBColor {
    const phase = (key.position.row + step * 0.45) / KeyLayout.ROWS;
    const brightness = Math.max(0, Math.sin(phase * Math.PI * 2));
    return {
      r: clampByte(brightness * 80),
      g: clampByte(brightness * 200),
      b: clampByte(brightness * 255),
    };
  }
}

/** Host-driven waterfall — color drops cascade down each column. */
export class WaterfallEffect implements IEffect {
  readonly name = 'waterfall';
  readonly description = 'Color drops falling down each column (host-driven)';

  getColorAt(key: KeyInfo, step: number, _time: number): RGBColor {
    const drop = (step * 0.6 + key.position.col * 3) % KeyLayout.ROWS;
    const dist = Math.abs(key.position.row - drop);
    if (dist > 2.5) return BLACK;
    const intensity = 1 - dist / 2.5;
    return {
      r: clampByte(intensity * 40),
      g: clampByte(intensity * 120),
      b: clampByte(intensity * 255),
    };
  }
}

/** Host-driven rainbow blossom — radial hue from keyboard center. */
export class RainbowBlossomEffect implements IEffect {
  readonly name = 'rainbow-blossom';
  readonly description = 'Radial rainbow bloom from center (host-driven)';

  getColorAt(key: KeyInfo, step: number, _time: number): RGBColor {
    const centerRow = (KeyLayout.ROWS - 1) / 2;
    const centerCol = (KeyLayout.COLS - 1) / 2;
    const dist = Math.hypot(key.position.row - centerRow, key.position.col - centerCol);
    return hueColor(dist * 35 + step * 6, 1, 0.5);
  }
}

/** Host-driven color wheel — hue rotates by key angle. */
export class WheelEffect implements IEffect {
  readonly name = 'wheel';
  readonly description = 'Rotating color wheel by key angle (host-driven)';

  getColorAt(key: KeyInfo, step: number, _time: number): RGBColor {
    const centerRow = (KeyLayout.ROWS - 1) / 2;
    const centerCol = (KeyLayout.COLS - 1) / 2;
    const angle = Math.atan2(key.position.row - centerRow, key.position.col - centerCol);
    const hue = (angle * 180) / Math.PI + step * 10;
    return hueColor(hue, 1, 0.5);
  }
}
