# Redragon K629CGO-PRO-M Controller

Software para controle do teclado mecânico **Redragon K629CGO-PRO-M** (tri-mode USB/2.4GHz/Bluetooth) no Linux.

## Funcionalidades

- Controle RGB per-key (cada tecla individualmente)
- Efeitos firmware nativos (static, rainbow, wave) — rodam no MCU do teclado
- Efeitos host-driven (streaming de frames via USB)
- CLI para scripts e automação
- Interface web com grid visual do teclado TKL
- Detecção automática dos modos wired (258a:0049) e wireless (25a7:fa70)

## Arquitetura

```
src/
├── color.ts              # RGBColor — value object
├── layout.ts             # KeyLayout — matriz 16×6, 87 teclas TKL
├── effect.ts             # IEffect — interface Strategy para efeitos
├── effects/              # Implementações de efeitos
│   ├── static.ts         #   Cor fixa
│   ├── rainbow.ts        #   Arco-íris HSV
│   ├── wave.ts           #   Onda senoidal
│   └── index.ts          #   Registry
├── device.ts             # DeviceManager — USB HID (node-hid)
├── protocol.ts           # FrameBuilder — frames 382B per-key + bursts firmware
├── controller.ts         # Facade — orquestra device + protocol + effects
├── runner.ts             # EffectRunner — loop de animação host-driven
├── server.ts             # UIServer — Express + WebSocket
├── cli.ts                # CLI — Commander
├── start-server.ts       # Entry point do servidor web
└── index.ts              # Barrel exports
```

## Pré-requisitos

- **Node.js** ≥ 18
- **pnpm** (instalar com `npm install -g pnpm`)
- **Teclado Redragon K629CGO-PRO-M** conectado via USB

## Instalação

```bash
git clone <url> teclado-redragon
cd teclado-redragon
pnpm install

# Permissão USB (necessário uma vez)
sudo cp config/99-redragon.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
```

Desconecte e reconecte o cabo USB do teclado após aplicar as regras.

## Uso

### Interface web

```bash
pnpm dev
# Abrir http://localhost:3000
```

Grid visual do teclado TKL com:
- Clique em cada tecla → color picker
- Botões: Static, Rainbow, Wave
- Sliders de brilho (0–5) e velocidade (0–5)
- Aplicar cor única em todas as teclas
- Botão Reset

### CLI

```bash
# Informações do teclado
pnpm dev:cli info

# Listar efeitos disponíveis
pnpm dev:cli list-effects

# Cor sólida em todas as teclas (hex sem #)
pnpm dev:cli color ff0000

# Cor em uma tecla específica
pnpm dev:cli key-color esc 00ff00

# Efeito firmware arco-íris
pnpm dev:cli rainbow [brilho] [velocidade]

# Efeito firmware estático
pnpm dev:cli static aaff00 [brilho]

# Conectar manualmente
pnpm dev:cli connect

# Desconectar
pnpm dev:cli disconnect
```

### Produção (build)

```bash
pnpm build          # Compila TS + copia assets
pnpm start          # node dist/start-server.js
pnpm cli color ff0000   # CLI compilada
```

## Comandos de desenvolvimento

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia servidor web (tsx) |
| `pnpm dev:server` | Idem |
| `pnpm dev:cli` | CLI (tsx) |
| `pnpm build` | Compila TypeScript para dist/ |
| `pnpm test` | Roda 110 testes unitários |
| `pnpm test:watch` | Testes em watch mode |

## Protocolo

O teclado usa o chipset **Sinowealth SH68F90A** (BY Tech, VID 0x258A PID 0x0049).

### Per-key direct control

Frame de **382 bytes** via HID feature report:

```
[0x08, 0x0A, 0x7A, 0x01]   ← header fixo
[96 × RGB (row-major)]       ← matriz 16×6 na ordem linha-coluna
[90 × 0x00]                  ← padding
```

### Firmware effects

Burst de **5 feature reports** (cada 1032 bytes):

1. Handshake: `[0x05, 0x83, 0xB6, 0x00, 0x00, 0x00]`
2. Block 1: cor R,G,B nos bytes 29–31
3. Block 2: cursor 0xBC
4. Block 3: cursor 0xC0
5. Block 4: mode no byte 21, (speed<<4 | brightness) no byte 69

### Modos firmware

| Byte | Efeito |
|---|---|
| 0x01 | Static |
| 0x03 | Rainbow |
| 0x06 | Wheel |
| 0x08 | Star Twinkle |
| 0x0A | Snake |
| 0x0D | Sine Wave |
| 0x10 | Waterfall |
| 0x11 | Rainbow Blossom |

## Solução de problemas

| Problema | Causa | Solução |
|---|---|---|
| `Could not connect` | Sem permissão USB | `sudo cp config/99-redragon.rules /etc/udev/rules.d/` + reconectar |
| `No matching version found` | Versão do @types errada | Rodar `pnpm install --no-frozen-lockfile` |
| Module not found | Build desatualizado | `pnpm build` |
| Teclado não acende | Modo wireless sem dongle | Conectar via USB ou parear o dongle 25a7:fa70 |

## Licença

MIT
