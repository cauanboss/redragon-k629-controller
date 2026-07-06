# Arquitetura e padrões de projeto

Este documento descreve a refatoração arquitetural do **redragon-k629-controller**: quais padrões foram introduzidos, por quê, onde ficam no código e como estender o projeto.

## Objetivos da refatoração

1. **Separar responsabilidades** — protocolo USB, efeitos, servidor web e persistência em camadas distintas.
2. **Facilitar testes** — dependências injetáveis via interfaces (`ports/`).
3. **Eliminar duplicação** — lógica de efeitos e handlers WebSocket centralizados.
4. **Melhorar operação** — servidor em loopback por padrão, shutdown gracioso, script `start` correto.

---

## Visão geral das camadas

```
┌─────────────────────────────────────────────────────────────┐
│  Entry points                                               │
│  start-server.ts · cli.ts                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ Factory
┌──────────────────────────▼──────────────────────────────────┐
│  factory/app-factory.ts                                     │
│  Monta Controller + UIServer + dependências                 │
└──────────────┬─────────────────────────────┬────────────────┘
               │                             │
┌──────────────▼──────────────┐   ┌──────────▼─────────────────┐
│  Controller (Facade)       │   │  UIServer                   │
│  device · protocol · effects │   │  Express + WebSocket        │
└──────────────┬──────────────┘   └──────────┬─────────────────┘
               │                             │ CommandRegistry
┌──────────────▼──────────────┐   ┌──────────▼─────────────────┐
│  IDevice (port)              │   │  commands/                  │
│  DeviceManager (adapter)     │   │  keyboard.commands.ts       │
│  FrameBuilder · KeyLayout    │   └──────────┬─────────────────┘
│  EffectRunner · IEffect      │              │ ServerEvent
└──────────────────────────────┘   ┌──────────▼─────────────────┐
                                   │  observer/server-events.ts  │
                                   └─────────────────────────────┘
```

---

## Padrões implementados

### Facade — `Controller`

**Arquivo:** `backend/controller.ts`

Orquestra device, protocolo, layout e efeitos. CLI, servidor e `EffectRunner` falam apenas com o `Controller`, sem conhecer HID ou frames.

```typescript
const controller = new Controller({ device: customDevice });
controller.connect();
controller.setAllColor({ r: 255, g: 0, b: 0 });
controller.applyFirmwareRainbow(3, 2);
controller.startEffect(waveEffect, 30);
```

**Injeção de dependências:**

```typescript
interface ControllerDependencies {
  device?: IDevice;   // padrão: DeviceManager
  layout?: KeyLayout; // padrão: KeyLayout()
}
```

---

### Ports & Adapters + Adapter — `ports/` e `DeviceManager`

**Arquivos:**
- `backend/ports/idevice.ts` — interface USB
- `backend/ports/iprofile-repository.ts` — interface de perfis
- `backend/device.ts` — `DeviceManager implements IDevice`

O `Controller` depende de `IDevice`, não de `node-hid`. Em testes, basta passar um mock:

```typescript
const device: IDevice = {
  find: () => true,
  open: () => {},
  close: () => {},
  isConnected: () => true,
  sendFeatureReport: () => {},
};
new Controller({ device });
```

---

### Strategy — efeitos host-driven e firmware

**Arquivos:**
- `backend/effect.ts` — `IEffect` (host-driven: `getColorAt`)
- `backend/effects/static.ts`, `rainbow.ts`, `wave.ts` — implementações
- `backend/effects/dispatcher.ts` — `IEffectStrategy` para modos firmware

O **EffectDispatcher** escolhe a estratégia correta:

| Nome     | Tipo      | Classe                         |
|----------|-----------|--------------------------------|
| `static` | firmware  | `FirmwareStaticStrategy`       |
| `rainbow`| firmware  | `FirmwareRainbowStrategy`      |
| `wave`   | host      | `WaveEffect` via registry      |

Usado por `cli.ts` e pelo comando WebSocket `apply_effect`:

```typescript
import { defaultEffectDispatcher } from './effects/dispatcher.js';

defaultEffectDispatcher.apply('rainbow', controller, {
  brightness: 3,
  speed: 2,
});
```

---

