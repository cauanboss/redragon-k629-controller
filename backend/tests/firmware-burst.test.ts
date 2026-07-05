import { describe, it, expect, vi } from 'vitest';
import { StaticFirmwareBurst, RainbowFirmwareBurst, GenericFirmwareBurst } from '../patterns/firmware-burst.js';
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

  it('StaticFirmwareBurst sends clear frame + 5 burst frames = 6 total', () => {
    const device = createDevice();
    const operation = new StaticFirmwareBurst(
      device,
      frameBuilder,
      { r: 255, g: 0, b: 0 },
      3,
    );

    operation.execute();

    const send = device.sendFeatureReport as ReturnType<typeof vi.fn>;
    // 1 clear per-key frame (all black) + 5 firmware burst frames
    expect(send).toHaveBeenCalledTimes(6);
    // First frame should be 382 bytes (per-key), rest 1032 (firmware burst)
    const firstBuf = send.mock.calls[0][0] as Buffer;
    expect(firstBuf.length).toBe(382);
  });

  it('RainbowFirmwareBurst sends clear frame + 5 burst frames = 6 total', () => {
    const device = createDevice();
    const operation = new RainbowFirmwareBurst(device, frameBuilder, 2, 1);

    operation.execute();

    const send = device.sendFeatureReport as ReturnType<typeof vi.fn>;
    expect(send).toHaveBeenCalledTimes(6);
    const firstBuf = send.mock.calls[0][0] as Buffer;
    expect(firstBuf.length).toBe(382);
  });

  it('GenericFirmwareBurst sends clear frame + 5 burst frames = 6 total', () => {
    const device = createDevice();
    const operation = new GenericFirmwareBurst(
      device, frameBuilder,
      FIRMWARE_EFFECTS.SNAKE,
      { r: 255, g: 100, b: 0 },
      3, 2,
    );

    operation.execute();

    const send = device.sendFeatureReport as ReturnType<typeof vi.fn>;
    expect(send).toHaveBeenCalledTimes(6);
    const firstBuf = send.mock.calls[0][0] as Buffer;
    expect(firstBuf.length).toBe(382);
  });
});
