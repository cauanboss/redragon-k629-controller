import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Controller } from '../controller.js';
import {
  EffectDispatcher,
  FirmwareStaticStrategy,
  FirmwareRainbowStrategy,
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
    dispatcher = new EffectDispatcher([
      new FirmwareStaticStrategy(),
      new FirmwareRainbowStrategy(),
    ]);
  });

  it('prefers host-driven static over firmware', () => {
    const hostSpy = vi.spyOn(controller, 'startEffect');
    const fwSpy = vi.spyOn(controller, 'applyFirmwareStatic');

    expect(dispatcher.apply('static', controller, { brightness: 2 })).toBe(true);
    expect(hostSpy).toHaveBeenCalledWith(getEffect('static'), 30);
    expect(fwSpy).not.toHaveBeenCalled();
  });

  it('prefers host-driven rainbow over firmware', () => {
    const hostSpy = vi.spyOn(controller, 'startEffect');
    const fwSpy = vi.spyOn(controller, 'applyFirmwareRainbow');

    expect(dispatcher.apply('rainbow', controller, { brightness: 1, speed: 3 })).toBe(true);
    expect(hostSpy).toHaveBeenCalledWith(getEffect('rainbow'), 30);
    expect(fwSpy).not.toHaveBeenCalled();
  });

  it('applies host-driven wave effect', () => {
    const spy = vi.spyOn(controller, 'startEffect');
    const wave = getEffect('wave');

    expect(wave).toBeDefined();
    expect(dispatcher.apply('wave', controller)).toBe(true);
    expect(spy).toHaveBeenCalledWith(wave, 30);
  });

  it('applies host-driven snake effect', () => {
    const spy = vi.spyOn(controller, 'startEffect');
    const snake = getEffect('snake');

    expect(snake).toBeDefined();
    expect(dispatcher.apply('snake', controller)).toBe(true);
    expect(spy).toHaveBeenCalledWith(snake, 30);
  });

  it('firmware static strategy still works when invoked directly', () => {
    const strategy = new FirmwareStaticStrategy();
    const spy = vi.spyOn(controller, 'applyFirmwareStatic');

    strategy.apply(controller, { brightness: 2 });
    expect(spy).toHaveBeenCalled();
  });

  it('returns false for unknown effects', () => {
    expect(dispatcher.apply('nonexistent', controller)).toBe(false);
  });
});