### Registry — catálogo de efeitos host-driven

**Arquivo:** `backend/effects/registry.ts`

Mapa extensível de efeitos. Registro no boot em `backend/effects/index.ts`:

```typescript
import { registerEffect } from './registry.js';
import { MyCustomEffect } from './my-custom.js';

registerEffect(new MyCustomEffect());
```

---

### Template Method — burst firmware

**Arquivo:** `backend/patterns/firmware-burst.ts`

Antes, `Controller` repetia o loop `for (buf of buffers) sendFeatureReport(buf)` em `applyFirmwareStatic` e `applyFirmwareRainbow`.

Agora o algoritmo é fixo na classe base; subclasses só implementam `buildFrames()`:

```typescript
abstract class FirmwareBurstOperation {
  execute(): void {
    for (const frame of this.buildFrames()) {
      this.device.sendFeatureReport(frame);
    }
  }
  protected abstract buildFrames(): Buffer[];
}
```

| Subclasse               | Modo firmware |
|-------------------------|---------------|
| `StaticFirmwareBurst`   | cor fixa      |
| `RainbowFirmwareBurst`  | arco-íris     |

Para um novo modo firmware, crie outra subclasse de `FirmwareBurstOperation`.

---

### Command — mensagens WebSocket

**Arquivos:**
- `backend/commands/types.ts` — `ICommand`, `CommandContext`
- `backend/commands/keyboard.commands.ts` — um comando por ação
- `backend/commands/registry.ts` — `CommandRegistry.dispatch()`

Cada mensagem JSON `{ type: "..." }` vira um comando:

| `type`           | Comando                 |
|------------------|-------------------------|
| `get_layout`     | `GetLayoutCommand`      |
| `set_key_color`  | `SetKeyColorCommand`    |
| `set_colors`     | `SetColorsCommand`      |
| `apply_effect`   | `ApplyEffectCommand`    |
| `profile_save`   | `ProfileSaveCommand`    |
| …                | …                       |

Para adicionar um comando:

```typescript
export class MyCommand implements ICommand {
  readonly type = 'my_action';

  execute(context: CommandContext): CommandResult {
    // validar context.message
    // chamar context.controller ou context.profiles
    return broadcast({ type: 'my_event', ... });
  }
}

registry.register(new MyCommand());
```

---

### Observer — eventos do servidor

**Arquivo:** `backend/observer/server-events.ts`

Comandos não enviam WebSocket diretamente. Retornam `CommandResult` com eventos:

```typescript
type ServerEvent =
  | { kind: 'send'; data: Record<string, unknown> }      // só ao cliente atual
  | { kind: 'broadcast'; data: Record<string, unknown> } // todos os clientes
  | { kind: 'error'; message: string };
```

O `UIServer` despacha esses eventos após `CommandRegistry.dispatch()`.

Helpers: `send()`, `broadcast()`, `error()`, `combine()`.

A classe `Subject<T>` também está disponível para cenários de pub/sub mais genéricos.

---

### Repository — perfis salvos

**Arquivos:**
- `backend/ports/iprofile-repository.ts` — interface
- `backend/infrastructure/profile-store.ts` — `FileProfileRepository`

Persiste em `~/.config/redragon-k629/profiles.json`.

```typescript
interface IProfileRepository {
  list(): string[];
  save(profile: StoredProfile): void;
  load(name: string): StoredProfile | undefined;
  delete(name: string): boolean;
}
```

A API legada (`saveProfile`, `loadProfile`, …) continua funcionando via `defaultProfileRepository`.

---

### Decorator — `LoggingDeviceDecorator`

**Arquivo:** `backend/decorators/logging-device.ts`

Envolve qualquer implementação de `IDevice` para adicionar logging transparente nas chamadas USB. Útil para depuração de protocolo sem modificar o código do adapter ou do controller.

```typescript
import { LoggingDeviceDecorator } from './decorators/logging-device.js';
import { DeviceManager } from './device.js';
import { Controller } from './controller.js';

// Envolve o DeviceManager com logging
const controller = new Controller({
  device: new LoggingDeviceDecorator(new DeviceManager()),
});

controller.connect();
// [Device] find() → true
// [Device] open()
```

