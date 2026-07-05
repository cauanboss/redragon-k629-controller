import type { Controller } from '../controller.js';
import type { RGBColor } from '../color.js';
import { getEffect } from './registry.js';
import { FIRMWARE_EFFECTS } from '../protocol.js';

/** Parameters passed when applying an effect. */
export interface EffectParams {
  brightness?: number;
  speed?: number;
  color?: RGBColor;
  fps?: number;
}

/**
 * Strategy — applies a single category of effect to the controller.
 *
 * Firmware strategies handle MCU-side modes; host strategies are
 * registered separately via the effect registry.
 */
export interface IEffectStrategy {
  readonly name: string;
  matches(effectName: string): boolean;
  apply(controller: Controller, params: EffectParams): void;
}

/** Default warm-orange used when firmware static has no colour. */
export const DEFAULT_FIRMWARE_STATIC_COLOR: RGBColor = { r: 255, g: 100, b: 0 };

/** Strategy — firmware static colour mode. */
export class FirmwareStaticStrategy implements IEffectStrategy {
  readonly name = 'static';

  matches(effectName: string): boolean {
    return effectName === 'static';
  }

  apply(controller: Controller, params: EffectParams): void {
    controller.applyFirmwareStatic(
      params.color ?? DEFAULT_FIRMWARE_STATIC_COLOR,
      params.brightness ?? 3,
    );
  }
}

/** Strategy — firmware rainbow mode. */
export class FirmwareRainbowStrategy implements IEffectStrategy {
  readonly name = 'rainbow';

  matches(effectName: string): boolean {
    return effectName === 'rainbow';
  }

  apply(controller: Controller, params: EffectParams): void {
    controller.applyFirmwareRainbow(
      params.brightness ?? 3,
      params.speed ?? 2,
    );
  }
}

/** Default colour for firmware effects that accept one. */
const DEFAULT_EFFECT_COLOR: RGBColor = { r: 255, g: 120, b: 40 }; // warm orange

/** Helper — builds the colour to pass to a firmware burst.
 *  Uses the caller-supplied colour, or the default. Black is treated
 *  as "use default" so effects don't accidentally render dark. */
function resolveColor(params: EffectParams): RGBColor {
  const c = params.color;
  if (c && (c.r > 0 || c.g > 0 || c.b > 0)) return c;
  return DEFAULT_EFFECT_COLOR;
}

/** Strategy — firmware snake effect. */
export class FirmwareSnakeStrategy implements IEffectStrategy {
  readonly name = 'snake';

  matches(effectName: string): boolean {
    return effectName === 'snake';
  }

  apply(controller: Controller, params: EffectParams): void {
    controller.applyFirmwareEffect(
      FIRMWARE_EFFECTS.SNAKE,
      resolveColor(params),
      params.brightness ?? 3,
      params.speed ?? 2,
    );
  }
}

/** Strategy — firmware star-twinkle effect. */
export class FirmwareStarTwinkleStrategy implements IEffectStrategy {
  readonly name = 'star-twinkle';

  matches(effectName: string): boolean {
    return effectName === 'star-twinkle';
  }

  apply(controller: Controller, params: EffectParams): void {
    controller.applyFirmwareEffect(
      FIRMWARE_EFFECTS.STAR_TWINKLE,
      resolveColor(params),
      params.brightness ?? 3,
      params.speed ?? 2,
    );
  }
}

/** Strategy — firmware sine-wave effect. */
export class FirmwareSineWaveStrategy implements IEffectStrategy {
  readonly name = 'sine-wave';

  matches(effectName: string): boolean {
    return effectName === 'sine-wave';
  }

  apply(controller: Controller, params: EffectParams): void {
    controller.applyFirmwareEffect(
      FIRMWARE_EFFECTS.SINE_WAVE,
      resolveColor(params),
      params.brightness ?? 3,
      params.speed ?? 2,
    );
  }
}

/** Strategy — firmware waterfall effect. */
export class FirmwareWaterfallStrategy implements IEffectStrategy {
  readonly name = 'waterfall';

  matches(effectName: string): boolean {
    return effectName === 'waterfall';
  }

  apply(controller: Controller, params: EffectParams): void {
    controller.applyFirmwareEffect(
      FIRMWARE_EFFECTS.WATERFALL,
      resolveColor(params),
      params.brightness ?? 3,
      params.speed ?? 2,
    );
  }
}

/** Strategy — firmware rainbow-blossom effect. */
export class FirmwareRainbowBlossomStrategy implements IEffectStrategy {
  readonly name = 'rainbow-blossom';

  matches(effectName: string): boolean {
    return effectName === 'rainbow-blossom';
  }

  apply(controller: Controller, params: EffectParams): void {
    controller.applyFirmwareEffect(
      FIRMWARE_EFFECTS.RAINBOW_BLOSSOM,
      resolveColor(params),
      params.brightness ?? 3,
      params.speed ?? 2,
    );
  }
}

/** Strategy — firmware wheel effect. */
export class FirmwareWheelStrategy implements IEffectStrategy {
  readonly name = 'wheel';

  matches(effectName: string): boolean {
    return effectName === 'wheel';
  }

  apply(controller: Controller, params: EffectParams): void {
    controller.applyFirmwareEffect(
      FIRMWARE_EFFECTS.WHEEL,
      resolveColor(params),
      params.brightness ?? 3,
      params.speed ?? 2,
    );
  }
}

/**
 * Dispatcher — selects the correct Strategy or host-driven effect.
 *
 * Order: firmware strategies first, then registered host effects.
 */
export class EffectDispatcher {
  private readonly strategies: IEffectStrategy[];

  constructor(strategies: IEffectStrategy[] = [
    new FirmwareStaticStrategy(),
    new FirmwareRainbowStrategy(),
    new FirmwareSnakeStrategy(),
    new FirmwareStarTwinkleStrategy(),
    new FirmwareSineWaveStrategy(),
    new FirmwareWaterfallStrategy(),
    new FirmwareRainbowBlossomStrategy(),
    new FirmwareWheelStrategy(),
  ]) {
    this.strategies = strategies;
  }

  /**
   * Applies the named effect.
   * @returns true when the effect was found and applied
   */
  apply(
    effectName: string,
    controller: Controller,
    params: EffectParams = {},
  ): boolean {
    // Stop any running host-driven effect before applying a new one.
    // This ensures clean transitions between firmware <-> host effects.
    controller.stopEffect();

    for (const strategy of this.strategies) {
      if (strategy.matches(effectName)) {
        strategy.apply(controller, params);
        return true;
      }
    }

    return this.applyHostEffect(effectName, controller, params);
  }

  private applyHostEffect(
    effectName: string,
    controller: Controller,
    params: EffectParams,
  ): boolean {
    const effect = getEffect(effectName);

    if (!effect) {
      return false;
    }

    controller.startEffect(effect, params.fps ?? 30);
    return true;
  }
}

/** Default dispatcher with built-in firmware strategies. */
export const defaultEffectDispatcher = new EffectDispatcher();
