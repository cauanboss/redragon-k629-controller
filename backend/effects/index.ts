import { StaticEffect } from './static.js';
import { RainbowEffect } from './rainbow.js';
import { WaveEffect } from './wave.js';
import { TypingReactiveEffect } from './typing-reactive.js';
import { AudioVisualizerEffect } from './audio-visualizer.js';
import { registerEffect } from './registry.js';

export { getEffect, listEffects, registerEffect } from './registry.js';
export {
  EffectDispatcher,
  defaultEffectDispatcher,
  DEFAULT_FIRMWARE_STATIC_COLOR,
  type EffectParams,
  type IEffectStrategy,
  FirmwareStaticStrategy,
  FirmwareRainbowStrategy,
  FirmwareSnakeStrategy,
  FirmwareStarTwinkleStrategy,
  FirmwareSineWaveStrategy,
  FirmwareWaterfallStrategy,
  FirmwareRainbowBlossomStrategy,
  FirmwareWheelStrategy,
} from './dispatcher.js';

// Register built-in host-driven effects
registerEffect(new StaticEffect());
registerEffect(new RainbowEffect());
registerEffect(new WaveEffect());
registerEffect(new TypingReactiveEffect());
registerEffect(new AudioVisualizerEffect());

// Load user plugins
import { loadPlugins } from './plugin-loader.js';
loadPlugins().catch(err => console.warn('[plugin] Plugin loader failed:', err));
