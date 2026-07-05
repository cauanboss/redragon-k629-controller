/**
 * Localiza a posição correta de UMA tecla na matriz.
 *
 * Uso: pnpm tsx tools/find-key.ts <nome-da-tecla>
 *
 * Exemplo: pnpm tsx tools/find-key.ts x
 *          pnpm tsx tools/find-key.ts lalt
 *
 * O script testa TODAS as 96 posições, uma por vez (2s cada).
 * Quando a TECLA FÍSICA acender, anote a posição (row,col) e me informe.
 */

import { DeviceManager } from '../src/device.js';

const keyName = process.argv[2];
if (!keyName) {
  console.error('Uso: pnpm tsx tools/find-key.ts <nome>');
  process.exit(1);
}

const dev = new DeviceManager();
if (!dev.find()) { console.error('Keyboard not found.'); process.exit(1); }
try { dev.open(); } catch { console.error('Permission denied.'); process.exit(1); }

/**
 * Hardware LED matrix is 6 rows × 16 columns.
 * Our layout stores at (layoutRow=0..15, layoutCol=0..5).
 * Mapping: hwRow = layoutCol, hwCol = layoutRow (transposed).
 * Frame offset = 4 + (hwRow * 16 + hwCol) * 3
 */
function sendFrame(layoutRow: number, layoutCol: number, r = 255, g = 0, b = 0) {
  const hwRow = layoutCol;
  const hwCol = layoutRow;
  const buf = Buffer.alloc(382, 0);
  buf[0] = 0x08; buf[1] = 0x0a; buf[2] = 0x7a; buf[3] = 0x01;
  const off = 4 + (hwRow * 16 + hwCol) * 3;
  buf[off] = r; buf[off + 1] = g; buf[off + 2] = b;
  dev.sendFeatureReport(buf);
}

function allOff() {
  dev.sendFeatureReport(Buffer.alloc(382, 0));
}

async function main() {
  console.log(`\nProcurando tecla "${keyName}"...`);
  console.log('Vou acender UMA posição por vez (2s cada).');
  console.log(`Quando a tecla "${keyName}" acender, anote a posição.\n`);

  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 6; col++) {
      process.stdout.write(`\rTestando (${row},${col})... `);
      sendFrame(row, col);
      await new Promise(r => setTimeout(r, 2000));
      allOff();
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log('\n\nFim do teste.');
  dev.close();
}

main().catch(e => { console.error(e); dev.close(); process.exit(1); });
