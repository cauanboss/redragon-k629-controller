import express from 'express';
import http from 'http';
import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { Controller } from './controller.js';
import type { IProfileRepository } from './ports/iprofile-repository.js';
import { defaultProfileRepository } from './infrastructure/profile-store.js';
import { defaultEffectDispatcher, type EffectDispatcher } from './effects/dispatcher.js';
import { createDefaultCommands } from './commands/keyboard.commands.js';
import { CommandRegistry, createDefaultCommandRegistry } from './commands/registry.js';
import type { WsMessage } from './commands/types.js';
import { Subject, type IObserver, type ServerEvent } from './observer/server-events.js';
import { validateMessage } from './commands/validate.js';

// ---------------------------------------------------------------
// Static file resolution
// ---------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_HERE = path.resolve(__dirname, 'web');
const DIR_DIST = path.resolve(__dirname, '../dist/web');
const DIR_ANGULAR = path.resolve(__dirname, '../dist/angular');

const WEB_DIRS = [DIR_ANGULAR, DIR_HERE, DIR_DIST].filter((dir) => existsSync(dir));
const WEB_DIR = WEB_DIRS[0] || DIR_HERE;

function readAppVersion(): string {
  const candidates = [
    path.resolve(__dirname, '../../package.json'),
    path.resolve(__dirname, '../package.json'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const pkg = JSON.parse(readFileSync(file, 'utf8')) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      // ignore malformed package.json
    }
  }
  return '1.0.0';
}

const APP_VERSION = readAppVersion();

/** Commands allowed when the keyboard USB device is not connected. */
const OFFLINE_ALLOWED = new Set([
  'get_layout',
  'profile_list',
  'profile_save',
  'profile_delete',
  'stop_effect',
]);

export interface UIServerOptions {
  port?: number;
  host?: string;
  profiles?: IProfileRepository;
  effectDispatcher?: EffectDispatcher;
  commands?: CommandRegistry;
}

/**
 * HTTP + WebSocket server.
 *
 * Uses the Command pattern for WebSocket messages and the Observer
 * pattern to dispatch resulting server events to clients.
 */
export class UIServer implements IObserver<ServerEvent> {
  private app: express.Application;
  private server: http.Server;
  private wss: WebSocketServer;
  private controller: Controller;
  private port: number;
  private host: string;
  private profiles: IProfileRepository;
  private effectDispatcher: EffectDispatcher;
  private commandRegistry: CommandRegistry;
  private settings = { brightness: 3, speed: 2 };
  private eventSubject = new Subject<ServerEvent>();
  private currentClient: WebSocket | null = null;

  constructor(controller: Controller, portOrOptions: number | UIServerOptions = {}) {
    this.controller = controller;

    const options: UIServerOptions =
      typeof portOrOptions === 'number' ? { port: portOrOptions } : portOrOptions;

    this.port = options.port ?? 3000;
    this.host = options.host ?? '127.0.0.1';
    this.profiles = options.profiles ?? defaultProfileRepository;
    this.effectDispatcher = options.effectDispatcher ?? defaultEffectDispatcher;
    this.commandRegistry =
      options.commands ?? createDefaultCommandRegistry(createDefaultCommands());

    this.app = express();
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        version: APP_VERSION,
        deviceConnected: this.controller.isConnected(),
        deviceLabel: this.controller.getDeviceLabel(),
      });
    });
    for (const dir of WEB_DIRS) {
      this.app.use(express.static(dir));
    }

    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    // Subscribe to the event subject so update() receives notifications
    this.eventSubject.subscribe(this);

    this.setupWebSocket();
  }

  /** Backward-compatible factory for explicit options. */
  static create(controller: Controller, portOrOptions: number | UIServerOptions = {}): UIServer {
    return new UIServer(controller, portOrOptions);
  }

  start(): void {
    this.server.listen(this.port, this.host, () => {
      console.log(`UIServer listening on http://${this.host}:${this.port}`);
      console.log(`  Web root: ${WEB_DIR}`);
    });
  }

  stop(): void {
    this.controller.stopEffect();

    for (const client of this.wss.clients) {
      client.close();
    }

    this.wss.close();
    this.server.close();
  }

  /** Broadcast keyboard USB connection state to all WebSocket clients. */
  broadcastDeviceStatus(): void {
    this.broadcast({
      type: 'device_status',
      connected: this.controller.isConnected(),
      label: this.controller.getDeviceLabel(),
    });
  }

  /** Notify clients after USB reconnect — status + layout refresh. */
  notifyDeviceReconnected(): void {
    this.broadcastDeviceStatus();
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        this.sendLayout(client);
      }
    }
  }

  /**
   * Observer pattern — called by the Subject<ServerEvent>.
   * Routes events to the current WebSocket client.
   */
  update(event: ServerEvent): void {
    if (!this.currentClient) return;

    switch (event.kind) {
      case 'send':
        this.send(this.currentClient, event.data);
        break;
      case 'broadcast':
        this.broadcast(event.data);
        break;
      case 'error':
        this.sendError(this.currentClient, event.message);
        break;
    }
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.sendDeviceStatus(ws);

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
    this.currentClient = ws;

    try {
      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        this.eventSubject.notify({ kind: 'error', message: 'Invalid JSON message' });
        return;
      }

      // Validate message
      const validated = validateMessage(parsed);
      if (typeof validated === 'string') {
        this.eventSubject.notify({ kind: 'error', message: validated });
        return;
      }

      const message: WsMessage = validated;

      if (!this.controller.isConnected() && !OFFLINE_ALLOWED.has(message.type)) {
        this.eventSubject.notify({
          kind: 'error',
          message: 'Keyboard not connected. Install udev rules and reconnect USB.',
        });
        return;
      }

      this.commandRegistry.dispatch({
        controller: this.controller,
        profiles: this.profiles,
        effectDispatcher: this.effectDispatcher,
        settings: this.settings,
        message,
        subject: this.eventSubject,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.eventSubject.notify({ kind: 'error', message: errorMessage });
    } finally {
      this.currentClient = null;
    }
  }

  private sendLayout(ws: WebSocket): void {
    const keys = this.controller.getLayout().toJSON();
    ws.send(JSON.stringify({ type: 'layout', keys }));
  }

  private sendDeviceStatus(ws: WebSocket): void {
    ws.send(
      JSON.stringify({
        type: 'device_status',
        connected: this.controller.isConnected(),
        label: this.controller.getDeviceLabel(),
      })
    );
  }

  private send(ws: WebSocket, data: Record<string, unknown>): void {
    ws.send(JSON.stringify(data));
  }

  private sendError(ws: WebSocket, message: string): void {
    this.send(ws, { type: 'error', message });
  }

  private broadcast(data: Record<string, unknown>): void {
    const payload = JSON.stringify(data);

    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}
