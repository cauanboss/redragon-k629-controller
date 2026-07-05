import { Controller } from './controller.js';
import { UIServer } from './server.js';

const controller = new Controller();
const server = new UIServer(controller, 3000);

try {
  if (controller.connect()) {
    console.log('✓ Keyboard connected');
  } else {
    console.log('! Keyboard not found — connect it or check udev rules');
    console.log('  USB IDs expected: 258a:0049 (wired) / 25a7:fa70 (wireless)');
    console.log('  75% of features will still work without a keyboard.');
  }

  server.start();
  console.log(`✓ Server listening on http://localhost:3000`);
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('✗ Failed to start:', msg);
  process.exit(1);
}
