import type { RGBColor } from './color.js';
import { clampByte, clampNibble } from './color.js';
import type { KeyInfo } from './layout.js';
import { KeyLayout } from './layout.js';

/** Default RGB for non-existent matrix cells (all LEDs off) */
const NULL_COLOR: RGBColor = { r: 0, g: 0, b: 0 };

/**
 * Mapping from a key identifier to a colour.
 * Used by FrameBuilder.buildPerKeyFrame().
 */
export type ColorMap = Map<string, RGBColor>;

/**
 * Callback that receives every key and returns the colour it should have.
 * Return `{r:0, g:0, b:0}` for keys that should be off.
 */
export type ColorFn = (key: KeyInfo) => RGBColor;

// ---------------------------------------------------------------------------
// Sinowealth firmware effect IDs (effectMode byte)
// ---------------------------------------------------------------------------
export const FIRMWARE_EFFECTS = {
  STATIC: 0x01,
  RAINBOW: 0x03,
  SNAKE: 0x0a,
  SINE_WAVE: 0x0d,
  STAR_TWINKLE: 0x08,
  RAINBOW_BLOSSOM: 0x11,
  WATERFALL: 0x10,
  WHEEL: 0x06,
} as const;

// ---------------------------------------------------------------------------
// Per-key direct control frame (382 bytes)
// ---------------------------------------------------------------------------
const PER_KEY_HEADER = [0x08, 0x0a, 0x7a, 0x01];
const PER_KEY_FRAME_SIZE = 382;
const MATRIX_ROWS = 16;
const MATRIX_COLS = 6;

// ---------------------------------------------------------------------------
// Firmware effect burst (5 × 1032 bytes)
// ---------------------------------------------------------------------------
const FW_BURST_SIZE = 1032;

const FW_HANDSHAKE = [0x05, 0x83, 0xb6, 0x00, 0x00, 0x00];

interface FwBlockDef {
  readonly header: readonly number[];
  readonly colorOffset?: number; // byte offset for R,G,B (if applicable)
  readonly modeOffset?: number; // byte offset for effectMode (block #4)
  readonly configOffset?: number; // byte offset for speed|brightness (block #4)
}

const FW_BLOCKS: readonly FwBlockDef[] = [
  // Block #1 – colour payload
  {
    header: [0x06, 0x08, 0xb8, 0x00, 0x40, 0x00, 0x00, 0x00],
    colorOffset: 29,
  },
  // Block #2 – colour payload
  {
    header: [0x06, 0x09, 0xbc, 0x00, 0x40, 0x00, 0x00, 0x00],
  },
  // Block #3 – colour payload
  {
    header: [0x06, 0x09, 0xc0, 0x00, 0x40, 0x00, 0x00, 0x00],
  },
  // Block #4 – effect configuration
  {
    header: [0x06, 0x03, 0xb6, 0x00, 0x00, 0x00, 0x00, 0x00],
    modeOffset: 21,
    configOffset: 69,
  },
];

// ---------------------------------------------------------------------------
// FrameBuilder
// ---------------------------------------------------------------------------

export class FrameBuilder {
  static readonly PER_KEY_FRAME_SIZE = PER_KEY_FRAME_SIZE;

  constructor(private readonly layout: KeyLayout) {}

  // ---------------------------------------------------------------
  // Per-key direct control
  // ---------------------------------------------------------------

