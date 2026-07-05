/**
 * Matrix diagnostic tool.
 *
 * Scans the matrix in sweeps so you can identify which (row,col)
 * maps to which physical key.
 *
 * Passo 1 — varre cada uma das 16 linhas com cor diferente por coluna
 * Passo 2 — varre cada uma das 6 colunas com cor diferente por linha
 *
 * Usage: pnpm tsx tools/map-matrix.ts
 */

import { DeviceManager } from '../src/device.js';

const dev = new DeviceManager();
if (!dev.find()) {
  console.error('Keyboard not found or permission denied. Is it connected?');
  console.error('Try: sudo cp config/99-redragon.rules /etc/udev/rules.d/ && sudo udevadm control --reload-rules');
  process.exit(1);
}
try {
  dev.open();
} catch {
  console.error('Failed to open keyboard. Check permissions (udev rules).');
  process.exit(1);
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function buildFrame(
  colorFn: (row: number, col: number) => [number, number, number]
): Buffer {
  const frame = Buffer.alloc(382, 0);
  frame[0] = 0x08; frame[1] = 0x0a; frame[2] = 0x7a; frame[3] = 0x01;
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 6; c++) {
      const [red, grn, blu] = colorFn(r, c);
      const off = 4 + (r * 6 + c) * 3;
      frame[off] = red;
      frame[off + 1] = grn;
      frame[off + 2] = blu;
    }
  }
  return frame;
}

function allOff() {
  dev.sendFeatureReport(buildFrame(() => [0, 0, 0]));
}

async function rowSweep() {
  console.log('\n=== SWEEP 1: ONE ROW AT A TIME ===\n');
  console.log('Each row lights up for 3 seconds.');
  console.log('Each column has a different color:');
  console.log('  col0=Red  col1=Green  col2=Blue  col3=Yellow  col4=Cyan  col5=Magenta\n');

  for (let row = 0; row < 16; row++) {
    process.stdout.write(`Row ${row}: `);
    const frame = buildFrame((r, c) => {
      if (r !== row) return [0, 0, 0];
      const colors: [number, number, number][] = [
        [255, 0, 0],    // Red
        [0, 255, 0],    // Green
        [0, 0, 255],    // Blue
        [255, 255, 0],  // Yellow
        [0, 255, 255],  // Cyan
        [255, 0, 255],  // Magenta
      ];
      return colors[c] ?? [255, 255, 255];
    });
    dev.sendFeatureReport(frame);
    await delay(3000);
    allOff();
    console.log('✓');
  }
}

async function colSweep() {
  console.log('\n=== SWEEP 2: ONE COLUMN AT A TIME ===\n');
  console.log('Each column lights up for 3 seconds.');
  console.log('Each row has a different color:');
  console.log('  rows 0-3=Red  4-7=Green  8-11=Blue  12-15=Yellow\n');

  for (let col = 0; col < 6; col++) {
    process.stdout.write(`Col ${col}: `);
    const frame = buildFrame((r, c) => {
      if (c !== col) return [0, 0, 0];
      if (r < 4) return [255, 0, 0];
      if (r < 8) return [0, 255, 0];
      if (r < 12) return [0, 0, 255];
      return [255, 255, 0];
    });
    dev.sendFeatureReport(frame);
    await delay(3000);
    allOff();
    console.log('✓');
  }
}

async function flashAll() {
  console.log('\n=== ALL KEYS ON (full white) ===\n');
  const frame = buildFrame(() => [255, 255, 255]);
  dev.sendFeatureReport(frame);
  await delay(5000);
  allOff();
}

async function main() {
  const action = process.argv[2] || 'all';

  if (action === 'row') { await rowSweep(); }
  else if (action === 'col') { await colSweep(); }
  else if (action === 'flash') { await flashAll(); }
  else {
    await flashAll();
    await rowSweep();
    await colSweep();
  }

  dev.close();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); dev.close(); });
