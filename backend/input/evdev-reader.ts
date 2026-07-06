import { createReadStream, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IInputReader, KeyEventCallback } from '../ports/iinput-reader.js';

const EVDEV_BY_ID = '/dev/input/by-id';
const EVENT_SIZE = 24; // sizeof(input_event) on 64-bit Linux

function findRedragonKeyboardPath(): string | null {
  let entries: string[];
  try {
    entries = readdirSync(EVDEV_BY_ID);
  } catch {
    return null;
  }
  const match = entries.find(
    (e) => (e.includes('BY_Tech') || e.includes('Redragon')) && e.endsWith('-event-kbd')
  );
  return match ? resolve(EVDEV_BY_ID, match) : null;
}

function parseEvent(buf: Buffer): { type: number; code: number; value: number } {
  return {
    type: buf.readUInt16LE(16),
    code: buf.readUInt16LE(18),
    value: buf.readInt32LE(20),
  };
}

export class EvdevInputReader implements IInputReader {
  private stream: ReturnType<typeof createReadStream> | null = null;
  private listeners: KeyEventCallback[] = [];
  private buffer = Buffer.alloc(0);

  start(): void {
    const path = findRedragonKeyboardPath();
    if (!path) {
      throw new Error(
        'Redragon keyboard input device not found. Ensure keyboard is connected ' +
          'and you have input group permission. Try: sudo usermod -aG input $USER'
      );
    }

    this.stream = createReadStream(path, { highWaterMark: EVENT_SIZE * 16 });
    this.stream.on('data', (chunk: string | Buffer) => {
      if (typeof chunk !== 'string') this.onData(chunk);
    });
    this.stream.on('error', () => {
      /* ignore read errors */
    });
  }

  onKeyEvent(cb: KeyEventCallback): void {
    this.listeners.push(cb);
  }

  stop(): void {
    if (this.stream !== null) {
      this.stream.destroy();
      this.stream = null;
    }
    this.listeners.length = 0;
    this.buffer = Buffer.alloc(0);
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= EVENT_SIZE) {
      const buf = this.buffer.subarray(0, EVENT_SIZE);
      this.buffer = this.buffer.subarray(EVENT_SIZE);

      const event = parseEvent(buf);
      if (event.type !== 0x01) continue; // EV_KEY only

      for (const cb of this.listeners) {
        cb(event.code, event.value);
      }
    }
  }
}
