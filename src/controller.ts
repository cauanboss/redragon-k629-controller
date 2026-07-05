import { DeviceManager } from './device.js';
import { FrameBuilder, FIRMWARE_EFFECTS } from './protocol.js';
import { KeyLayout } from './layout.js';
import type { IEffect } from './effect.js';
import type { RGBColor } from './color.js';
import { EffectRunner } from './runner.js';
import { listEffects } from './effects/index.js';

/**
 * Controller — Facade that orchestrates device communication, frame
 * construction, layout queries, and effect lifecycle.
 *
 * DIP: depends on abstractions where possible. In the MVP the concrete
 * implementations are instantiated internally.
 */
export class Controller {
  private deviceManager: DeviceManager;
  private frameBuilder: FrameBuilder;
  private layout: KeyLayout;
  private runner: EffectRunner;
  private currentEffect: IEffect | null = null;

  constructor() {
    this.deviceManager = new DeviceManager();
    this.layout = new KeyLayout();
    this.frameBuilder = new FrameBuilder(this.layout);
    this.runner = new EffectRunner(this);
  }

  // ---------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------

  /**
   * Finds and opens the keyboard device.
   * @returns true when the device was opened successfully
   */
  connect(): boolean {
    if (this.isConnected()) return true;

    const found = this.deviceManager.find();
    if (!found) return false;

    try {
      this.deviceManager.open();
      return true;
    } catch {
      return false;
    }
  }

  /** Closes the device connection and stops any running effect. */
  disconnect(): void {
    this.stopEffect();
    this.deviceManager.close();
  }

  /** Returns true when the HID device is open. */
  isConnected(): boolean {
    return this.deviceManager.isConnected();
  }

  // ---------------------------------------------------------------
  // Per-key colour control
  // ---------------------------------------------------------------

  /**
   * Builds and sends a per-key frame where each key's colour is
   * determined by `colorFn(keyId)`.
   *
   * Keys not present in the physical layout always receive black.
   *
   * @throws if the controller is not connected
   */
  applyColorMap(colorFn: (keyId: string) => RGBColor): void {
    this.ensureConnected();

    const frame = this.frameBuilder.buildPerKeyFrame(
      (key) => colorFn(key.id),
    );

    this.deviceManager.sendFeatureReport(frame);
  }

  /**
   * Sets every physical key to the same colour.
   * @throws if the controller is not connected
   */
  setAllColor(color: RGBColor): void {
    this.applyColorMap(() => color);
  }

  /**
   * Sets multiple keys to their respective colours in a single frame.
   * Keys not provided receive black.
   */
  applyColors(colorMap: Record<string, RGBColor>): void {
    this.applyColorMap((id) => {
      const c = colorMap[id];
      return c ? c : { r: 0, g: 0, b: 0 };
    });
  }

  /**
   * Sets a single key to the given colour. All other keys are set to
   * black (off).
   */
  setKeyColor(keyId: string, color: RGBColor): void {
    this.applyColors({ [keyId]: color });
  }

  // ---------------------------------------------------------------
  // Firmware-side effects (MCU processes independently)
  // ---------------------------------------------------------------

  /**
   * Activates the firmware static colour mode.
   *
   * @param color       base colour
   * @param brightness  0-4 (default 3)
   */
  applyFirmwareStatic(color: RGBColor, brightness = 3): void {
    this.ensureConnected();

    const buffers = this.frameBuilder.buildFirmwareEffectFrame(
      FIRMWARE_EFFECTS.STATIC,
      color,
      brightness,
      0, // speed is irrelevant for static
    );

    for (const buf of buffers) {
      this.deviceManager.sendFeatureReport(buf);
    }
  }

  /**
   * Activates the firmware rainbow mode.
   *
   * @param brightness  0-4 (default 3)
   * @param speed       0-4 (default 2)
   */
  applyFirmwareRainbow(brightness = 3, speed = 2): void {
    this.ensureConnected();

    const buffers = this.frameBuilder.buildFirmwareRainbow(brightness, speed);

    for (const buf of buffers) {
      this.deviceManager.sendFeatureReport(buf);
    }
  }

  // ---------------------------------------------------------------
  // Host-driven effects (streaming animation)
  // ---------------------------------------------------------------

  /**
   * Starts a host-driven effect loop.  The controller renders frames
   * continuously at the given frame rate until `stopEffect()` is called
   * or a send error occurs.
   */
  startEffect(effect: IEffect, fps = 30): void {
    this.currentEffect = effect;
    this.runner.start(effect, fps);
  }

  /** Stops the current host-driven effect loop. */
  stopEffect(): void {
    this.runner.stop();
    this.currentEffect = null;
  }

  // ---------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------

  /** Returns the TKL key layout. */
  getLayout(): KeyLayout {
    return this.layout;
  }

  /** Returns the names of all registered effects. */
  listEffects(): string[] {
    return listEffects();
  }

  // ---------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error(
        'Controller is not connected to the keyboard. Call connect() first.',
      );
    }
  }
}
