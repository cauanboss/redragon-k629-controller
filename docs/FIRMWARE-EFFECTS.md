# Efeitos Firmware — Diagnóstico e Limitações

## Situação atual

Os efeitos firmware (static, rainbow, snake, star-twinkle, sine-wave, waterfall,
blossom, wheel) **não produzem alteração visual no teclado**. Todos os 8 efeitos
mostram o mesmo comportamento: o teclado permanece no estado anterior, ignorando
o burst firmware.

## O que foi testado

| Teste | Resultado |
|---|---|
| Burst com report ID original (`0x05` handshake, `0x06` blocos) | ❌ Ignorado |
| Burst com report ID `0x08` (mesmo do per-key) | ❌ Ignorado |
| Diferentes bytecodes (`0x01` static, `0x03` rainbow, `0x06` wheel, etc.) | ❌ Todos ignorados |
| Com clear frame per-key antes do burst | ❌ Ignorado |
| Sem clear frame (burst direto) | ❌ Ignorado |

## O que funciona

- **Per-key frame (382 bytes)**: `sendFeatureReport` com header `[0x08, 0x0A, 0x7A, 0x01]` — funciona perfeitamente
- **Efeitos host-driven**: `StaticEffect`, `RainbowEffect`, `WaveEffect`, `AudioVisualizerEffect`, `TypingReactiveEffect` — todos funcionam via per-key frames @ 30fps (EffectRunner)
- **Efeitos via tecla Fn**: Os efeitos nativos do MCU (Fn + tecla) funcionam
  - Cor fixa que varia
  - Respiração (pulsa fade in/out)
  - Reativo (tecla acende linha e coluna)
  - Aleatório (twinkle)
  - Cor fixa cíclica

## Hipóteses descartadas

1. ~~Report ID errado~~ — Testado com `0x08` (mesmo do per-key). Sem efeito.
2. ~~Clear frame interferindo~~ — Removido o clear frame. Sem efeito.
3. ~~Bytecodes errados~~ — Testados múltiplos bytecodes. Todos ignorados.
4. ~~Erro de USB silencioso~~ — `sendFeatureReport` não lança exceção, frames são aceitos pelo driver.

## Hipóteses a investigar (futuro)

1. **Output report vs Feature report**: O MCU pode esperar os comandos de firmware
   como **output reports** (endpoint interrupt), não feature reports (endpoint control).
   `node-hid` suporta `device.write()` para output reports. Não testado.

2. **Formato de burst diferente**: O burst de 5×1032 bytes foi extraído de outro
   modelo Sinowealth. O K629CGO-PRO-M pode usar um formato completamente diferente
   (tamanho de frame, número de blocos, ordem dos blocos, offsets internos).

3. **Interface HID diferente**: O controle RGB está na interface `usagePage 0xFF00`.
   Os efeitos firmware podem estar em outra interface HID do mesmo dispositivo.

4. **Comando single-byte**: Em vez de um burst complexo, o MCU pode aceitar um
   comando simples de poucos bytes com o modo de efeito e parâmetros.

## Plano de ação para consertar

A única forma confiável de descobrir o protocolo correto é **capturar o tráfego
USB do software oficial da Redragon no Windows**:

```bash
# No Windows (VM ou dual boot):
# 1. Instalar Wireshark + USBPcap
# 2. Iniciar captura no dispositivo Redragon
# 3. Abrir o software oficial e trocar entre os efeitos
# 4. Salvar a captura .pcap
# 5. Analisar os feature reports e output reports enviados
```

Ferramentas alternativas: `usbmon` no Linux (se o software oficial rodar no Wine).

## Alternativa funcional (implementada)

O dispatcher **prioriza efeitos host-driven** com os mesmos nomes da UI
(`static`, `rainbow`, `snake`, etc.). Cada um envia frames per-key a ~30 fps.

| Nome UI | Arquivo | Funciona no K629? |
|---|---|---|
| static | `effects/static.ts` | ✅ Cor sólida |
| rainbow | `effects/rainbow.ts` | ✅ Arco-íris animado |
| wave | `effects/wave.ts` | ✅ Onda horizontal |
| sine-wave | `effects/animations.ts` | ✅ Onda vertical |
| snake | `effects/animations.ts` | ✅ Cobra verde |
| star-twinkle | `effects/animations.ts` | ✅ Twinkle aleatório |
| waterfall | `effects/animations.ts` | ✅ Gotas por coluna |
| rainbow-blossom | `effects/animations.ts` | ✅ Radial do centro |
| wheel | `effects/animations.ts` | ✅ Roda de cores |
| audio-visualizer | `effects/audio-visualizer.ts` | ✅ Barras de áudio |
| typing-reactive | `effects/typing-reactive.ts` | ✅ Reativo a teclas |

As estratégias firmware em `dispatcher.ts` permanecem como fallback para
outros modelos, mas **não são usadas** enquanto existir um efeito host com o mesmo nome.
