import type { IDevice } from '../ports/idevice.js';

/**
 * Decorator — adds logging around every IDevice method.
 *
 * Wraps any {@link IDevice} implementation and logs calls to
 * `find()`, `open()`, `close()`, and `sendFeatureReport()`.
 * `isConnected()` is intentionally **not** logged because it is
 * polled frequently and would produce noisy output.
 *
 * The logger function is injectable, defaulting to `console.log`.
 *
 * @example
 * ```ts
 * const device = new LoggingDeviceDecorator(new DeviceManager());
 * ```
 */
export class LoggingDeviceDecorator implements IDevice {
  constructor(
    private readonly inner: IDevice,
    private readonly logger: (msg: string) => void = console.log,
  ) {}

  find(): boolean {
    const result = this.inner.find();
    this.logger(`[Device] find() → ${result}`);
    return result;
  }

  open(): void {
    this.logger(`[Device] open()`);
    this.inner.open();
  }

  close(): void {
    this.logger(`[Device] close()`);
    this.inner.close();
  }

  isConnected(): boolean {
    // Intentionally not logged — called frequently, would be noisy
    return this.inner.isConnected();
  }

  sendFeatureReport(data: Buffer): void {
    this.logger(
      `[Device] sendFeatureReport | ${data.length}B | header: ${data.subarray(0, 8).toString('hex')}`,
    );
    this.inner.sendFeatureReport(data);
  }
}
