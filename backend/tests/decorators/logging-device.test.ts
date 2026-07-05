import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoggingDeviceDecorator } from '../../decorators/logging-device.js';
import type { IDevice } from '../../ports/idevice.js';

function createMockDevice(): IDevice {
  return {
    find: vi.fn().mockReturnValue(true),
    open: vi.fn(),
    close: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    sendFeatureReport: vi.fn(),
  };
}

describe('LoggingDeviceDecorator', () => {
  let mockDevice: IDevice;
  let logger: ReturnType<typeof vi.fn>;
  let decorator: LoggingDeviceDecorator;

  beforeEach(() => {
    mockDevice = createMockDevice();
    logger = vi.fn();
    decorator = new LoggingDeviceDecorator(mockDevice, logger);
  });

  describe('delegation', () => {
    it('delegates find() to inner device and returns its result', () => {
      const result = decorator.find();
      expect(result).toBe(true);
      expect(mockDevice.find).toHaveBeenCalledOnce();
    });

    it('delegates open() to inner device', () => {
      decorator.open();
      expect(mockDevice.open).toHaveBeenCalledOnce();
    });

    it('delegates close() to inner device', () => {
      decorator.close();
      expect(mockDevice.close).toHaveBeenCalledOnce();
    });

    it('delegates isConnected() to inner device', () => {
      const result = decorator.isConnected();
      expect(result).toBe(true);
      expect(mockDevice.isConnected).toHaveBeenCalledOnce();
    });

    it('delegates sendFeatureReport() to inner device', () => {
      const buf = Buffer.from([0x08, 0x0a, 0x00, 0x01]);
      decorator.sendFeatureReport(buf);
      expect(mockDevice.sendFeatureReport).toHaveBeenCalledWith(buf);
    });

    it('returns find() false result from inner device', () => {
      const mockDeviceFalse = createMockDevice();
      (mockDeviceFalse.find as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const decoratorFalse = new LoggingDeviceDecorator(mockDeviceFalse, logger);

      const result = decoratorFalse.find();
      expect(result).toBe(false);
    });
  });

  describe('logging', () => {
    it('logs find() result', () => {
      decorator.find();
      expect(logger).toHaveBeenCalledWith('[Device] find() → true');
    });

    it('logs find() false result', () => {
      (mockDevice.find as ReturnType<typeof vi.fn>).mockReturnValue(false);
      decorator.find();
      expect(logger).toHaveBeenCalledWith('[Device] find() → false');
    });

    it('logs open() call', () => {
      decorator.open();
      expect(logger).toHaveBeenCalledWith('[Device] open()');
    });

    it('logs close() call', () => {
      decorator.close();
      expect(logger).toHaveBeenCalledWith('[Device] close()');
    });

    it('logs sendFeatureReport with length and hex header', () => {
      const buf = Buffer.from([
        0x08, 0x0a, 0x00, 0x01, 0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa,
      ]);
      decorator.sendFeatureReport(buf);
      expect(logger).toHaveBeenCalledWith(
        '[Device] sendFeatureReport | 10B | header: 080a0001ffeeddcc',
      );
    });

    it('logs sendFeatureReport with short buffer (less than 8 bytes)', () => {
      const buf = Buffer.from([0x01, 0x02, 0x03]);
      decorator.sendFeatureReport(buf);
      expect(logger).toHaveBeenCalledWith(
        '[Device] sendFeatureReport | 3B | header: 010203',
      );
    });

    it('does NOT log isConnected() calls', () => {
      decorator.isConnected();
      expect(logger).not.toHaveBeenCalled();
    });
  });

  describe('custom logger', () => {
    it('uses console.log by default', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const defaultDecorator = new LoggingDeviceDecorator(mockDevice);
      defaultDecorator.open();
      expect(spy).toHaveBeenCalledWith('[Device] open()');
      spy.mockRestore();
    });

    it('works with a custom logger that captures messages', () => {
      const messages: string[] = [];
      const customLogger = (msg: string) => {
        messages.push(msg);
      };
      const customDecorator = new LoggingDeviceDecorator(mockDevice, customLogger);

      customDecorator.find();
      customDecorator.open();

      expect(messages).toEqual([
        '[Device] find() → true',
        '[Device] open()',
      ]);
    });

    it('supports silent / noop logger', () => {
      const noopLogger = vi.fn();
      const silentDecorator = new LoggingDeviceDecorator(mockDevice, noopLogger);

      silentDecorator.find();
      silentDecorator.open();
      silentDecorator.close();
      silentDecorator.sendFeatureReport(Buffer.from([0x00]));

      expect(noopLogger).toHaveBeenCalledTimes(4);
    });
  });

  describe('logger interaction when inner throws', () => {
    it('does not log if find() throws (logger runs after inner succeeds)', () => {
      (mockDevice.find as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('find failed');
      });
      expect(() => decorator.find()).toThrow('find failed');
      expect(logger).not.toHaveBeenCalled();
    });

    it('logs before delegating open() — log happens even if inner throws', () => {
      (mockDevice.open as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('open failed');
      });
      expect(() => decorator.open()).toThrow('open failed');
      // Log is emitted BEFORE delegation, so it appears even on failure
      expect(logger).toHaveBeenCalledWith('[Device] open()');
    });
  });
});
