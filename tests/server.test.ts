import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';

// Mock node-hid
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

import { Controller } from '../src/controller.js';
import { UIServer } from '../src/server.js';

describe('UIServer', () => {
  let controller: Controller;
  let server: UIServer;
  const TEST_PORT = 18923; // Use an unusual port to avoid conflicts

  beforeEach(async () => {
    controller = new Controller();
    controller.connect();
    server = new UIServer(controller, TEST_PORT);
    server.start();

    // Wait for server to be ready
    await new Promise<void>((resolve) => {
      const check = () => {
        const req = http.get(`http://localhost:${TEST_PORT}`, () => {
          resolve();
        });
        req.on('error', () => {
          setTimeout(check, 50);
        });
        req.end();
      };
      check();
    });
  });

  afterEach(() => {
    server.stop();
  });

  it('starts HTTP server on the specified port', async () => {
    await new Promise<void>((resolve, reject) => {
      http.get(`http://localhost:${TEST_PORT}`, (res) => {
        expect(res.statusCode).toBe(200);
        resolve();
      }).on('error', reject);
    });
  });

  it('serves HTML content at the root', async () => {
    await new Promise<void>((resolve, reject) => {
      http.get(`http://localhost:${TEST_PORT}`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          expect(data).toContain('<!DOCTYPE html>');
          resolve();
        });
      }).on('error', reject);
    });
  });

  it('accepts WebSocket connections', async () => {
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        resolve();
      });
      ws.on('error', reject);

      // Timeout in case the connection never opens
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 2000);
    });
  });

  it('processes a JSON message and responds', async () => {
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        // Send a get_layout message
        ws.send(JSON.stringify({ type: 'get_layout' }));
      });

      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString());
        // First message could be layout (if connected) or our response
        if (msg.type === 'error') {
          reject(new Error(`Got error: ${msg.message}`));
          return;
        }
        if (msg.type === 'layout') {
          expect(msg.keys).toBeDefined();
          expect(Array.isArray(msg.keys)).toBe(true);
          ws.close();
          resolve();
        }
      });

      ws.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket message timeout')), 2000);
    });
  });

  it('handles set_key_color command', async () => {
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'set_key_color',
          keyId: 'esc',
          color: { r: 255, g: 0, b: 0 },
        }));
      });

      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString());
        // Could be the initial layout or a key_color broadcast
        if (msg.type === 'key_color') {
          expect(msg.keyId).toBe('esc');
          ws.close();
          resolve();
        }
        // Ignore layout messages
      });

      ws.on('error', reject);
      setTimeout(() => reject(new Error('Timeout waiting for key_color')), 2000);
    });
  });

  it('handles invalid JSON gracefully', async () => {
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.send('not valid json');
      });

      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'error') {
          expect(msg.message).toContain('Invalid JSON');
          ws.close();
          resolve();
        }
      });

      ws.on('error', reject);
      setTimeout(() => reject(new Error('Timeout')), 2000);
    });
  });

  it('handles unknown message type', async () => {
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'unknown_command' }));
      });

      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'error') {
          expect(msg.message).toContain('Unknown message type');
          ws.close();
          resolve();
        }
      });

      ws.on('error', reject);
      setTimeout(() => reject(new Error('Timeout')), 2000);
    });
  });

  it('handles set_all_color command', async () => {
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'set_all_color',
          color: { r: 0, g: 255, b: 0 },
        }));
      });

      // After a short delay, if no error, consider it a success
      setTimeout(() => {
        ws.close();
        resolve();
      }, 200);

      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'error') {
          reject(new Error(`Got error: ${msg.message}`));
        }
      });

      ws.on('error', reject);
    });
  });
});
