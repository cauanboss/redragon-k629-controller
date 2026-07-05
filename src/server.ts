import express from 'express';
import http from 'http';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { Controller } from './controller.js';
import type { RGBColor } from './color.js';
import { getEffect } from './effects/index.js';
import * as ProfileStore from './infrastructure/profile-store.js';

// ---------------------------------------------------------------
// Static file resolution
//
// Compiled JS (app.js) → dist/web/   (tsc output)
// HTML/CSS             → src/web/    (kept as-is)
// ---------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_HERE = path.resolve(__dirname, 'web');          // src/web/ (tsx) or dist/web/ (node)
const DIR_DIST = path.resolve(__dirname, '../dist/web');  // dist/web/ (sibling when tsx)
const DIR_SRC = path.resolve(__dirname, '../src/web');    // src/web/ (sibling when node)

const WEB_DIRS = [DIR_HERE, DIR_DIST, DIR_SRC].filter(d => existsSync(d));
const WEB_DIR = WEB_DIRS[0] || DIR_HERE;

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

interface WsMessage {
  type: string;
  keyId?: string;
  color?: RGBColor;
  colors?: Record<string, RGBColor>;
  effect?: string;
  params?: Record<string, number>;
  level?: number;
  name?: string;
  profile?: Record<string, unknown>;
}

// ---------------------------------------------------------------
// UIServer
// ---------------------------------------------------------------

/**
 * HTTP + WebSocket server.
 *
 * Serves the frontend static files (HTML / CSS / JS) from the `web/`
 * directory and accepts JSON commands over WebSocket to control the
 * keyboard.
 */
export class UIServer {
  private app: express.Application;
  private server: http.Server;
  private wss: WebSocketServer;
  private controller: Controller;
  private port: number;

  /** Last received brightness (0-4) for firmware effects. */
  private currentBrightness = 3;

  /** Last received speed (0-4) for firmware effects. */
  private currentSpeed = 2;

  constructor(controller: Controller, port = 3000) {
    this.controller = controller;
    this.port = port;

    // Express — serve from each available web directory
    this.app = express();
    for (const dir of WEB_DIRS) {
      this.app.use(express.static(dir));
    }

    // HTTP + WS
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupWebSocket();
  }

  // ---------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------

  /** Starts listening on the configured port. */
  start(): void {
    this.server.listen(this.port, () => {
      console.log(`UIServer listening on http://localhost:${this.port}`);
      console.log(`  Web root: ${WEB_DIR}`);
    });
  }

  /** Stops the effect loop, closes all WS connections, and shuts down the HTTP server. */
  stop(): void {
    this.controller.stopEffect();

    for (const client of this.wss.clients) {
      client.close();
    }
    this.wss.close();
    this.server.close();
  }

  // ---------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      // Send the layout immediately
      if (this.controller.isConnected()) {
        this.sendLayout(ws);
      }

      ws.on('message', (raw: Buffer) => {
        this.handleMessage(ws, raw);
      });