  /**
   * Builds a 382-byte per-key frame.
   *
   * Layout:
   *   bytes 0-3:    0x08 0x0A 0x7A 0x01  (header)
   *   bytes 4-291:  96 cells × 3 bytes (R,G,B) — row-major (16×6)
   *   bytes 292-381: zero padding (90 bytes)
   *
   * Matrix cells that have no physical key (null positions) always
   * receive 0x00 0x00 0x00.
   *
   * @param colorMap  Map<keyId, RGBColor> or a callback invoked per key.
   */
  buildPerKeyFrame(colorMap: ColorMap | ColorFn): Buffer {
    const buf = Buffer.alloc(PER_KEY_FRAME_SIZE, 0);

    // Write header
    for (let i = 0; i < PER_KEY_HEADER.length; i++) {
      buf.writeUInt8(PER_KEY_HEADER[i], i);
    }

    // Write per-cell colour data (row-major)
    let offset = PER_KEY_HEADER.length; // starts at byte 4

    for (let row = 0; row < MATRIX_ROWS; row++) {
      for (let col = 0; col < MATRIX_COLS; col++) {
        const key = this.layout.getKey(row, col);
        let color: RGBColor;

        if (key === null) {
          // No physical key → always LED off
          color = NULL_COLOR;
        } else if (colorMap instanceof Map) {
          color = colorMap.get(key.id) ?? NULL_COLOR;
        } else {
          color = colorMap(key);
        }

        buf.writeUInt8(clampByte(color.r), offset);
        buf.writeUInt8(clampByte(color.g), offset + 1);
        buf.writeUInt8(clampByte(color.b), offset + 2);
        offset += 3;
      }
    }

    // Bytes 292-381 are already zero from Buffer.alloc

    return buf;
  }

  // ---------------------------------------------------------------
  // Firmware burst effects (static / rainbow / snake / wave …)
  // ---------------------------------------------------------------

  /**
   * Builds a 5-buffer burst for a firmware-side effect with a static
   * colour (applicable to modes that accept one, e.g. STATIC).
   *
   * The returned array always contains 5 buffers of exactly 1032 bytes:
   *   [handshake, block1, block2, block3, block4]
   *
   * @param effectMode  one of `FIRMWARE_EFFECTS.*`
   * @param color       base colour for modes that use it
   * @param brightness  0-4
   * @param speed       0-4
   */
  buildFirmwareEffectFrame(
    effectMode: number,
    color: RGBColor,
    brightness: number,
    speed: number
  ): Buffer[] {
    const safeColor = {
      r: clampByte(color.r),
      g: clampByte(color.g),
      b: clampByte(color.b),
    };
    const safeBrightness = clampNibble(brightness);
    const safeSpeed = clampNibble(speed);

    const handshake = Buffer.alloc(FW_BURST_SIZE, 0);
    for (let i = 0; i < FW_HANDSHAKE.length; i++) {
      handshake.writeUInt8(FW_HANDSHAKE[i], i);
    }

    const blocks: Buffer[] = [handshake];

    for (let i = 0; i < FW_BLOCKS.length; i++) {
      blocks.push(
        this.buildFwBlock(FW_BLOCKS[i], effectMode, safeColor, safeBrightness, safeSpeed)
      );
    }

    return blocks;
  }

  /**
   * Convenience: builds a 5-buffer burst for the built-in rainbow effect.
   * Colour is irrelevant in rainbow mode (the firmware generates its own
   * colours), so it is set to black.
   */
  buildFirmwareRainbow(brightness: number, speed: number): Buffer[] {
    return this.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.RAINBOW,
      { r: 0, g: 0, b: 0 },
      brightness,
      speed
    );
  }

  // ---------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------

  private buildFwBlock(
    def: FwBlockDef,
    effectMode: number,
    color: RGBColor,
    brightness: number,
    speed: number
  ): Buffer {
    const buf = Buffer.alloc(FW_BURST_SIZE, 0);

    // Write header
    for (let i = 0; i < def.header.length; i++) {
      buf.writeUInt8(def.header[i], i);
    }

    // Write colour at designated offset (block #1 typically)
    if (def.colorOffset !== undefined) {
      buf.writeUInt8(color.r, def.colorOffset);
      buf.writeUInt8(color.g, def.colorOffset + 1);
      buf.writeUInt8(color.b, def.colorOffset + 2);
    }

    // Write effect mode (block #4)
    if (def.modeOffset !== undefined) {
      buf.writeUInt8(effectMode, def.modeOffset);
    }

    // Write speed|brightness nibbles (block #4)
    // High nibble = speed, low nibble = brightness
    if (def.configOffset !== undefined) {
      buf.writeUInt8((speed << 4) | brightness, def.configOffset);
    }

    return buf;
  }
}

// ---------------------------------------------------------------------------
// Value helpers — see color.ts
// ---------------------------------------------------------------------------
