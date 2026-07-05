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

Documentação completa dos padrões de projeto, camadas e como estender o código:
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

```
src/
├── ports/                # Interfaces (Hexagonal / DIP)
│   ├── idevice.ts        #   Port USB HID
│   └── iprofile-repository.ts
├── commands/             # Command — ações WebSocket
│   ├── keyboard.commands.ts
│   └── registry.ts
├── observer/             # Observer — eventos do servidor
│   └── server-events.ts
├── effects/
│   ├── dispatcher.ts     # Strategy — firmware vs host
│   ├── registry.ts         # Registry — catálogo de efeitos
│   └── …
├── infrastructure/
│   └── profile-store.ts  # Repository — persistência de perfis
├── factory/
│   └── app-factory.ts    # Factory — composição da aplicação
├── patterns/
│   └── firmware-burst.ts # Template Method — burst firmware
├── controller.ts         # Facade — orquestra device + protocol + effects
├── device.ts             # Adapter — IDevice via node-hid
├── protocol.ts           # FrameBuilder — frames 382B per-key + bursts firmware
├── server.ts             # UIServer — Express + WebSocket
└── …
```

### Padrões de projeto

| Padrão | Onde | Função |
|---|---|---|
| **Facade** | `Controller` | API única para CLI, servidor e runner |
| **Strategy** | `IEffect`, `IEffectStrategy` | Efeitos host-driven e firmware intercambiáveis |
| **Command** | `commands/` | Cada mensagem WebSocket vira um comando testável |
| **Observer** | `observer/server-events.ts` | Comandos emitem eventos; servidor despacha para clientes |
| **Repository** | `FileProfileRepository` | Persistência de perfis desacoplada do servidor |
| **Registry** | `effects/registry.ts` | Catálogo extensível de efeitos host-driven |
| **Adapter** | `DeviceManager` | Implementa `IDevice` sobre node-hid |
| **Ports & Adapters** | `ports/` | Controller e comandos dependem de abstrações |
| **Template Method** | `patterns/firmware-burst.ts` | Algoritmo fixo de burst firmware; subclasses definem frames |
| **Factory** | `factory/app-factory.ts` | Monta Controller + UIServer + dependências |
| **Decorator** | `decorators/logging-device.ts` | Logging transparente de chamadas USB HID via `IDevice` |

## Pré-requisitos

- **Node.js** ≥ 18
- **pnpm** (instalar com `npm install -g pnpm`)
- **Teclado Redragon K629CGO-PRO-M** conectado via USB

## Instalação

```bash
git clone git@github.com:cauanboss/redragon-k629-controller.git
cd redragon-k629-controller
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

Variáveis de ambiente opcionais: `PORT` (padrão 3000), `HOST` (padrão 127.0.0.1).

## Comandos de desenvolvimento

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia servidor web (tsx) |
| `pnpm dev:server` | Idem |
| `pnpm dev:cli` | CLI (tsx) |
| `pnpm build` | Compila TypeScript para dist/ |
| `pnpm test` | Roda 122 testes unitários |
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

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Padrões de projeto, camadas, como estender |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Histórico das mudanças arquiteturais |

## Licença

MIT
