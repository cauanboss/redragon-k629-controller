import { describe, it, expect } from 'vitest';
import type { RGBColor } from '../color.js';

describe('RGBColor', () => {
  it('creates a valid color with r, g, b values', () => {
    const color: RGBColor = { r: 255, g: 128, b: 0 };
    expect(color).toBeDefined();
    expect(color.r).toBe(255);
    expect(color.g).toBe(128);
    expect(color.b).toBe(0);
  });

  it('accepts 0 for all channels (black)', () => {
    const color: RGBColor = { r: 0, g: 0, b: 0 };
    expect(color.r).toBe(0);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0);
  });

  it('accepts 255 for all channels (white)', () => {
    const color: RGBColor = { r: 255, g: 255, b: 255 };
    expect(color.r).toBe(255);
    expect(color.g).toBe(255);
    expect(color.b).toBe(255);
  });

  it('accepts mid-range values', () => {
    const color: RGBColor = { r: 127, g: 200, b: 33 };
    expect(color.r).toBe(127);
    expect(color.g).toBe(200);
    expect(color.b).toBe(33);
  });

  it('is structurally typed — any object with r, g, b numbers is valid', () => {
    // RGBColor is a type alias, not a class, so there is no runtime validation.
    // This test documents that the type system allows these values at compile time.
    const color: RGBColor = { r: 100, g: 150, b: 200 };
    expect(color).toEqual({ r: 100, g: 150, b: 200 });
  });

  it('does not perform runtime bounds validation (type-only)', () => {
    // RGBColor is a plain type alias — no runtime checking exists.
    // Values outside 0-255 are technically permitted by the type,
    // but the protocol layer clamps them via clampByte().
    const color: RGBColor = { r: 300, g: -1, b: 128 };
    expect(color.r).toBe(300);
    expect(color.g).toBe(-1);
    expect(color.b).toBe(128);
  });
});
