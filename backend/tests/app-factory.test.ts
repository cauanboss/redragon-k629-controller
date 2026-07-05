import { describe, it, expect, vi } from 'vitest';
import { createApplication } from '../factory/app-factory.js';
import type { IDevice } from '../ports/idevice.js';

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

describe('AppFactory', () => {
  it('creates a wired application with controller and server', () => {
    const app = createApplication({ port: 19001, host: '127.0.0.1' });

    expect(app.controller).toBeDefined();
    expect(app.server).toBeDefined();
    expect(app.connect()).toBe(true);
  });

  it('injects a custom device via config', () => {
    const device: IDevice = {
      find: vi.fn(() => true),
      open: vi.fn(),
      close: vi.fn(),
      isConnected: vi.fn(() => false),
      sendFeatureReport: vi.fn(),
    };

    const app = createApplication({
      controller: { device },
    });

    app.connect();

    expect(device.find).toHaveBeenCalled();
    expect(device.open).toHaveBeenCalled();
  });

  it('stop() disconnects controller and shuts down server', () => {
    const app = createApplication({ port: 19002, host: '127.0.0.1' });
    app.connect();

    expect(() => app.stop()).not.toThrow();
    expect(app.controller.isConnected()).toBe(false);
  });
});
