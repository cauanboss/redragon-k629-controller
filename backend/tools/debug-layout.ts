/**
 * Debug: testa o mapeamento da matriz.
 *
 * Acende APENAS UMA posição por vez, com 3 segundos de intervalo.
 * O terminal mostra:   Testando hardware (hwRow, hwCol) → layout (layoutRow, layoutCol)
 *
 * hwRow = 0..5   (6 linhas no hardware)
 * hwCol = 0..15  (16 colunas no hardware)
 *
 * Uso:
 *   pnpm tsx tools/debug-layout.ts all        # varre TUDO (96 posições)
 *   pnpm tsx tools/debug-layout.ts row 0      # só a linha 0
 *   pnpm tsx tools/debug-layout.ts cell 2 12  # só a célula (2,12)
 *   pnpm tsx tools/debug-layout.ts pos 12 2   # célula da layout (12,2)
 */

import { DeviceManager } from '../device.js';

const dev = new DeviceManager();
if (!dev.find()) {
  console.error('Keyboard not found.');
  process.exit(1);
}
try {
  dev.open();
} catch {
  console.error('Permission denied.');
  process.exit(1);
}

function sendHw(hwRow: number, hwCol: number, r = 255, g = 0, b = 0) {
  const buf = Buffer.alloc(382, 0);
  buf[0] = 0x08;
  buf[1] = 0x0a;
  buf[2] = 0x7a;
  buf[3] = 0x01;
  const off = 4 + (hwRow * 16 + hwCol) * 3;
  buf[off] = r;
  buf[off + 1] = g;
  buf[off + 2] = b;
  dev.sendFeatureReport(buf);
}

function allOff() {
  const buf = Buffer.alloc(382, 0);
  buf[0] = 0x08;
  buf[1] = 0x0a;
  buf[2] = 0x7a;
  buf[3] = 0x01; // header obrigatório
  dev.sendFeatureReport(buf);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function testHwCell(hwRow: number, hwCol: number) {
  process.stdout.write(`\rhw(${hwRow},${hwCol}) → layout(${hwCol},${hwRow})  `);
  sendHw(hwRow, hwCol);
  await sleep(3000);
  allOff();
  await sleep(300);
}

async function main() {
  const cmd = process.argv[2];

  if (cmd === 'all') {
    console.log('\nVarrendo hardware 6×16:\n');
    for (let hwRow = 0; hwRow < 6; hwRow++) {
      for (let hwCol = 0; hwCol < 16; hwCol++) {
        await testHwCell(hwRow, hwCol);
      }
    }
  } else if (cmd === 'row') {
    const hwRow = parseInt(process.argv[3] || '0');
    console.log(`\nTestando hardware row ${hwRow}:`);
    for (let hwCol = 0; hwCol < 16; hwCol++) {
      await testHwCell(hwRow, hwCol);
    }
  } else if (cmd === 'cell') {
    const hwRow = parseInt(process.argv[3] || '0');
    const hwCol = parseInt(process.argv[4] || '0');
    console.log(`\nTestando hw(${hwRow},${hwCol}) por 10s...`);
    sendHw(hwRow, hwCol, 0, 255, 0);
    await sleep(10000);
    allOff();
  } else if (cmd === 'pos') {
    // Test by layout position (transposed to hw)
    const lRow = parseInt(process.argv[3] || '0');
    const lCol = parseInt(process.argv[4] || '0');
    const hwRow = lCol;
    const hwCol = lRow;
    console.log(`\nLayout(${lRow},${lCol}) → hw(${hwRow},${hwCol}) por 10s...`);
    sendHw(hwRow, hwCol, 0, 255, 0);
    await sleep(10000);
    allOff();
  } else {
    console.log('Uso:');
    console.log('  pnpm tsx tools/debug-layout.ts all');
    console.log('  pnpm tsx tools/debug-layout.ts row <0-5>');
    console.log('  pnpm tsx tools/debug-layout.ts cell <hwRow> <hwCol>');
    console.log('  pnpm tsx tools/debug-layout.ts pos <layoutRow> <layoutCol>');
  }

  dev.close();
  console.log('\nFim.');
}

main().catch((e) => {
  console.error(e);
  dev.close();
  process.exit(1);
});
