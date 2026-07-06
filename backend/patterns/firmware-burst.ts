import type { IDevice } from '../ports/idevice.js';
import { FrameBuilder } from '../protocol.js';
import { FIRMWARE_EFFECTS } from '../protocol.js';
import type { RGBColor } from '../color.js';

/**
 * Template Method — skeleton for sending a firmware effect burst.
 *
 * Subclasses implement {@link buildFrames}; transmission order is fixed.
 * A {@link beforeExecute} hook allows sending a clear/setup frame first.
 */
export abstract class FirmwareBurstOperation {
  constructor(
    protected readonly device: IDevice,
    protected readonly frameBuilder?: FrameBuilder,
  ) {}

  execute(): void {
    this.beforeExecute();
    for (const frame of this.buildFrames()) {
      this.device.sendFeatureReport(frame);
    }
  }

  /**
   * Hook called before the burst. Subclasses can send setup frames
   * (e.g. an all-black per-key frame to clear the keyboard state).
   */
  protected beforeExecute(): void {
    // no-op by default
  }

  /** Send an all-black per-key frame to clear any previous state on the MCU. */
  protected sendClearFrame(): void {
    if (!this.frameBuilder) return;
    const black = { r: 0, g: 0, b: 0 };
    const clear = this.frameBuilder.buildPerKeyFrame(() => black);
    this.device.sendFeatureReport(clear);
  }

  protected abstract buildFrames(): Buffer[];
}

/** Concrete operation — firmware static colour mode. */
export class StaticFirmwareBurst extends FirmwareBurstOperation {
  constructor(
    device: IDevice,
    frameBuilder: FrameBuilder,
    private readonly staticColor: RGBColor,
    private readonly staticBrightness: number,
  ) {
    super(device, frameBuilder);
  }

  protected buildFrames(): Buffer[] {
    return this.frameBuilder!.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.STATIC,
      this.staticColor,
      this.staticBrightness,
      0,
    );
  }
}

/**
 * Generic firmware burst for modes that use the standard
 * (mode + color + brightness + speed) frame layout.
 */
export class GenericFirmwareBurst extends FirmwareBurstOperation {
  constructor(
    device: IDevice,
    frameBuilder: FrameBuilder,
    private readonly mode: number,
    private readonly genColor: RGBColor,
    private readonly genBrightness: number,
    private readonly genSpeed: number,
  ) { super(device, frameBuilder); }

  protected buildFrames(): Buffer[] {
    return this.frameBuilder!.buildFirmwareEffectFrame(this.mode, this.genColor, this.genBrightness, this.genSpeed);
  }
}

/** Concrete operation — firmware rainbow mode. */
export class RainbowFirmwareBurst extends FirmwareBurstOperation {
  constructor(
    device: IDevice,
    frameBuilder: FrameBuilder,
    private readonly rainbowBrightness: number,
    private readonly rainbowSpeed: number,
  ) {
    super(device, frameBuilder);
  }

  protected buildFrames(): Buffer[] {
    return this.frameBuilder!.buildFirmwareRainbow(this.rainbowBrightness, this.rainbowSpeed);
  }
}


