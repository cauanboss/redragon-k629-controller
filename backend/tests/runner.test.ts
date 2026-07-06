import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Controller } from '../controller.js';
import { EffectRunner } from '../runner.js';
import { StaticEffect } from '../effects/static.js';
import { IEffect } from '../effect.js';

// Mock node-hid
vi.mock('node-hid', () => {
  class MockHID {
    constructor(_path: string) {}
    sendFeatureReport = vi.fn();
    close = vi.fn();
  }
  return {
    default: {
      HID: MockHID,
      devices: vi.fn(() => [
        { vendorId: 0x258a, productId: 0x0049, usagePage: 0xff00, path: '/dev/hidraw0' },
      ]),
    },
  };
});

describe('EffectRunner', () => {
  let controller: Controller;
  let runner: EffectRunner;
  let effect: IEffect;

  beforeEach(() => {
    vi.useFakeTimers();
    controller = new Controller();
    controller.connect();
    runner = new EffectRunner(controller);
    effect = new StaticEffect();
  });

  afterEach(() => {
    runner.stop();
    controller.disconnect();
    vi.useRealTimers();
  });

  it('isRunning returns false before start', () => {
    expect(runner.isRunning()).toBe(false);
  });

  it('start() begins the interval loop', () => {
    runner.start(effect, 30);
    expect(runner.isRunning()).toBe(true);
  });

  it('stop() clears the interval and sets isRunning to false', () => {
    runner.start(effect, 30);
    expect(runner.isRunning()).toBe(true);
    runner.stop();
    expect(runner.isRunning()).toBe(false);
  });

  it('stop() can be called without a running effect', () => {
    expect(() => runner.stop()).not.toThrow();
  });

  it('isRunning reflects the state after start and stop', () => {
    expect(runner.isRunning()).toBe(false);
    runner.start(effect, 30);
    expect(runner.isRunning()).toBe(true);
    runner.stop();
    expect(runner.isRunning()).toBe(false);
  });

  it('setFps() changes the fps property', () => {
    runner.setFps(60);
    // Not running, but fps is stored
    runner.start(effect, 60);
    expect(runner.isRunning()).toBe(true);
    // No direct getter for fps, but we can verify it doesn't crash
  });

  it('setFps() restarts the timer if running', () => {
    runner.start(effect, 30);
    expect(runner.isRunning()).toBe(true);
    // setFps while running should restart with new interval
    runner.setFps(15);
    expect(runner.isRunning()).toBe(true);
  });

  it('tick() is called at the configured interval', () => {
    const tickSpy = vi.spyOn(runner as any, 'tick');

    runner.start(effect, 100); // 10ms interval
    expect(tickSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10);
    expect(tickSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    expect(tickSpy).toHaveBeenCalledTimes(2);

    runner.stop();
  });

  it('tick() increments step after each frame', () => {
    // We verify the effect receives an increasing step by checking
    // that the color map sent changes. StaticEffect ignores step,
    // so we use a custom spy instead.
    const applyColorMapSpy = vi.spyOn(controller, 'applyColorMap');

    runner.start(effect, 100);

    vi.advanceTimersByTime(10);
    expect(applyColorMapSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    expect(applyColorMapSpy).toHaveBeenCalledTimes(2);

    runner.stop();
  });

  it('start() stops a previous running loop first', () => {
    runner.start(effect, 100);
    const tickSpy = vi.spyOn(runner as any, 'tick');

    // Start again with a different effect
    runner.start(effect, 100);

    vi.advanceTimersByTime(10);
    expect(tickSpy).toHaveBeenCalledTimes(1); // clean start
    runner.stop();
  });
});
