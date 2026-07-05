/**
 * Ilumina uma LINHA específica da matriz.
 * Use para verificar quais teclas físicas correspondem a cada linha.
 *
 * Uso: pnpm tsx tools/check-row.ts <row> [cor]
 *   row = 0 a 15
 *   cor = red (default), green, blue, white
 *
 * Exemplo: pnpm tsx tools/check-row.ts 12
 *          pnpm tsx tools/check-row.ts 4 green
 */
import { DeviceManager } from '../src/device.js';

const row = parseInt(process.argv[2] || '0');
const colorName = process.argv[3] || 'red';

const COLORS: Record<string, [number, number, number]> = {
  red: [255, 0, 0],
  green: [0, 255, 0],
  blue: [0, 0, 255],
  white: [128, 128, 128],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
};

const [r, g, b] = COLORS[colorName] || COLORS.red;

const dev = new DeviceManager();
if (!dev.find()) { console.error('Keyboard not found.'); process.exit(1); }
try { dev.open(); } catch { console.error('Permission denied.'); process.exit(1); }

// Fill only the target row with color, rest black
const buf = Buffer.alloc(382, 0);
buf[0] = 0x08; buf[1] = 0x0a; buf[2] = 0x7a; buf[3] = 0x01;

for (let col = 0; col < 6; col++) {
  const off = 4 + (row * 6 + col) * 3;
  buf[off] = r; buf[off + 1] = g; buf[off + 2] = b;
}

dev.sendFeatureReport(buf);

console.log(`\nRow ${row} is lit in ${colorName}.`);
console.log('Which physical keys are lit? Type them below.\n');
console.log('Each column has a SEPARATE key. Which 6 keys (or fewer) light up?\n');

process.stdin.once('data', () => {
  // Turn off
  const off = Buffer.alloc(382, 0);
  dev.sendFeatureReport(off);
  dev.close();
  console.log('Off.');
});
