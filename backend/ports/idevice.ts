/**
 * Port — abstraction over USB HID I/O (Adapter: DeviceManager).
 *
 * Enables Dependency Inversion: Controller depends on this interface,
 * not on node-hid directly.
 */
export interface IDevice {
  find(): boolean;
  open(): void;
  close(): void;
  isConnected(): boolean;
  sendFeatureReport(data: Buffer): void;
}
