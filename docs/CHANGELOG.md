# Changelog

Registro das mudanças arquiteturais e operacionais do projeto.

## [Unreleased]

### Adicionado

- **Padrões de projeto** em toda a base de código (ver [docs/ARCHITECTURE.md](ARCHITECTURE.md)):
  - **Facade** — `Controller`
  - **Strategy** — `IEffect`, `IEffectStrategy`, `EffectDispatcher`
  - **Command** — `commands/` para mensagens WebSocket
  - **Observer** — `observer/server-events.ts`
  - **Repository** — `FileProfileRepository`
  - **Registry** — `effects/registry.ts`
  - **Adapter** — `DeviceManager implements IDevice`
  - **Ports & Adapters** — `ports/idevice.ts`, `ports/iprofile-repository.ts`
  - **Template Method** — `patterns/firmware-burst.ts`
  - **Factory** — `factory/app-factory.ts`
- Camada `src/ports/` com interfaces para USB e perfis.
- Camada `src/commands/` com registry e 11 comandos WebSocket.
- `EffectDispatcher` compartilhado entre CLI e servidor.
- Variáveis de ambiente `PORT` e `HOST` (padrão `127.0.0.1`).
- Shutdown gracioso (`SIGINT` / `SIGTERM`) em `start-server.ts`.
- Testes: `dispatcher`, `commands`, `profile-repository`, `firmware-burst`, `app-factory`.
- Documentação: `docs/ARCHITECTURE.md`, este changelog.

### Alterado

- `server.ts` — refatorado para Command + Observer; bind explícito em `HOST`.
- `controller.ts` — injeção de `IDevice`; firmware via Template Method.
- `start-server.ts` — usa `createApplicationFromEnv()`.
- `profile-store.ts` — classe `FileProfileRepository` + API legada mantida.
- `effects/index.ts` — registry extraído para `registry.ts`.
- `package.json` — `start` aponta para `dist/start-server.js`.
- `README.md` — tabela de padrões, URL do repositório, contagem de testes.

### Repositório

- Commit inicial publicado localmente.
- Remote configurado: `git@github.com:cauanboss/redragon-k629-controller.git`

### Pendente (conhecido)

- Alinhar IDs de teclas entre `web/app.ts` e `layout.ts`.
- Autenticação WebSocket para uso fora de loopback.
- Arquivo `LICENSE` (MIT declarado no README).
