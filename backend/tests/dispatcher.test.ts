import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Controller } from '../controller.js';
import {
  EffectDispatcher,
  DEFAULT_FIRMWARE_STATIC_COLOR,
} from '../effects/dispatcher.js';
import { getEffect } from '../effects/registry.js';
import '../effects/index.js';

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

describe('EffectDispatcher', () => {
  let controller: Controller;
  let dispatcher: EffectDispatcher;

  beforeEach(() => {
    controller = new Controller();
    controller.connect();
    dispatcher = new EffectDispatcher();
  });

  it('applies firmware static strategy', () => {
    const spy = vi.spyOn(controller, 'applyFirmwareStatic');

    expect(dispatcher.apply('static', controller, { brightness: 2 })).toBe(true);
    expect(spy).toHaveBeenCalledWith(DEFAULT_FIRMWARE_STATIC_COLOR, 2);
  });

  it('applies firmware rainbow strategy', () => {
    const spy = vi.spyOn(controller, 'applyFirmwareRainbow');

    expect(dispatcher.apply('rainbow', controller, { brightness: 1, speed: 3 })).toBe(true);
    expect(spy).toHaveBeenCalledWith(1, 3);
  });

  it('applies host-driven wave effect', () => {
    const spy = vi.spyOn(controller, 'startEffect');
    const wave = getEffect('wave');

    expect(wave).toBeDefined();
    expect(dispatcher.apply('wave', controller)).toBe(true);
    expect(spy).toHaveBeenCalledWith(wave, 30);
  });

  it('returns false for unknown effects', () => {
    expect(dispatcher.apply('nonexistent', controller)).toBe(false);
  });
});
