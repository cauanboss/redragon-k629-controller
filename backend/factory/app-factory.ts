import { Controller, type ControllerDependencies } from '../controller.js';
import { UIServer, type UIServerOptions } from '../server.js';
import type { IProfileRepository } from '../ports/iprofile-repository.js';
import type { EffectDispatcher } from '../effects/dispatcher.js';
import { defaultProfileRepository } from '../infrastructure/profile-store.js';
import { defaultEffectDispatcher } from '../effects/dispatcher.js';

/** Runtime configuration for the web application. */
export interface AppConfig {
  port?: number;
  host?: string;
  controller?: ControllerDependencies;
  profiles?: IProfileRepository;
  effectDispatcher?: EffectDispatcher;
}

/** Fully wired application — controller + HTTP/WebSocket server. */
export interface Application {
  readonly controller: Controller;
  readonly server: UIServer;
  connect(): boolean;
  start(): boolean;
  stop(): void;
}

function readPort(): number {
  const raw = process.env.PORT ?? '3000';
  const port = Number.parseInt(raw, 10);
  return Number.isFinite(port) ? port : 3000;
}

function readHost(): string {
  return process.env.HOST ?? '127.0.0.1';
}

/**
 * Factory — assembles Controller, UIServer, and dependencies.
 *
 * Centralises composition so entry points (`start-server.ts`, tests)
 * do not wire objects manually.
 */
export function createApplication(config: AppConfig = {}): Application {
  const port = config.port ?? readPort();
  const host = config.host ?? readHost();

  const controller = new Controller(config.controller);

  const serverOptions: UIServerOptions = {
    port,
    host,
    profiles: config.profiles ?? defaultProfileRepository,
    effectDispatcher: config.effectDispatcher ?? defaultEffectDispatcher,
  };

  const server = new UIServer(controller, serverOptions);

  return {
    controller,
    server,

    connect(): boolean {
      return controller.connect();
    },

    start(): boolean {
      const connected = controller.connect();
      server.start();
      return connected;
    },

    stop(): void {
      controller.disconnect();
      server.stop();
    },
  };
}

/** Factory convenience — reads PORT and HOST from the environment. */
export function createApplicationFromEnv(): Application {
  return createApplication({
    port: readPort(),
    host: readHost(),
  });
}
