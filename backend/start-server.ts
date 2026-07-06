import { createApplicationFromEnv, type Application } from './factory/app-factory.js';
import './effects/index.js';

let app: Application | null = null;

function shutdown(): void {
  if (app) {
    app.stop();
    app = null;
  }
  process.exit(0);
}

try {
  app = createApplicationFromEnv();

  if (app.connect()) {
    console.log('✓ Keyboard connected');
  } else {
    console.log('! Keyboard not found — connect it or check udev rules');
    console.log('  Auto-reconnect watcher active — plug in the keyboard at any time.');
  }

  // Enable auto-reconnect on USB unplug/replug
  app.startAutoReconnect(() => {
    console.log('✓ Keyboard reconnected');
    app!.server.notifyDeviceReconnected();
  });

  app.server.start();

  const host = process.env.HOST ?? '127.0.0.1';
  const port = process.env.PORT ?? '3000';
  console.log(`✓ Server listening on http://${host}:${port}`);

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('✗ Failed to start:', msg);
  process.exit(1);
}