**Comportamento de logging por método:**

| Método              | Loga? | Formato                                            |
|---------------------|-------|----------------------------------------------------|
| `find()`            | Sim   | `[Device] find() → true/false`                    |
| `open()`            | Sim   | `[Device] open()`                                 |
| `close()`           | Sim   | `[Device] close()`                                |
| `isConnected()`     | Não   | *Silencioso — chamado com frequência, evitaria ruído* |
| `sendFeatureReport()`| Sim  | `[Device] sendFeatureReport | ${length}B | header: ${hex}` |

A função de logger é injetável (padrão: `console.log`), permitindo logger silencioso, formatadores customizados ou captura em testes:

```typescript
// Logger customizado
const logs: string[] = [];
const device = new LoggingDeviceDecorator(
  new DeviceManager(),
  (msg) => logs.push(msg),
);
```

---

### Factory — composição da aplicação

**Arquivo:** `backend/factory/app-factory.ts`

Centraliza a montagem de `Controller` + `UIServer`:

```typescript
import { createApplication, createApplicationFromEnv } from './factory/app-factory.js';

// Com config explícita (testes)
const app = createApplication({
  port: 3000,
  host: '127.0.0.1',
  controller: { device: mockDevice },
});

// Com variáveis de ambiente (produção)
const app = createApplicationFromEnv();

app.connect();
app.server.start();

// Shutdown
app.stop(); // disconnect + server.stop()
```

**Interface `Application`:**

| Método    | Descrição                              |
|-----------|----------------------------------------|
| `connect()` | Tenta abrir o teclado USB            |
| `start()`   | Conecta + inicia servidor HTTP/WS    |
| `stop()`    | Desconecta HID + para o servidor     |

**Variáveis de ambiente:**

| Variável | Padrão      | Descrição                          |
|----------|-------------|------------------------------------|
| `PORT`   | `3000`      | Porta HTTP/WebSocket               |
| `HOST`   | `127.0.0.1` | Interface de bind (loopback seguro)|

Para expor na rede local (sem autenticação — use com cuidado):

```bash
HOST=0.0.0.0 PORT=3000 pnpm dev
```

---

## Entry point — `start-server.ts`

Antes montava objetos manualmente. Agora:

1. `createApplicationFromEnv()` — Factory
2. Tenta conectar ao teclado
3. Inicia o servidor
4. Registra `SIGINT` / `SIGTERM` para shutdown gracioso

---

## Correções operacionais

| Problema                         | Correção                                      |
|----------------------------------|-----------------------------------------------|
| `pnpm start` executava `index.js` (só re-exports) | Aponta para `dist/start-server.js` |
| Servidor escutava em todas as interfaces | `HOST=127.0.0.1` por padrão          |
| Sem shutdown gracioso            | Handlers SIGINT/SIGTERM em `start-server.ts`  |
| Lógica de efeitos duplicada CLI/servidor | `EffectDispatcher` compartilhado      |
| Switch gigante no WebSocket      | `CommandRegistry` + comandos isolados         |
| Loop firmware duplicado          | `FirmwareBurstOperation` (Template Method)    |

---

## Testes adicionados

| Arquivo                         | O que cobre                          |
|---------------------------------|--------------------------------------|
| `tests/dispatcher.test.ts`      | Strategy/Dispatcher de efeitos       |
| `tests/commands.test.ts`        | CommandRegistry                      |
| `tests/profile-repository.test.ts` | FileProfileRepository             |
| `tests/firmware-burst.test.ts`  | Template Method (5 frames por burst) |
| `tests/app-factory.test.ts`     | Factory + injeção de device          |

Total atual: **176 testes** (`pnpm test`).

---

## Exports públicos

Tudo disponível via `backend/index.ts`:

```typescript
import {
  Controller,
  UIServer,
  createApplication,
  EffectDispatcher,
  CommandRegistry,
  FileProfileRepository,
  StaticFirmwareBurst,
  // ...
} from 'redragon-k629-controller';
```

---

### Plugin System — efeitos carregados de terceiros

**Arquivos:**
- `backend/effects/plugin-loader.ts` — varre `plugins/`, importa módulos e registra efeitos
- `backend/effects/plugins/` — diretório onde usuários colocam `.ts` ou `.js`

