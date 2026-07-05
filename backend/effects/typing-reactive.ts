import type { RGBColor } from '../color.js';
import type { IEffect, IEffectLifecycle } from '../effect.js';
import type { KeyInfo } from '../layout.js';
import { EvdevInputReader } from '../input/evdev-reader.js';
import { EVDEV_TO_LAYOUT } from '../input/keymap.js';
import type { IInputReader } from '../ports/iinput-reader.js';

const BLACK: RGBColor = { r: 0, g: 0, b: 0 };
const FADE_THRESHOLD = 0.02;

export interface TypingReactiveOptions {
  decayMs?: number;     // default 300ms
  hue?: number;         // default 0 (red), 0-360
  inputReader?: IInputReader;  // injectable for testing
}

export class TypingReactiveEffect implements IEffect, IEffectLifecycle {
  readonly name = 'typing-reactive';
  readonly description = 'Lights up keys on press with exponential fade-out';

  private readonly pressedKeys = new Map<string, number>();
  private decayMs: number;
  private readonly pressedColor: RGBColor;
  private readonly inputReader: IInputReader;
  private available = false;
  private warnedPermission = false;

  constructor(options: TypingReactiveOptions = {}) {
    this.decayMs = options.decayMs ?? 300;
    this.pressedColor = options.hue != null
      ? hueToRgb(options.hue, 1.0)
      : { r: 255, g: 255, b: 255 };
    this.inputReader = options.inputReader ?? new EvdevInputReader();
  }

  onStart(): void {
    this.pressedKeys.clear();
    this.warnedPermission = false;
    this.inputReader.onKeyEvent((evdevCode, value) => {
      this.handleKeyEvent(evdevCode, value);
    });
    try {
      this.inputReader.start();
      this.available = true;
    } catch (err) {
      this.available = false;
    }
  }

  onStop(): void {
    this.inputReader.stop();
    this.pressedKeys.clear();
  }

  getColorAt(key: KeyInfo, _step: number, time: number): RGBColor {
    if (!this.available) {
      if (!this.warnedPermission) {
        console.warn(
          'Typing Reactive: input device unavailable. ' +
          'Add your user to the input group: sudo usermod -aG input $USER'
        );
        this.warnedPermission = true;
      }
      return BLACK;
    }

    const pressTs = this.pressedKeys.get(key.id);
    if (pressTs === undefined) return BLACK;

    const elapsed = time - pressTs;
    const brightness = Math.exp(-elapsed / this.decayMs);

    if (brightness < FADE_THRESHOLD) {
      this.pressedKeys.delete(key.id);
      return BLACK;
    }

    const c = this.pressedColor;
    return {
      r: Math.round(c.r * brightness),
      g: Math.round(c.g * brightness),
      b: Math.round(c.b * brightness),
    };
  }

  setHue(hue: number): void {
    const rgb = hueToRgb(hue, 1.0);
    Object.assign(this.pressedColor, rgb);
  }

  setDecayMs(ms: number): void {
    this.decayMs = Math.max(10, ms);
  }

  private handleKeyEvent(evdevCode: number, value: number): void {
    const keyId = EVDEV_TO_LAYOUT[evdevCode];
    if (!keyId) return;
    if (value === 1) {
      this.pressedKeys.set(keyId, Date.now());
    }
    // Key release (value === 0) is intentionally ignored — fade handles it
  }
}

/** Convert HSL hue (0-360) + saturation (0-1) to RGB. */
export function hueToRgb(h: number, s: number): RGBColor {
  const v = 1.0;
  const region = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const scale = (x: number) => Math.round(Math.max(0, Math.min(255, x * 255)));

  switch (region) {
    case 0: return { r: scale(v), g: scale(t), b: scale(p) };
    case 1: return { r: scale(q), g: scale(v), b: scale(p) };
    case 2: return { r: scale(p), g: scale(v), b: scale(t) };
    case 3: return { r: scale(p), g: scale(q), b: scale(v) };
    case 4: return { r: scale(t), g: scale(p), b: scale(v) };
    default: return { r: scale(v), g: scale(p), b: scale(q) };
  }
}
