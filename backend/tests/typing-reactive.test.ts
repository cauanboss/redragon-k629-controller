import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TypingReactiveEffect, hueToRgb } from '../effects/typing-reactive.js';
import type { IInputReader, KeyEventCallback } from '../ports/iinput-reader.js';
import type { KeyInfo } from '../layout.js';

// ── Mock IInputReader ──────────────────────────────────────────────

class MockInputReader implements IInputReader {
  readonly listeners: KeyEventCallback[] = [];
  start = vi.fn();
  stop = vi.fn();
  onKeyEvent(cb: KeyEventCallback): void {
    this.listeners.push(cb);
  }
  /** Simulate a key event as if it came from the physical device. */
  simulateKeyEvent(evdevCode: number, value: number): void {
    for (const cb of this.listeners) {
      cb(evdevCode, value);
    }
  }
}

// ── Sample KeyInfo ─────────────────────────────────────────────────

function makeKey(id: string, row = 0, col = 0): KeyInfo {
  return { id, label: id, position: { row, col } };
}

// ── Tests ──────────────────────────────────────────────────────────

describe('hueToRgb', () => {
  it('returns red for hue 0', () => {
    const rgb = hueToRgb(0, 1.0);
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('returns yellow for hue 60', () => {
    const rgb = hueToRgb(60, 1.0);
    expect(rgb).toEqual({ r: 255, g: 255, b: 0 });
  });

  it('returns green for hue 120', () => {
    const rgb = hueToRgb(120, 1.0);
    expect(rgb).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('returns cyan for hue 180', () => {
    const rgb = hueToRgb(180, 1.0);
    expect(rgb).toEqual({ r: 0, g: 255, b: 255 });
  });

  it('returns blue for hue 240', () => {
    const rgb = hueToRgb(240, 1.0);
    expect(rgb).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('returns magenta for hue 300', () => {
    const rgb = hueToRgb(300, 1.0);
    expect(rgb).toEqual({ r: 255, g: 0, b: 255 });
  });

  it('returns white for saturation 0 at any hue', () => {
    const rgb = hueToRgb(120, 0);
    expect(rgb).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('returns valid RGB values for all hues in [0, 360)', () => {
    for (let h = 0; h < 360; h += 15) {
      const rgb = hueToRgb(h, 1.0);
      expect(rgb.r).toBeGreaterThanOrEqual(0);
      expect(rgb.r).toBeLessThanOrEqual(255);
      expect(rgb.g).toBeGreaterThanOrEqual(0);
      expect(rgb.g).toBeLessThanOrEqual(255);
      expect(rgb.b).toBeGreaterThanOrEqual(0);
      expect(rgb.b).toBeLessThanOrEqual(255);
    }
  });
});

describe('TypingReactiveEffect', () => {
  let effect: TypingReactiveEffect;
  let mockReader: MockInputReader;

  beforeEach(() => {
    vi.useFakeTimers();
    mockReader = new MockInputReader();
    effect = new TypingReactiveEffect({
      decayMs: 100,
      hue: 0, // red
      inputReader: mockReader,
    });
  });

  afterEach(() => {
    effect.onStop();
    vi.useRealTimers();
  });

  describe('lifecycle', () => {
    it('calls inputReader.start() on onStart', () => {
      effect.onStart();
      expect(mockReader.start).toHaveBeenCalledTimes(1);
    });

    it('calls inputReader.stop() on onStop', () => {
      effect.onStart();
      effect.onStop();
      expect(mockReader.stop).toHaveBeenCalledTimes(1);
    });

    it('registers a listener on onStart', () => {
      effect.onStart();
      expect(mockReader.listeners.length).toBe(1);
    });

    it('clears pressed keys on onStart', () => {
      effect.onStart();
      // Simulate a key press
      mockReader.simulateKeyEvent(30, 1); // 'a'
      expect(effect.getColorAt(makeKey('a'), 0, Date.now())).not.toEqual({ r: 0, g: 0, b: 0 });

      // Restart should clear state
      effect.onStart();
      expect(effect.getColorAt(makeKey('a'), 0, Date.now())).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('getColorAt', () => {
    beforeEach(() => {
      effect.onStart();
    });

    it('returns black for unpressed keys', () => {
      const color = effect.getColorAt(makeKey('b'), 0, Date.now());
      expect(color).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('returns full color immediately after key press', () => {
      mockReader.simulateKeyEvent(30, 1); // 'a'
      const color = effect.getColorAt(makeKey('a'), 0, Date.now());
      // Full red
      expect(color).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('returns exponentially dimmer color as time passes', () => {
      mockReader.simulateKeyEvent(48, 1); // 'b'
      const pressTime = Date.now();

      // At t = 0: brightness = exp(0) = 1 → full red
      const c0 = effect.getColorAt(makeKey('b'), 0, pressTime);
      expect(c0.r).toBe(255);

      // At t = decayMs (100ms): brightness = exp(-1) ≈ 0.368
      const c1 = effect.getColorAt(makeKey('b'), 0, pressTime + 100);
      expect(c1.r).toBe(Math.round(255 * Math.exp(-1)));

      // At t = 2× decayMs (200ms): brightness = exp(-2) ≈ 0.135
      const c2 = effect.getColorAt(makeKey('b'), 0, pressTime + 200);
      expect(c2.r).toBe(Math.round(255 * Math.exp(-2)));
    });

    it('returns black after key fades below threshold', () => {
      mockReader.simulateKeyEvent(30, 1); // 'a'
      const pressTime = Date.now();

      // Well beyond decay time (10× decayMs=1000ms, threshold 2%)
      const color = effect.getColorAt(makeKey('a'), 0, pressTime + 1000);
      expect(color).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('ignores key release events (value=0) — fade handles it', () => {
      mockReader.simulateKeyEvent(30, 1); // press 'a'
      expect(effect.getColorAt(makeKey('a'), 0, Date.now()).r).toBeGreaterThan(0);

      mockReader.simulateKeyEvent(30, 0); // release 'a'
      // Should still be lit (fade continues)
      expect(effect.getColorAt(makeKey('a'), 0, Date.now()).r).toBeGreaterThan(0);
    });

    it('handles rapid repeated key presses', () => {
      const now = Date.now();

      // Press 'a' at t=0
      mockReader.simulateKeyEvent(30, 1);
      const color1 = effect.getColorAt(makeKey('a'), 0, now + 50);

      // Press 'a' again at t=50 (re-triggers the timer)
      mockReader.simulateKeyEvent(30, 1);
      const color2 = effect.getColorAt(makeKey('a'), 0, now + 50);

      // At the same instant, both should be the same
      expect(color1).toEqual(color2);
    });
  });

  describe('key mapping', () => {
    beforeEach(() => {
      effect.onStart();
    });

    it('maps evdev code 30 to key ID "a"', () => {
      mockReader.simulateKeyEvent(30, 1);
      const color = effect.getColorAt(makeKey('a'), 0, Date.now());
      expect(color.r).toBeGreaterThan(0);
    });

    it('maps evdev code 57 to key ID "space"', () => {
      mockReader.simulateKeyEvent(57, 1);
      const color = effect.getColorAt(makeKey('space'), 0, Date.now());
      expect(color.r).toBeGreaterThan(0);
    });

    it('maps evdev code 28 to key ID "enter"', () => {
      mockReader.simulateKeyEvent(28, 1);
      const color = effect.getColorAt(makeKey('enter'), 0, Date.now());
      expect(color.r).toBeGreaterThan(0);
    });

    it('ignores unmapped evdev codes', () => {
      mockReader.simulateKeyEvent(999, 1);
      // Should not throw, and no key should light up
      expect(effect.getColorAt(makeKey('a'), 0, Date.now())).toEqual({ r: 0, g: 0, b: 0 });
    });
  });

  describe('setHue', () => {
    it('changes the pressed color', () => {
      effect.onStart();
      effect.setHue(120); // green
      mockReader.simulateKeyEvent(30, 1); // 'a'
      // Should be green instead of red
      const color = effect.getColorAt(makeKey('a'), 0, Date.now());
      expect(color.r).toBe(0);
      expect(color.g).toBeGreaterThan(0);
    });
  });

  describe('setDecayMs', () => {
    it('changes the decay rate', () => {
      effect.onStart();
      effect.setDecayMs(1000); // slower decay
      mockReader.simulateKeyEvent(30, 1); // 'a'
      const pressTime = Date.now();

      // At t=100ms with 1000ms decay, brightness = exp(-0.1) ≈ 0.905
      const color = effect.getColorAt(makeKey('a'), 0, pressTime + 100);
      expect(color.r).toBe(Math.round(255 * Math.exp(-0.1)));
    });

    it('clamps decayMs to minimum 10', () => {
      effect.setDecayMs(-5);
      effect.onStart();
      mockReader.simulateKeyEvent(30, 1); // 'a'
      // Should work without error
      expect(effect.getColorAt(makeKey('a'), 0, Date.now()).r).toBeGreaterThan(0);
    });
  });
});
