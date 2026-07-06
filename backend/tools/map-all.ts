/**
 * Mapeamento rápido: acende UM LED por vez (índice 0-95).
 * Hardware: 96 LEDs, cada um controlado por um índice.
 *
 * Uso: pnpm tsx tools/map-all.ts
 *
 * O terminal mostra "Índice 0:", você digita o nome da tecla e Enter.
 * Se nada acender, aperte Enter vazio (marcado como null).
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

function sendIndex(idx: number, r = 255, g = 100, b = 0) {
  const buf = Buffer.alloc(382, 0);
  buf[0] = 0x08;
  buf[1] = 0x0a;
  buf[2] = 0x7a;
  buf[3] = 0x01;
  buf[4 + idx * 3] = r;
  buf[5 + idx * 3] = g;
  buf[6 + idx * 3] = b;
  dev.sendFeatureReport(buf);
}

async function main() {
  const readline = (await import('readline')).createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const results: { idx: number; key: string }[] = [];

  console.log('\nVou acender um LED por vez. Digite o NOME DA TECLA e Enter.');
  console.log('Ex: "Esc", "F1", "A", "Space", "Enter", "↑"\n');
  console.log('Se nada acender, aperte Enter vazio.\n');
  console.log('Pressione Ctrl+C para parar e ver o resultado.\n');
  console.log('Começando...\n');

  for (let idx = 0; idx < 96; idx++) {
    sendIndex(idx);

    const key = await new Promise<string>((resolve) => {
      setTimeout(() => resolve(''), 5000);
      readline.question(`Índice ${idx}: `, (answer) => resolve(answer.trim()));
    });

    results.push({ idx, key });
    sendIndex(0, 0, 0, 0); // apaga
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('\n\n=== RESULTADO ===\n');
  console.log('Coloque isso no layout.ts:\n');
  console.log('private static KEY_DEFS: [number, number, RawKeyDef][] = [');
  for (const r of results) {
    if (r.key) {
      const row = Math.floor(r.idx / 6);
      const col = r.idx % 6;
      const label = r.key.charAt(0).toUpperCase() + r.key.slice(1);
      const id = r.key.toLowerCase();
      console.log(`  [${row}, ${col}, { id: '${id}', label: '${label}' }],`);
    }
  }
  console.log('];\n');

  const nulls = results
    .filter((r) => !r.key)
    .map((r) => `[${Math.floor(r.idx / 6)}, ${r.idx % 6}]`);
  console.log('private static NULL_CELLS: [number, number][] = [');
  for (const n of nulls) {
    console.log(`  ${n},`);
  }
  console.log('];');

  readline.close();
  dev.close();
}

main().catch((e) => {
  console.error(e);
  dev.close();
  process.exit(1);
});
