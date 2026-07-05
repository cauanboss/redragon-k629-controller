/**
 * Port — abstraction for keyboard input event reading.
 * Enables Dependency Inversion: effects depend on this interface,
 * not on evdev directly.
 */

export type KeyEventCallback = (evdevCode: number, value: number) => void;
// value: 1 = key down, 0 = key up, 2 = key repeat

export interface IInputReader {
  /** Start listening for keyboard events. Throws if device not found. */
  start(): void;
  /** Stop listening and release resources. */
  stop(): void;
  /** Register a callback invoked for every key event. */
  onKeyEvent(cb: KeyEventCallback): void;
}
