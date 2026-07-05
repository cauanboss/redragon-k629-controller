/**
 * Interactive key identifier.
 *
 * Lights up each matrix position and asks you to type the key name.
 * Run this with the keyboard in front of you.
 *
 * Usage: pnpm tsx tools/identify-keys.ts
 */

import { DeviceManager } from '../device.js';

const dev = new DeviceManager();
if (!dev.find()) {
  console.error('Keyboard not found.');
  process.exit(1);
}
try { dev.open(); } catch {
  console.error('Permission denied. Install udev rules first.');
  process.exit(1);
}

function sendFrame(row: number, col: number) {
  const buf = Buffer.alloc(382, 0);
  buf[0] = 0x08; buf[1] = 0x0a; buf[2] = 0x7a; buf[3] = 0x01;
  const off = 4 + (row * 6 + col) * 3;
  buf[off] = 255; buf[off + 1] = 0; buf[off + 2] = 0;
  dev.sendFeatureReport(buf);
}

function allOff() {
  const buf = Buffer.alloc(382, 0);
  dev.sendFeatureReport(buf);
}

async function identify() {
  const readline = (await import('readline')).createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const results: { row: number; col: number; label: string }[] = [];

  console.log('\n=== Key Identifier ===');
  console.log('I will light up ONE key at a time.');
  console.log('Type the KEY NAME (e.g. "X", "Esc", "F1") and press Enter.');
  console.log('Press Enter EMPTY (just press Enter) to skip/mark as null.\n');
  console.log('Start with typing the LABEL of the key that is RED:\n');

  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 6; col++) {
      sendFrame(row, col);

      const label = await new Promise<string>(resolve => {
        const timeout = setTimeout(() => {
          resolve('');
        }, 8000);

        readline.question(`(${row},${col}) → `, (answer) => {
          clearTimeout(timeout);
          resolve(answer.trim());
        });
      });

      results.push({ row, col, label: label || '(null)' });
      allOff();
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log('\n\n=== MATRIX RESULTS ===\n');
  console.log('Copy this into layout.ts:\n');
  console.log('private static KEY_DEFS: [number, number, RawKeyDef][] = [');
  for (const r of results) {
    if (r.label && r.label !== '(null)') {
      console.log(`  [${r.row}, ${r.col}, { id: '${r.label.toLowerCase()}', label: '${r.label}' }],`);
    }
  }
  console.log('];\n');
  console.log('private static NULL_CELLS: [number, number][] = [');
  for (const r of results) {
    if (!r.label || r.label === '(null)') {
      console.log(`  [${r.row}, ${r.col}],`);
    }
  }
  console.log('];');

  readline.close();
  dev.close();
}

identify().catch(e => { console.error(e); dev.close(); process.exit(1); });
