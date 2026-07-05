/**
 * Teste rápido — acende APENAS as posições problemáticas
 * com cores diferentes para identificar qual está errada.
 */
import { DeviceManager } from '../device.js';

const dev = new DeviceManager();
if (!dev.find()) process.exit(1);
try { dev.open(); } catch { process.exit(1); }

function send(buf: Buffer) { dev.sendFeatureReport(buf); }

function allColor(r: number, g: number, b: number) {
  const buf = Buffer.alloc(382, 0);
  buf[0] = 0x08; buf[1] = 0x0a; buf[2] = 0x7a; buf[3] = 0x01;
  // Preenche TODAS as 96 posições com a mesma cor
  for (let off = 4; off < 4 + 96 * 3; off += 3) {
    buf[off] = r; buf[off + 1] = g; buf[off + 2] = b;
  }
  return buf;
}

function oneColor(row: number, col: number, r: number, g: number, b: number) {
  const buf = Buffer.alloc(382, 0);
  buf[0] = 0x08; buf[1] = 0x0a; buf[2] = 0x7a; buf[3] = 0x01;
  const off = 4 + (row * 6 + col) * 3;
  buf[off] = r; buf[off + 1] = g; buf[off + 2] = b;
  return buf;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  // 1. Todas as teclas BRANCAS
  console.log('1. Todas brancas...');
  send(allColor(255, 255, 255));
  await delay(3000);

  // 2. Todas VERMELHAS
  console.log('2. Todas vermelhas...');
  send(allColor(255, 0, 0));
  await delay(3000);

  // 3. Testa posições próximas a 'x' (row 12)
  for (let c = 0; c < 6; c++) {
    console.log(`3. Apenas pos (12,${c}) = vermelho`);
    send(oneColor(12, c, 255, 0, 0));
    await delay(1500);
  }

  // 4. Testa posições próximas a '-' (row 4, col 5)
  for (let c = 0; c < 6; c++) {
    console.log(`4. Apenas pos (4,${c}) = verde`);
    send(oneColor(4, c, 0, 255, 0));
    await delay(1500);
  }

  // 5. Testa posição do backtick (3,0)
  console.log('5. Pos (3,0) = azul');
  send(oneColor(3, 0, 0, 0, 255));
  await delay(1500);

  // 6. Testa posição de lbracket (7,5) — onde pode estar ^~ no ABNT2
  console.log('6. Pos (7,5) = amarelo');
  send(oneColor(7, 5, 255, 255, 0));
  await delay(1500);

  // 7. Testa outras posições para 'x'
  for (let c = 0; c < 6; c++) {
    console.log(`7. Apenas pos (13,${c}) = ciano`);
    send(oneColor(13, c, 0, 255, 255));
    await delay(1500);
  }

  // 8. Tudo apagado
  send(allColor(0, 0, 0));
  console.log('\nFim dos testes.');
  console.log('Quais teclas acenderam em cada etapa?');

  dev.close();
}

main().catch(e => { console.error(e); dev.close(); });
