import HID from 'node-hid';

export const VENDOR_IDS = {
  WIRED: 0x258a,   // BY Tech Gaming Keyboard
  WIRELESS: 0x25a7, // Compx 2.4G Wireless Receiver
} as const;

export const PRODUCT_IDS = {
  WIRED: 0x0049,
  WIRELESS: 0xfa70,
} as const;

/** Vendor HID interface usage page used for RGB control */
const VENDOR_USAGE_PAGE = 0xff00;

export class DeviceManager {
  private device: HID.HID | null = null;
  private devicePath: string | null = null;

  /**
   * Searches for a connected Redragon keyboard.
   * Priority: wired (258a:0049) > wireless (25a7:fa70).
   * Only considers the vendor HID interface (usagePage 0xFF00).
   *
   * @returns true if a matching device was found
   */
  find(): boolean {
    let allDevices: HID.Device[] = [];

    try {
      allDevices = HID.devices();
    } catch {
      this.devicePath = null;
      return false;
    }

    // Try wired first
    const match = this.findDevice(allDevices, VENDOR_IDS.WIRED, PRODUCT_IDS.WIRED)
      ?? this.findDevice(allDevices, VENDOR_IDS.WIRELESS, PRODUCT_IDS.WIRELESS);

    if (match?.path) {
      this.devicePath = match.path;
      return true;
    }

    this.devicePath = null;
    return false;
  }

  /**
   * Opens the vendor HID interface for RGB communication.
   *
   * @throws if no device has been found or the device cannot be opened
   */
  open(): void {
    if (!this.devicePath) {
      // Attempt one last automatic discovery
      if (!this.find()) {
        throw new Error(
          'Redragon keyboard not found. ' +
          'Ensure the device is connected and you have sufficient permissions ' +
          '(e.g. udev rule for 258a:0049 / 25a7:fa70).',
        );
      }
    }

    try {
      this.device = new HID.HID(this.devicePath!);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to open Redragon keyboard at ${this.devicePath}: ${message}`,
      );
    }
  }

  /**
   * Sends a feature report to the device.
   *
   * @param data - the raw report buffer
   * @throws if the device is not connected or the USB write fails
   */
  sendFeatureReport(data: Buffer): void {
    if (!this.device) {
      throw new Error('Device is not open. Call open() before sending reports.');
    }

    try {
      this.device.sendFeatureReport(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`USB sendFeatureReport failed: ${message}`);
    }
  }

  /**
   * Closes the HID connection gracefully.
   */
  close(): void {
    if (this.device) {
      try {
        this.device.close();
      } catch {
        // Silently ignore errors during close
      }
      this.device = null;
    }
    this.devicePath = null;
  }

  /**
   * Returns true when the HID device is open and presumed connected.
   */
  isConnected(): boolean {
    return this.device !== null;
  }

  // ---------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------

  /**
   * Filters device list for a matching VID/PID with the vendor usage page.
   */
  private findDevice(
    devices: HID.Device[],
    vid: number,
    pid: number,
  ): HID.Device | undefined {
    return devices.find(
      (d) =>
        d.vendorId === vid &&
        d.productId === pid &&
        d.usagePage === VENDOR_USAGE_PAGE &&
        d.path != null,
    );
  }
}
