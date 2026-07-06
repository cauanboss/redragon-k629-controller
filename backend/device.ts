import HID from 'node-hid';
import type { IDevice } from './ports/idevice.js';

// ---------------------------------------------------------------------------
// Sinowealth SH68F90A chipset — supported Redragon models
// ---------------------------------------------------------------------------
//
// Only models confirmed to use the Sinowealth SH68F90A microcontroller
// are listed below. Other Redragon keyboards (K552, K556, K582, K585, K587)
// use Sonix or EVision chipsets and are NOT supported by this driver.
//
// If you have a compatible model not listed here, add its VID:PID below
// and it will be auto-detected.

const REDRAGON_VENDOR_WIRED = 0x258a;   // BY Tech / Sinowealth
const REDRAGON_VENDOR_WIRELESS = 0x25a7; // Compx dongle

/** Confirmed SH68F90A models (ordered by priority). */
const KNOWN_PRODUCTS: Array<{ vid: number; pid: number; label: string }> = [
  // Wired
  { vid: REDRAGON_VENDOR_WIRED, pid: 0x0049, label: 'K629CGO-PRO-M (wired)' },
  { vid: REDRAGON_VENDOR_WIRED, pid: 0x00e2, label: 'K530 Draconic (wired)' },
  { vid: REDRAGON_VENDOR_WIRED, pid: 0x0104, label: 'K599 Deimos (wired)' },
  { vid: REDRAGON_VENDOR_WIRED, pid: 0x0155, label: 'K618 Horus (wired)' },
  // Wireless (2.4 GHz)
  { vid: REDRAGON_VENDOR_WIRELESS, pid: 0xfa70, label: 'K629CGO-PRO-M (wireless)' },
  { vid: REDRAGON_VENDOR_WIRELESS, pid: 0xfa67, label: 'K530 Draconic (wireless)' },
  { vid: REDRAGON_VENDOR_WIRELESS, pid: 0xfa6b, label: 'K599 Deimos (wireless)' },
  { vid: REDRAGON_VENDOR_WIRELESS, pid: 0xfa71, label: 'K618 Horus (wireless)' },
];

/** Vendor HID interface usage page used for RGB control */
const VENDOR_USAGE_PAGE = 0xff00;

// ---------------------------------------------------------------------------
// DeviceManager
// ---------------------------------------------------------------------------

/** Adapter — concrete USB HID implementation of {@link IDevice}. */
export class DeviceManager implements IDevice {
  private device: HID.HID | null = null;
  private devicePath: string | null = null;
  private deviceLabel: string | null = null;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private watchCallback: (() => void) | null = null;

  /**
   * Searches for a connected Redragon keyboard with the SH68F90A chipset.
   *
   * Only matches known models — does NOT attempt generic fallback
   * because other Redragon keyboards use different chipsets (Sonix/EVision)
   * with incompatible RGB protocols.
   *
   * @returns true if a matching device was found
   */
  find(): boolean {
    let devices: HID.Device[] = [];

    try {
      devices = HID.devices();
    } catch {
      this.devicePath = null;
      this.deviceLabel = null;
      return false;
    }

    for (const { vid, pid, label } of KNOWN_PRODUCTS) {
      const match = devices.find(
        (d) =>
          d.vendorId === vid &&
          d.productId === pid &&
          d.usagePage === VENDOR_USAGE_PAGE &&
          d.path != null,
      );
      if (match?.path) {
        this.devicePath = match.path;
        this.deviceLabel = label;
        return true;
      }
    }

    this.devicePath = null;
    this.deviceLabel = null;
    return false;
  }

  /** Human-readable label for the connected device. */
  getLabel(): string | null {
    return this.deviceLabel;
  }

  /**
   * Opens the vendor HID interface for RGB communication.
   *
   * @throws if no device has been found or the device cannot be opened
   */
  open(): void {
    if (!this.devicePath) {
      if (!this.find()) {
        throw new Error(
          'Redragon keyboard not found. Ensure the device is connected ' +
          'and you have the udev rule installed (backend/config/99-redragon.rules).',
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
    this.stopWatch();
    if (this.device) {
      try {
        this.device.close();
      } catch {
        // Silently ignore errors during close
      }
      this.device = null;
    }
    this.devicePath = null;
    this.deviceLabel = null;
  }

  /**
   * Returns true when the HID device is open and presumed connected.
   */
  isConnected(): boolean {
    return this.device !== null;
  }

  // ---------------------------------------------------------------
  // Auto-reconnect
  // ---------------------------------------------------------------

  /**
   * Starts a background watcher that polls for device reconnection.
   *
   * When the device disappears (USB unplug), the callback is invoked.
   * The watcher will keep polling every 2 s and automatically re-open
   * the device when it reappears.
   *
   * @param onReconnect called whenever the device reconnects (optional)
   */
  startWatch(
    onReconnect?: (label: string) => void,
    intervalMs = 2000,
  ): void {
    this.stopWatch();
    this.watchCallback = () => {
      if (this.isConnected()) return; // already connected

      if (this.find()) {
        try {
          this.open();
          if (onReconnect) {
            onReconnect(this.deviceLabel ?? 'unknown');
          }
        } catch {
          // Device found but can't open yet — retry next tick
        }
      }
    };
    this.reconnectTimer = setInterval(this.watchCallback, intervalMs);
  }

  /** Stops the background reconnect watcher. */
  stopWatch(): void {
    if (this.reconnectTimer !== null) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.watchCallback = null;
  }
}
