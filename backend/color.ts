// Value Object: cor RGB
export type RGBColor = { r: number; g: number; b: number };

/** Clamp a value to 0–255 (valid RGB byte range). */
export function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Clamp a nibble value to 0–4 (firmware brightness/speed range). */
export function clampNibble(value: number): number {
  return Math.max(0, Math.min(4, Math.round(value)));
}

/** Parse a hex colour string (#rrggbb or rrggbb) to RGBColor. Throws on invalid input. */
export function hexToRgb(hex: string): RGBColor {
  const value = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(
      `Invalid hex colour: "${hex}". Use format RRGGBB or #RRGGBB (e.g. ff0000 for red).`
    );
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/** Convert HSL (h,s,l ∈ [0,1]) to RGBColor. */
export function hslToRgb(h: number, s: number, l: number): RGBColor {
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    const v = clampByte(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: clampByte(hue2rgb(p, q, h + 1 / 3) * 255),
    g: clampByte(hue2rgb(p, q, h) * 255),
    b: clampByte(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/** Convert RGBColor to hex string (lowercase, with # prefix). */
export function rgbToHex(color: RGBColor): string {
  const r = clampByte(color.r);
  const g = clampByte(color.g);
  const b = clampByte(color.b);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