      ws.on('error', () => {
        // Connection closed; nothing to clean up
      });
    });
  }

  private handleMessage(ws: WebSocket, raw: Buffer): void {
    let msg: WsMessage;

    try {
      msg = JSON.parse(raw.toString()) as WsMessage;
    } catch {
      this.sendError(ws, 'Invalid JSON message');
      return;
    }

    if (!this.controller.isConnected()) {
      this.sendError(ws, 'Controller is not connected to the keyboard');
      return;
    }

    try {
      switch (msg.type) {
        case 'get_layout':
          this.sendLayout(ws);
          break;

        case 'set_key_color':
          if (!msg.keyId || !msg.color) {
            this.sendError(ws, 'set_key_color requires keyId and color');
            return;
          }
          this.controller.setKeyColor(msg.keyId, msg.color);
          this.broadcast({ type: 'key_color', keyId: msg.keyId, color: msg.color });
          break;

        case 'set_colors':
          if (!msg.colors || typeof msg.colors !== 'object') {
            this.sendError(ws, 'set_colors requires colors object');
            return;
          }
          this.controller.applyColors(msg.colors);
          break;

        case 'set_all_color':
          if (!msg.color) {
            this.sendError(ws, 'set_all_color requires color');
            return;
          }
          this.controller.setAllColor(msg.color);
          break;

        case 'apply_effect':
          this.handleApplyEffect(ws, msg);
          break;

        case 'set_brightness': {
          const rawLevel = msg.level;
          if (rawLevel === undefined || rawLevel < 0 || rawLevel > 5) {
            this.sendError(ws, 'set_brightness requires level 0-5');
            return;
          }
          // Clamp from frontend range (0-5) to firmware nibble (0-4)
          this.currentBrightness = Math.min(4, Math.round(rawLevel));
          break;
        }

        case 'set_speed': {
          const rawLevel = msg.level;
          if (rawLevel === undefined || rawLevel < 0 || rawLevel > 5) {
            this.sendError(ws, 'set_speed requires level 0-5');
            return;
          }
          this.currentSpeed = Math.min(4, Math.round(rawLevel));
          break;
        }

        case 'reset':
          this.controller.stopEffect();
          this.controller.setAllColor({ r: 0, g: 0, b: 0 });
          break;

        case 'profile_save':
          if (!msg.name || !msg.profile) {
            this.sendError(ws, 'profile_save requires name and profile');
            return;
          }
          ProfileStore.saveProfile({
            name: msg.name,
            colors: (msg.profile as Record<string, unknown>).colors as Record<string, RGBColor> ?? {},
            effect: (msg.profile as Record<string, unknown>).effect as string ?? undefined,
            brightness: (msg.profile as Record<string, unknown>).brightness as number ?? undefined,
            speed: (msg.profile as Record<string, unknown>).speed as number ?? undefined,
          });
          this.send(ws, { type: 'profile_saved', name: msg.name });
          break;

        case 'profile_load':
          if (!msg.name) {
            this.sendError(ws, 'profile_load requires name');
            return;
          }
          const loaded = ProfileStore.loadProfile(msg.name);
          if (loaded) {
            this.controller.applyColors(loaded.colors);
            this.send(ws, { type: 'profile_data', name: msg.name, profile: loaded });
          } else {
            this.sendError(ws, `Profile "${msg.name}" not found`);
          }
          break;

        case 'profile_list':
          this.send(ws, { type: 'profile_list', profiles: ProfileStore.listProfiles() });
          break;

        case 'profile_delete':
          if (!msg.name) {
            this.sendError(ws, 'profile_delete requires name');
            return;
          }
          if (ProfileStore.deleteProfile(msg.name)) {
            this.send(ws, { type: 'profile_deleted', name: msg.name });
          } else {
            this.sendError(ws, `Profile "${msg.name}" not found`);
          }
          break;

        default:
          this.sendError(ws, `Unknown message type: ${msg.type}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.sendError(ws, message);
    }
  }

  private handleApplyEffect(ws: WebSocket, msg: WsMessage): void {
    const effectName = msg.effect;
    if (!effectName) {
      this.sendError(ws, 'apply_effect requires effect name');
      return;
    }

    const brightness = msg.params?.brightness ?? this.currentBrightness;
    const speed = msg.params?.speed ?? this.currentSpeed;

    if (effectName === 'static') {
      // Firmware static mode — requires a colour; use a warm orange
      // as default. A future iteration could accept a colour parameter
      // from the frontend.
      this.controller.applyFirmwareStatic(
        { r: 255, g: 100, b: 0 },
        brightness,
      );
    } else if (effectName === 'rainbow') {
      // Firmware rainbow mode
      this.controller.applyFirmwareRainbow(brightness, speed);
    } else {
      // Host-driven effect (wave, custom, …)
      const effect = getEffect(effectName);
      if (!effect) {
        this.sendError(ws, `Unknown effect: ${effectName}`);
        return;
      }
      this.controller.startEffect(effect, 30);
    }

    // Notify all connected clients about the active effect
    this.broadcast({ type: 'effect_active', effect: effectName });
  }

  // ---------------------------------------------------------------
  // Messaging helpers
  // ---------------------------------------------------------------

  private sendLayout(ws: WebSocket): void {
    const keys = this.controller.getLayout().toJSON();
    ws.send(JSON.stringify({ type: 'layout', keys }));
  }

  private send(ws: WebSocket, data: Record<string, unknown>): void {
    ws.send(JSON.stringify(data));
  }

  private sendError(ws: WebSocket, message: string): void {
    this.send(ws, { type: 'error', message });
  }

  private broadcast(data: unknown): void {
    const payload = JSON.stringify(data);

    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}
