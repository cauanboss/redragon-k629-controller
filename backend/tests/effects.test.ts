import { describe, it, expect } from 'vitest';
import { StaticEffect } from '../effects/static.js';
import { RainbowEffect } from '../effects/rainbow.js';
import { WaveEffect } from '../effects/wave.js';
import { getEffect, listEffects } from '../effects/index.js';
import { KeyLayout } from '../layout.js';

describe('StaticEffect', () => {
  const effect = new StaticEffect();
  const key = new KeyLayout().getKeyById('esc')!;

  it('returns the same color for any parameters', () => {
    const c1 = effect.getColorAt(key, 0, 0);
    const c2 = effect.getColorAt(key, 100, 50000);
    expect(c1).toEqual(c2);
  });

  it('returns warm orange by default', () => {
    const color = effect.getColorAt(key, 0, 0);
    expect(color.r).toBe(255);
    expect(color.g).toBe(100);
    expect(color.b).toBe(0);
  });

  it('setColor changes the returned color', () => {
    effect.setColor({ r: 0, g: 128, b: 255 });
    const color = effect.getColorAt(key, 0, 0);
    expect(color.r).toBe(0);
    expect(color.g).toBe(128);
    expect(color.b).toBe(255);
  });

  it('setColor does not mutate the passed object', () => {
    const input = { r: 10, g: 20, b: 30 };
    effect.setColor(input);
    input.r = 255;
    const color = effect.getColorAt(key, 0, 0);
    expect(color.r).toBe(10); // should still be the snapshot value
  });

  it('has correct name and description', () => {
    expect(effect.name).toBe('static');
    expect(effect.description).toBeTruthy();
  });
});

describe('RainbowEffect', () => {
  const effect = new RainbowEffect();
  const layout = new KeyLayout();

  it('returns different colors for different positions at the same step', () => {
    const keyA = layout.getKeyById('a')!;
    const keyB = layout.getKeyById('b')!;
    const colorA = effect.getColorAt(keyA, 0, 0);
    const colorB = effect.getColorAt(keyB, 0, 0);
    // They should differ (rainbow varies by position)
    const same = colorA.r === colorB.r && colorA.g === colorB.g && colorA.b === colorB.b;
    expect(same).toBe(false);
  });

  it('returns different colors for the same key at different steps', () => {
    const key = layout.getKeyById('esc')!;
    const c1 = effect.getColorAt(key, 0, 0);
    const c2 = effect.getColorAt(key, 50, 0);
    const same = c1.r === c2.r && c1.g === c2.g && c1.b === c2.b;
    expect(same).toBe(false);
  });

  it('returns valid RGB values (0-255) for all keys at any step', () => {
    for (const key of layout.keys) {
      for (const step of [0, 30, 100, 500]) {
        const color = effect.getColorAt(key, step, 0);
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
      }
    }
  });

  it('has correct name and description', () => {
    expect(effect.name).toBe('rainbow');
    expect(effect.description).toBeTruthy();
  });
});

describe('WaveEffect', () => {
  const effect = new WaveEffect();
  const layout = new KeyLayout();

  it('returns different colors for different columns at the same step', () => {
    // At step=0: col 0 gives brightness 0 (sin(0)=0), col 1 gives non-zero
    const keyA = layout.keys.find((k) => k.position.col === 0)!;
    const keyB = layout.keys.find((k) => k.position.col === 1)!;
    const color0 = effect.getColorAt(keyA, 0, 0);
    const color1 = effect.getColorAt(keyB, 0, 0);
    // col 0 should have brightness sin(0*π/6)=0 → black
    // col 1 should have brightness sin(1*π/6)=0.5 → non-zero
    expect(color0).toEqual({ r: 0, g: 0, b: 0 });
    expect(color1.r).toBeGreaterThan(0);
  });

  it('returns different colors at different steps for the same key', () => {
    // At col 0: step 0 gives brightness 0, step 1 gives brightness sin(π/6)=0.5
    const key = layout.keys.find((k) => k.position.col === 0)!;
    const c1 = effect.getColorAt(key, 0, 0);
    const c2 = effect.getColorAt(key, 1, 0);
    expect(c1).toEqual({ r: 0, g: 0, b: 0 });
    expect(c2.r).toBeGreaterThan(0);
  });

  it('returns valid RGB values (0-255) for all keys', () => {
    for (const key of layout.keys) {
      const color = effect.getColorAt(key, 0, 0);
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
    }
  });

  it('has correct name and description', () => {
    expect(effect.name).toBe('wave');
    expect(effect.description).toBeTruthy();
  });
});

describe('Effects Registry', () => {
  it('getEffect("static") returns a StaticEffect instance', () => {
    const effect = getEffect('static');
    expect(effect).toBeDefined();
    expect(effect!.name).toBe('static');
  });

  it('getEffect("rainbow") returns a RainbowEffect instance', () => {
    const effect = getEffect('rainbow');
    expect(effect).toBeDefined();
    expect(effect!.name).toBe('rainbow');
  });

  it('getEffect("wave") returns a WaveEffect instance', () => {
    const effect = getEffect('wave');
    expect(effect).toBeDefined();
    expect(effect!.name).toBe('wave');
  });

  it('getEffect for unknown name returns undefined', () => {
    expect(getEffect('unknown')).toBeUndefined();
    expect(getEffect('nonexistent')).toBeUndefined();
  });

  it('listEffects() contains all built-in effects', () => {
    const names = listEffects();
    expect(names).toContain('static');
    expect(names).toContain('rainbow');
    expect(names).toContain('wave');
    expect(names).toContain('snake');
    expect(names).toContain('star-twinkle');
    expect(names).toContain('sine-wave');
    expect(names).toContain('waterfall');
    expect(names).toContain('rainbow-blossom');
    expect(names).toContain('wheel');
    expect(names).toContain('audio-visualizer');
    expect(names).toContain('typing-reactive');
  });

  it('getEffect("audio-visualizer") returns an AudioVisualizerEffect instance', () => {
    const effect = getEffect('audio-visualizer');
    expect(effect).toBeDefined();
    expect(effect!.name).toBe('audio-visualizer');
    expect(effect!.description).toBeTruthy();
  });
});
