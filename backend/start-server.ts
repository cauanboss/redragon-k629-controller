import {
  createApplicationFromEnv,
  type Application,
} from './factory/app-factory.js';

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
    console.log('  USB IDs expected: 258a:0049 (wired) / 25a7:fa70 (wireless)');
    console.log('  Web UI will start, but keyboard commands require a device.');
  }

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
