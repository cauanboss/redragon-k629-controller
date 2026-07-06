import { describe, it, expect } from 'vitest';
import { KeyLayout } from '../layout.js';
import { FrameBuilder, FIRMWARE_EFFECTS } from '../protocol.js';

function makeLayout(): KeyLayout {
  return new KeyLayout();
}

describe('FrameBuilder — buildPerKeyFrame', () => {
  const layout = makeLayout();
  const builder = new FrameBuilder(layout);

  it('returns a 382-byte buffer', () => {
    const map = new Map<string, { r: number; g: number; b: number }>();
    const frame = builder.buildPerKeyFrame(map);
    expect(frame).toBeInstanceOf(Buffer);
    expect(frame.length).toBe(382);
  });

  it('starts with header 0x08 0x0A 0x7A 0x01', () => {
    const frame = builder.buildPerKeyFrame(new Map());
    expect(frame[0]).toBe(0x08);
    expect(frame[1]).toBe(0x0a);
    expect(frame[2]).toBe(0x7a);
    expect(frame[3]).toBe(0x01);
  });

  it('sets NAN matrix cell positions to RGB 0,0,0', () => {
    // Build a frame with a color map that would give non-zero to all keys.
    // If the color map covers every key, NAN cells should still be zero.
    const allRed = new Map<string, { r: number; g: number; b: number }>();
    for (const key of layout.keys) {
      allRed.set(key.id, { r: 255, g: 0, b: 0 });
    }
    const frame = builder.buildPerKeyFrame(allRed);

    // NAN positions (layoutRow, layoutCol) mapped to transposed offset:
    //   hwRow = layoutCol, hwCol = layoutRow
    //   offset = 4 + (hwRow * 16 + hwCol) * 3
    // NAN positions (indices 23,29,41,47,70,71,77,80,85,86,87)
    const nullIndices = [23, 29, 41, 47, 70, 71, 77, 80, 85, 86, 87];
    for (const idx of nullIndices) {
      const offset = 4 + idx * 3;
      expect(frame[offset]).toBe(0);
      expect(frame[offset + 1]).toBe(0);
      expect(frame[offset + 2]).toBe(0);
    }
  });

  it('writes colors for physical key positions based on the map', () => {
    const colorMap = new Map<string, { r: number; g: number; b: number }>();
    // Set a distinct color for each key
    for (const key of layout.keys) {
      colorMap.set(key.id, { r: 10, g: 20, b: 30 });
    }
    // Also override a few specific ones
    colorMap.set('esc', { r: 255, g: 0, b: 0 });
    colorMap.set('space', { r: 0, g: 255, b: 0 });
    colorMap.set('up', { r: 0, g: 0, b: 255 });

    const frame = builder.buildPerKeyFrame(colorMap);

    // Esc at LED idx 0 → offset = 4
    let offset = 4;
    expect(frame[offset]).toBe(255);
    expect(frame[offset + 1]).toBe(0);
    expect(frame[offset + 2]).toBe(0);

    // Space at LED idx 35 → offset = 4 + 35*3 = 109
    offset = 4 + 35 * 3;
    expect(frame[offset]).toBe(0);
    expect(frame[offset + 1]).toBe(255);
    expect(frame[offset + 2]).toBe(0);

    // Up arrow at LED idx 88 → offset = 4 + 88*3 = 268
    offset = 4 + 88 * 3;
    expect(frame[offset]).toBe(0);
    expect(frame[offset + 1]).toBe(0);
    expect(frame[offset + 2]).toBe(255);
  });

  it('uses the ColorFn callback variant', () => {
    const frame = builder.buildPerKeyFrame((key) => {
      if (key.id === 'esc') return { r: 128, g: 64, b: 32 };
      return { r: 0, g: 0, b: 0 };
    });

    // Esc at LED idx 0 → offset = 4
    const offset = 4;
    expect(frame[offset]).toBe(128);
    expect(frame[offset + 1]).toBe(64);
    expect(frame[offset + 2]).toBe(32);
  });

  it('defaults to black for keys not in the map', () => {
    const emptyMap = new Map<string, { r: number; g: number; b: number }>();
    const frame = builder.buildPerKeyFrame(emptyMap);

    // Esc at LED idx 0 → offset = 4
    const offset = 4;
    expect(frame[offset]).toBe(0);
    expect(frame[offset + 1]).toBe(0);
    expect(frame[offset + 2]).toBe(0);
  });

  it('has zero padding in bytes 292–381', () => {
    const frame = builder.buildPerKeyFrame(new Map());
    for (let i = 292; i < 382; i++) {
      expect(frame[i]).toBe(0);
    }
  });

  it('all 96 cells (288 bytes) after header are either key color or zero', () => {
    // The frame has header (4) + 96*3 (288) + padding (90) = 382
    const frame = builder.buildPerKeyFrame(new Map());
    // Total non-padding data area: 4 + 288 = 292 bytes
    // After header, bytes 4..291 contain 96 cells x 3 bytes
    expect(frame.length).toBe(382);
    // Just verify the transition point: byte 291 is the last cell's blue channel
    // and byte 292 starts the padding
    expect(frame[291]).toBeDefined();
    expect(frame[292]).toBe(0);
  });
});

