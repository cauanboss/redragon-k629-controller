import { DeviceManager } from './device.js';
import { FrameBuilder } from './protocol.js';
import { KeyLayout } from './layout.js';
import type { IEffect } from './effect.js';
import type { RGBColor } from './color.js';
import type { IDevice } from './ports/idevice.js';
import { EffectRunner } from './runner.js';
import { listEffects } from './effects/index.js';
import {
  StaticFirmwareBurst,
  RainbowFirmwareBurst,
} from './patterns/firmware-burst.js';

export interface ControllerDependencies {
  device?: IDevice;
  layout?: KeyLayout;
}

/**
 * Controller — Facade that orchestrates device communication, frame
 * construction, layout queries, and effect lifecycle.
 *
 * DIP: depends on {@link IDevice} and injectable collaborators.
 */
export class Controller {
  private deviceManager: IDevice;
  private frameBuilder: FrameBuilder;
  private layout: KeyLayout;
  private runner: EffectRunner;
  private currentEffect: IEffect | null = null;

  constructor(deps: ControllerDependencies = {}) {
    this.deviceManager = deps.device ?? new DeviceManager();
    this.layout = deps.layout ?? new KeyLayout();
    this.frameBuilder = new FrameBuilder(this.layout);
    this.runner = new EffectRunner(this);
  }

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

  disconnect(): void {
    this.stopEffect();
    this.deviceManager.close();
  }

  isConnected(): boolean {
    return this.deviceManager.isConnected();
  }

  applyColorMap(colorFn: (keyId: string) => RGBColor): void {
    this.ensureConnected();

    const frame = this.frameBuilder.buildPerKeyFrame(
      (key) => colorFn(key.id),
    );

    this.deviceManager.sendFeatureReport(frame);
  }

  setAllColor(color: RGBColor): void {
    this.applyColorMap(() => color);
  }

  applyColors(colorMap: Record<string, RGBColor>): void {
    this.applyColorMap((id) => {
      const c = colorMap[id];
      return c ? c : { r: 0, g: 0, b: 0 };
    });
  }

  setKeyColor(keyId: string, color: RGBColor): void {
    this.applyColors({ [keyId]: color });
  }

  applyFirmwareEffect(mode: number, color: RGBColor, brightness: number, speed: number): void {
    this.ensureConnected();
    // Clear any previous per-key state by sending a black frame first.
    // This ensures the MCU is listening for a new firmware burst.
    const clearFrame = this.frameBuilder.buildPerKeyFrame(() => ({ r: 0, g: 0, b: 0 }));
    this.deviceManager.sendFeatureReport(clearFrame);
    // Small delay to let the MCU process the clear frame before the burst.
    const frames = this.frameBuilder.buildFirmwareEffectFrame(mode, color, brightness, speed);
    for (const frame of frames) {
      this.deviceManager.sendFeatureReport(frame);
    }
  }

  applyFirmwareStatic(color: RGBColor, brightness = 3): void {
    this.ensureConnected();
    new StaticFirmwareBurst(
      this.deviceManager,
      this.frameBuilder,
      color,
      brightness,
    ).execute();
  }

  applyFirmwareRainbow(brightness = 3, speed = 2): void {
    this.ensureConnected();
    new RainbowFirmwareBurst(
      this.deviceManager,
      this.frameBuilder,
      brightness,
      speed,
    ).execute();
  }

  startEffect(effect: IEffect, fps = 30): void {
    this.currentEffect = effect;
    this.runner.start(effect, fps);
  }

  stopEffect(): void {
    this.runner.stop();
    this.currentEffect = null;
  }

  getLayout(): KeyLayout {
    return this.layout;
  }

  listEffects(): string[] {
    return listEffects();
  }

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error(
        'Controller is not connected to the keyboard. Call connect() first.',
      );
    }
  }
}
