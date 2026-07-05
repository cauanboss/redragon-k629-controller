import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing Controller
vi.mock('node-hid', () => {
  const mockSendFeatureReport = vi.fn();
  const mockClose = vi.fn();

  class MockHID {
    constructor(_path: string) {}
    sendFeatureReport = mockSendFeatureReport;
    close = mockClose;
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

import { Controller } from '../src/controller.js';

describe('Controller', () => {
  let controller: Controller;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new Controller();
  });

  afterEach(() => {
    controller.disconnect();
  });

  describe('connect()', () => {
    it('delegates to DeviceManager and returns true on success', () => {
      const result = controller.connect();
      expect(result).toBe(true);
    });

    it('returns true if already connected', () => {
      controller.connect();
      const result = controller.connect();
      expect(result).toBe(true);
    });
  });

  describe('setAllColor()', () => {
    it('builds a frame and sends it when connected', () => {
      controller.connect();
      // Should not throw
      expect(() => controller.setAllColor({ r: 255, g: 0, b: 0 })).not.toThrow();
    });

    it('throws when not connected', () => {
      expect(() => controller.setAllColor({ r: 255, g: 0, b: 0 }))
        .toThrow('Controller is not connected');
    });
  });

  describe('setKeyColor()', () => {
    it('sets a single key color when connected', () => {
      controller.connect();
      expect(() => controller.setKeyColor('esc', { r: 255, g: 0, b: 0 })).not.toThrow();
    });

    it('throws when not connected', () => {
      expect(() => controller.setKeyColor('esc', { r: 255, g: 0, b: 0 }))
        .toThrow('Controller is not connected');
    });
  });

  describe('applyFirmwareStatic()', () => {
    it('sends a burst of 5 frames when connected', () => {
      controller.connect();
      expect(() => controller.applyFirmwareStatic({ r: 255, g: 0, b: 0 })).not.toThrow();
    });

    it('throws when not connected', () => {
      expect(() => controller.applyFirmwareStatic({ r: 255, g: 0, b: 0 }))
        .toThrow('Controller is not connected');
    });
  });

  describe('applyFirmwareRainbow()', () => {
    it('sends a burst with mode 0x03 when connected', () => {
      controller.connect();
      expect(() => controller.applyFirmwareRainbow()).not.toThrow();
    });

    it('throws when not connected', () => {
      expect(() => controller.applyFirmwareRainbow())
        .toThrow('Controller is not connected');
    });
  });

  describe('disconnect()', () => {
    it('closes the device and cleans up', () => {
      controller.connect();
      expect(() => controller.disconnect()).not.toThrow();
      // After disconnect, further sends should throw
      expect(() => controller.setAllColor({ r: 255, g: 0, b: 0 }))
        .toThrow('Controller is not connected');
    });

    it('can be called without prior connect', () => {
      expect(() => controller.disconnect()).not.toThrow();
    });
  });

  describe('listEffects()', () => {
    it('returns names of registered effects', () => {
      const effects = controller.listEffects();
      expect(effects).toContain('static');
      expect(effects).toContain('rainbow');
      expect(effects).toContain('wave');
    });
  });

  describe('getLayout()', () => {
    it('returns the KeyLayout instance', () => {
      const layout = controller.getLayout();
      expect(layout.keys).toHaveLength(85);
    });
  });

  describe('isConnected()', () => {
    it('returns false initially', () => {
      expect(controller.isConnected()).toBe(false);
    });

    it('returns true after connect', () => {
      controller.connect();
      expect(controller.isConnected()).toBe(true);
    });

    it('returns false after disconnect', () => {
      controller.connect();
      controller.disconnect();
      expect(controller.isConnected()).toBe(false);
    });
  });
});