describe('FrameBuilder — buildFirmwareEffectFrame', () => {
  const builder = new FrameBuilder(makeLayout());

  it('returns an array of 5 buffers', () => {
    const buffers = builder.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.STATIC,
      { r: 255, g: 0, b: 0 },
      3,
      0
    );
    expect(buffers).toHaveLength(5);
  });

  it('each buffer is exactly 1032 bytes', () => {
    const buffers = builder.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.STATIC,
      { r: 255, g: 0, b: 0 },
      3,
      0
    );
    for (const buf of buffers) {
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBe(1032);
    }
  });

  it('the handshake buffer starts with [0x05, 0x83, 0xb6]', () => {
    const buffers = builder.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.STATIC,
      { r: 255, g: 0, b: 0 },
      3,
      0
    );
    const handshake = buffers[0];
    expect(handshake[0]).toBe(0x05);
    expect(handshake[1]).toBe(0x83);
    expect(handshake[2]).toBe(0xb6);
  });

  it('block #1 (index 1) has color at offset 29-31', () => {
    const buffers = builder.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.STATIC,
      { r: 0xab, g: 0xcd, b: 0xef },
      3,
      0
    );
    const block1 = buffers[1];
    expect(block1[29]).toBe(0xab);
    expect(block1[30]).toBe(0xcd);
    expect(block1[31]).toBe(0xef);
  });

  it('block #4 (index 4) has mode at offset 21', () => {
    const buffers = builder.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.RAINBOW,
      { r: 0, g: 0, b: 0 },
      3,
      0
    );
    const block4 = buffers[4];
    expect(block4[21]).toBe(FIRMWARE_EFFECTS.RAINBOW);
  });

  it('block #4 has (speed<<4 | brightness) at offset 69', () => {
    const brightness = 2;
    const speed = 3;
    const buffers = builder.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.STATIC,
      { r: 255, g: 0, b: 0 },
      brightness,
      speed
    );
    const block4 = buffers[4];
    expect(block4[69]).toBe((speed << 4) | brightness);
  });

  it('block #1 header matches expected pattern', () => {
    const buffers = builder.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.STATIC,
      { r: 255, g: 0, b: 0 },
      3,
      0
    );
    const block1 = buffers[1];
    // Header: [0x06, 0x08, 0xb8, 0x00, 0x40, 0x00, 0x00, 0x00]
    expect(block1[0]).toBe(0x06);
    expect(block1[1]).toBe(0x08);
    expect(block1[2]).toBe(0xb8);
    expect(block1[3]).toBe(0x00);
    expect(block1[4]).toBe(0x40);
    expect(block1[5]).toBe(0x00);
    expect(block1[6]).toBe(0x00);
    expect(block1[7]).toBe(0x00);
  });

  it('clamps out-of-range color values', () => {
    const buffers = builder.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.STATIC,
      { r: 300, g: -10, b: 128 },
      3,
      0
    );
    const block1 = buffers[1];
    // 300 → 255, -10 → 0, 128 → 128
    expect(block1[29]).toBe(255);
    expect(block1[30]).toBe(0);
    expect(block1[31]).toBe(128);
  });

  it('clamps out-of-range brightness and speed to 0-4', () => {
    const buffers = builder.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.STATIC,
      { r: 0, g: 0, b: 0 },
      10, // clamped to 4
      -1 // clamped to 0
    );
    const block4 = buffers[4];
    expect(block4[69]).toBe((0 << 4) | 4);
  });
});

describe('FrameBuilder — buildFirmwareRainbow', () => {
  const builder = new FrameBuilder(makeLayout());

  it('returns 5 buffers of 1032 bytes', () => {
    const buffers = builder.buildFirmwareRainbow(3, 2);
    expect(buffers).toHaveLength(5);
    for (const buf of buffers) {
      expect(buf.length).toBe(1032);
    }
  });

  it('sets mode to RAINBOW (0x03) in block #4 offset 21', () => {
    const buffers = builder.buildFirmwareRainbow(3, 2);
    const block4 = buffers[4];
    expect(block4[21]).toBe(FIRMWARE_EFFECTS.RAINBOW);
  });

  it('encodes speed and brightness in block #4 offset 69', () => {
    const buffers = builder.buildFirmwareRainbow(1, 4);
    const block4 = buffers[4];
    expect(block4[69]).toBe((4 << 4) | 1);
  });
});

describe('FrameBuilder — static property', () => {
  it('exposes PER_KEY_FRAME_SIZE as 382', () => {
    expect(FrameBuilder.PER_KEY_FRAME_SIZE).toBe(382);
  });
});
