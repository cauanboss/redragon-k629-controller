/**
 * Mapeamento rápido: acende um LED por vez (índice 0-95).
 * Digite o NOME da tecla que acendeu e Enter.
 * Se nada acender, digite "x" e Enter.
 * Para pular, só Enter (depois volta).
 *
 * Uso: pnpm tsx tools/map-quick.ts
 */

import { DeviceManager } from '../device.js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

function send(idx: number, r = 255, g = 100, b = 0) {
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

function off() {
  const buf = Buffer.alloc(382, 0);
  buf[0] = 0x08;
  buf[1] = 0x0a;
  buf[2] = 0x7a;
  buf[3] = 0x01;
  dev.sendFeatureReport(buf);
}

async function main() {
  const rl = (await import('readline')).createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (q: string) => new Promise<string>((r) => rl.question(q, r));

  const map = new Map<number, string>();

  console.log('\nCada LED acende por 3 segundos. Digite o NOME e Enter.');
  console.log('Se nada acender, digite x');
  console.log('Enter vazio = pula (volta depois)\n');

  // Agrupa em blocos de 10 para facilitar
  for (let block = 0; block < 10; block++) {
    console.log(`\n--- Bloco ${block * 10}-${Math.min(block * 10 + 9, 95)} ---`);

    for (let i = block * 10; i < Math.min(block * 10 + 10, 96); i++) {
      send(i);

      const key = await question(`  LED ${i}: `);
      if (key) map.set(i, key);

      off();
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log('\n\n=== MAPEAMENTO COMPLETO ===\n');

  // Mostrar os que ficaram sem nome
  const unnamed: number[] = [];
  for (let i = 0; i < 96; i++) if (!map.has(i)) unnamed.push(i);

  if (unnamed.length > 0) {
    console.log(`Faltam ${unnamed.length} LEDs: ${unnamed.join(', ')}`);
    console.log('Quer nomeá-los agora? (s/N)');
    const resp = await question('');
    if (resp.toLowerCase() === 's') {
      for (const i of unnamed) {
        send(i);
        const key = await question(`  LED ${i} (faltou): `);
        if (key) map.set(i, key);
        off();
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  // Gera o conteúdo do layout.ts
  const keys2 = [...map.entries()]
    .filter(([_, v]) => v && v !== 'x')
    .map(([idx, label]) => {
      const row = Math.floor(idx / 6);
      const col = idx % 6;
      const id = label.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cap = label.charAt(0).toUpperCase() + label.slice(1);
      return { row, col, id, cap, idx };
    })
    .sort((a, b) => a.idx - b.idx);

  const nulls = [...map.entries()]
    .filter(([_, v]) => !v || v === 'x')
    .map(([idx]) => ({ row: Math.floor(idx / 6), col: idx % 6 }));

  // Monta o arquivo layout.ts
  const content = `export interface KeyPosition {
  row: number;
  col: number;
}

export interface KeyInfo {
  id: string;
  label: string;
  position: KeyPosition;
  width?: number;
}

interface RawKeyDef {
  id: string;
  label: string;
  width?: number;
}

export class KeyLayout {
  static readonly ROWS = 16;
  static readonly COLS = 6;

  readonly keys: KeyInfo[];
  readonly matrix: (KeyInfo | null)[][];

  constructor() {
    this.keys = this.buildKeys();
    this.matrix = this.buildMatrix();
  }

  getKey(row: number, col: number): KeyInfo | null {
    if (row < 0 || row >= KeyLayout.ROWS || col < 0 || col >= KeyLayout.COLS) {
      return null;
    }
    return this.matrix[row][col];
  }

  getKeyById(id: string): KeyInfo | undefined {
    return this.keys.find(k => k.id === id);
  }

  toJSON(): KeyInfo[] {
    return this.keys.map(k => ({
      ...k,
      position: { ...k.position },
    }));
  }

  // ---------------------------------------------------------------
  // Gerado automaticamente pelo map-quick.ts
  // ---------------------------------------------------------------
  private static KEY_DEFS: [number, number, RawKeyDef][] = [
${keys2.map((k) => `    [${k.row}, ${k.col}, { id: '${k.id}', label: '${k.cap}' }],`).join('\n')}
  ];

  private static NULL_CELLS: [number, number][] = [
${nulls.map((n) => `    [${n.row}, ${n.col}],`).join('\n')}
  ];

  private buildKeys(): KeyInfo[] {
    return KeyLayout.KEY_DEFS.map(([row, col, def]) => ({
      id: def.id,
      label: def.label,
      position: { row, col },
      width: def.width,
    }));
  }

  private buildMatrix(): (KeyInfo | null)[][] {
    const matrix: (KeyInfo | null)[][] = [];

    for (let r = 0; r < KeyLayout.ROWS; r++) {
      matrix[r] = [];
      for (let c = 0; c < KeyLayout.COLS; c++) {
        matrix[r][c] = null;
      }
    }

    for (const key of this.keys) {
      matrix[key.position.row][key.position.col] = key;
    }

    return matrix;
  }
}
`;

  const layoutPath = resolve(dirname(fileURLToPath(import.meta.url)), '../layout.ts');
  writeFileSync(layoutPath, content, 'utf-8');
  console.log(`\n✓ layout.ts atualizado em ${layoutPath}`);
  console.log(`  ${keys2.length} teclas, ${nulls.length} posições nulas\n`);

  rl.close();
  dev.close();
}

main().catch((e) => {
  console.error(e);
  dev.close();
  process.exit(1);
});