O plugin loader é chamado automaticamente durante o boot em `backend/effects/index.ts`.
Qualquer módulo no diretório `plugins/` que exporte um objeto implementando `IEffect`
(com `name`, `description` e `getColorAt`) é registrado no registry de efeitos.

**Exemplo — criando um plugin:**

```typescript
// backend/effects/plugins/red-flash.ts
import type { KeyInfo, RGBColor, IEffect } from '../../effect.js';

export class RedFlashEffect implements IEffect {
  readonly name = 'red-flash';
  readonly description = 'Pisca todas as teclas em vermelho';

  getColorAt(key: KeyInfo, step: number, time: number): RGBColor {
    return step % 2 === 0
      ? { r: 255, g: 0, b: 0 }
      : { r: 0, g: 0, b: 0 };
  }
}
```

Após colocar o arquivo em `backend/effects/plugins/`, o efeito `red-flash` estará
disponível via CLI (`redragon effect red-flash`) e WebSocket.

> **Nota:** Plugins são carregados apenas uma vez durante a inicialização.
> É necessário reiniciar o processo para detectar novos plugins.

---

### IEffectLifecycle — `backend/effect.ts`

**Arquivo:** `backend/effect.ts`

```typescript
export interface IEffectLifecycle {
  onStart(): void;
  onStop(): void;
}

export function hasLifecycle(effect: IEffect): effect is IEffect & IEffectLifecycle;
```

Efeitos que precisam de setup/teardown (áudio, evdev) implementam `IEffectLifecycle`. O `EffectRunner` chama `onStart()` no `start()` e `onStop()` no `stop()`. Efeitos como `AudioVisualizerEffect` e `TypingReactiveEffect` usam isso.

---

### IInputReader (Port) — `backend/ports/iinput-reader.ts`

Port para leitura de eventos de teclado. Implementado pelo `EvdevInputReader` (adapter em `backend/input/evdev-reader.ts`). Usado pelo `TypingReactiveEffect` para detectar teclas pressionadas.

---

### Tauri — `frontend/src-tauri/`

Wrapper nativo (GTK) para o frontend Angular. Inclui:
- Janela nativa GTK com o frontend Angular embedado
- Tray icon com menu Show/Quit
- Sidecar Node.js que spawna o backend na porta 3000
- Close-to-tray (fechar minimiza pra bandeja; `prevent_close` + hide)
- Build de produção embute `dist/` (backend compilado) como resource do bundle

---

## Próximas melhorias conhecidas

Itens identificados na revisão de código, ainda não implementados:

1. ~~**IDs das teclas na web UI** — `web/app.ts` usa IDs diferentes de `layout.ts`; algumas teclas não acendem pelo grid visual.~~ *(Fix applied: key IDs in web LAYOUT now match layout.ts; unknown keys are filtered via `validKeyIds`.)*
2. ~~**CLI `disconnect`** — cada invocação cria um `Controller` novo (não mantém estado entre processos).~~ *(Removed — disconnect happens on process exit.)*
3. ~~**Arquivo LICENSE** — README declara MIT, mas o arquivo ainda não existe.~~ *(Created.)*
4. ~~**Validação de payload** — cores e key IDs sem schema runtime.~~ *(Implementado em `backend/commands/validate.ts`.)*
5. **Autenticação WebSocket** — servidor sem token; seguro apenas em loopback.
6. **Teclas só visuais no grid** — `scrlk`, `rshift` e `menu` aparecem na UI Angular mas não têm LED na matriz física (85 keys). Clicar nelas não altera o teclado.

## Utilitários de cor compartilhados

`backend/color.ts` now exports `clampByte`, `clampNibble`, `hexToRgb`, and `rgbToHex`.
These were previously duplicated in `backend/cli.ts` (local `hexToRgb`), `backend/protocol.ts`
(private `clampByte`/`clampNibble`), and `backend/web/app.ts` (local `hexToRgb`/`rgbToHex`).

- `backend/cli.ts` and `backend/protocol.ts` now import from `backend/color.ts`.
- `backend/web/app.ts` retains local copies because it's a separate browser-side bundle.

---

## Licença

MIT (ver README.md).
