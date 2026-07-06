import { describe, it, expect, vi } from 'vitest';
import {
  StaticFirmwareBurst,
  RainbowFirmwareBurst,
  GenericFirmwareBurst,
} from '../patterns/firmware-burst.js';
import { FrameBuilder, FIRMWARE_EFFECTS } from '../protocol.js';
import { KeyLayout } from '../layout.js';
import type { IDevice } from '../ports/idevice.js';

describe('FirmwareBurstOperation (Template Method)', () => {
  const layout = new KeyLayout();
  const frameBuilder = new FrameBuilder(layout);

  function createDevice(): IDevice {
    return {
      find: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
      isConnected: vi.fn(() => true),
      sendFeatureReport: vi.fn(),
    };
  }

  it('StaticFirmwareBurst sends 5 firmware burst frames', () => {
    const device = createDevice();
    const operation = new StaticFirmwareBurst(device, frameBuilder, { r: 255, g: 0, b: 0 }, 3);

    operation.execute();

    const send = device.sendFeatureReport as ReturnType<typeof vi.fn>;
    // 5 firmware burst frames (handshake + 4 blocks), no clear frame
    expect(send).toHaveBeenCalledTimes(5);
    // All frames should be 1032 bytes (firmware burst)
    for (let i = 0; i < 5; i++) {
      const buf = send.mock.calls[i][0] as Buffer;
      expect(buf.length).toBe(1032);
    }
  });

  it('RainbowFirmwareBurst sends 5 firmware burst frames', () => {
    const device = createDevice();
    const operation = new RainbowFirmwareBurst(device, frameBuilder, 2, 1);

    operation.execute();

    const send = device.sendFeatureReport as ReturnType<typeof vi.fn>;
    expect(send).toHaveBeenCalledTimes(5);
    for (let i = 0; i < 5; i++) {
      const buf = send.mock.calls[i][0] as Buffer;
      expect(buf.length).toBe(1032);
    }
  });

  it('GenericFirmwareBurst sends 5 firmware burst frames', () => {
    const device = createDevice();
    const operation = new GenericFirmwareBurst(
      device,
      frameBuilder,
      FIRMWARE_EFFECTS.SNAKE,
      { r: 255, g: 100, b: 0 },
      3,
      2
    );

    operation.execute();

    const send = device.sendFeatureReport as ReturnType<typeof vi.fn>;
    expect(send).toHaveBeenCalledTimes(5);
    for (let i = 0; i < 5; i++) {
      const buf = send.mock.calls[i][0] as Buffer;
      expect(buf.length).toBe(1032);
    }
  });
});
