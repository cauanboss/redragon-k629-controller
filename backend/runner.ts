import { Controller } from './controller.js';
import type { IEffect } from './effect.js';
import { hasLifecycle } from './effect.js';

/**
 * EffectRunner — continuous frame loop for host-driven (per-key
 * streaming) effects.
 *
 * On each tick the runner calls `effect.getColorAt()` for every key
 * in the layout and pushes the resulting colour map to the controller.
 */
export class EffectRunner {
  private controller: Controller;
  private effect: IEffect | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step: number = 0;
  private fps: number = 30;

  constructor(controller: Controller) {
    this.controller = controller;
  }

  // ---------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------

  /**
   * Starts the effect loop.
   *
   * If a previous loop is running it is stopped first (singleton
   * behaviour).
   *
   * @param effect  the effect to render
   * @param fps     target frame rate (clamped to ≥ 1)
   */
  start(effect: IEffect, fps = 30): void {
    this.stop(); // clean up any previous run

    this.effect = effect;
    this.fps = Math.max(1, fps);
    this.step = 0;

    if (hasLifecycle(effect)) {
      effect.onStart();
    }

    const intervalMs = Math.round(1000 / this.fps);
    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  /**
   * Stops the current effect loop and resets internal state.
   * Safe to call when no loop is active.
   */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.effect !== null && hasLifecycle(this.effect)) {
      this.effect.onStop();
    }

    this.effect = null;
    this.step = 0;
  }

  /** Returns true while the effect loop is active. */
  isRunning(): boolean {
    return this.timer !== null;
  }

  // ---------------------------------------------------------------
  // Runtime control
  // ---------------------------------------------------------------

  /**
   * Changes the frame rate of the running effect.
   * If no effect is running the value is stored for the next
   * `start()` call.
   */
  setFps(fps: number): void {
    this.fps = Math.max(1, fps);

    if (this.isRunning() && this.effect) {
      // Restart with the new interval
      const currentEffect = this.effect;
      this.start(currentEffect, fps);
    }
  }

  // ---------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------

  /**
   * Single animation tick: compute the colour for every physical key
   * and send the frame to the device.
   *
   * Errors (e.g. device disconnected) are caught and cause an
   * automatic stop to prevent unhandled promise rejections or
   * infinite error loops.
   */
  private tick(): void {
    if (!this.effect) return;

    try {
      const time = Date.now();
      const layout = this.controller.getLayout();

      this.controller.applyColorMap((keyId: string) => {
        const key = layout.getKeyById(keyId);
        // The FrameBuilder already skips null matrix cells, so this
        // guard is mostly for type safety.
        if (!key) return { r: 0, g: 0, b: 0 };
        return this.effect!.getColorAt(key, this.step, time);
      });

      this.step++;
    } catch {
      // Sending the frame may fail if the device was disconnected.
      // Gracefully stop instead of flooding the console.
      this.stop();
    }
  }
}
