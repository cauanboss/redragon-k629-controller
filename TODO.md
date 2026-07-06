# TODO — Redragon K629 Controller

## ⬛ O que está FEITO

### Backend (`backend/`)
- [x] 13 padrões de projeto (Facade, Strategy, Command, Observer, Repository, Registry, Adapter, Ports & Adapters, Template Method, Factory, Decorator, IEffectLifecycle, IInputReader)
- [x] 11 efeitos host-driven registrados (UI usa host-first; firmware só via CLI debug)
- [x] ⚠️ Efeitos firmware não funcionam no K629CGO-PRO-M — ver `docs/FIRMWARE-EFFECTS.md`
- [x] 8 perfis built-in com copy-on-write
- [x] Validação de mensagens WebSocket
- [x] Decorator de logging USB
- [x] IEffect lifecycle hooks (`onStart`/`onStop`)
- [x] 178 testes passando
- [x] Estrutura de pastas organizada (`backend/`, `frontend/`, `docs/`)
- [x] Auto-reconnect watcher (reconexão USB)
- [x] Detecção expandida para 8 modelos SH68F90A
- [x] CLI debug (`debug-effect`) para diagnóstico de protocolo
- [x] Porta unificada em 3000 (dev, Tauri, produção)

### Frontend Angular (`frontend/`)
- [x] Migração completa do frontend vanilla → Angular standalone components
- [x] 4 componentes: keyboard, toolbar, profiles, status-bar
- [x] Serviços: WebSocketService + KeyboardStateService
- [x] Tema escuro completo
- [x] Perfis built-in com lock icon na UI
- [x] Brightness fix (sync do slider com state)

### Tauri (completo)
- [x] Rust 1.96.1 instalado (`~/.cargo/`)
- [x] Tauri CLI 2.11.4 instalado (`~/.cargo/bin/cargo-tauri`)
- [x] Arquivos base criados: `Cargo.toml`, `build.rs`, `lib.rs`, `main.rs`, `tauri.conf.json`, `capabilities/default.json`, `.gitignore`
- [x] `@tauri-apps/api` e `@tauri-apps/plugin-shell` no `package.json`
- [x] Scripts Tauri no `package.json` (`tauri`, `tauri:dev`, `tauri:build`, `tauri:icon`)
- [x] WebSocket URL do frontend unificada na porta 3000 (todos os modos)
- [x] Tray icon implementado em Rust (abre/oculta janela, quit)
- [x] Janela fecha → bandeja (não encerra o app)
- [x] Ícones PNG gerados (`tauri icon`)
- [x] Compilação Rust verificada (`cargo check` — zero warnings)
- [x] Angular build → `frontend/dist/` (caminho bate com `tauri.conf.json`)
- [x] Sidecar implementado (spawna Node.js backend com `PORT=3000`)
- [x] Backend testado na porta 3000 — responde corretamente
- [x] Binary compilado com sucesso (`frontend/src-tauri/target/debug/redragon-controller`)

---

## 🔲 O que FALTA fazer (opcional)

### 1. ~~Instalar dependências de sistema do Tauri~~ ✅ Feito

### 2. ~~Criar ícones do app~~ ✅ Feito

### 3. ~~Corrigir o path de build Angular → Tauri~~ ✅ Feito

### 4. ~~Implementar o sidecar do backend~~ ✅ Feito

### 5. Testar `pnpm tauri:dev`
```bash
cd frontend && pnpm tauri:dev
```
Deve abrir uma janela GTK com o teclado funcionando via backend na porta 3000.

### 6. Build de produção
```bash
cd frontend && pnpm tauri:build
```
Gera em `frontend/src-tauri/target/release/bundle/`.

Ver checklist completo em **[docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md)**.

### 7. Flatpak (futuro)
Depois que o Tauri buildar, empacotar em Flatpak com permissão USB.

---

## 🟡 Melhorias opcionais (não bloqueiam)

Ver também [docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md) (roadmap release + UX).

- [x] Bundle backend Tauri (`scripts/bundle-backend.sh` + `node_modules` no resource)
- [ ] Binário Node standalone (sidecar) — elimina dependência de Node no PATH
- [x] Script instalação udev (`scripts/install-udev.sh` + banner no app)
- [x] UX mínima v1.0 (pt-BR, status USB, parar efeito, toolbar scroll)
- [ ] ESLint + Prettier + Husky
- [x] CI/CD (GitHub Actions — test + build + bundle)
- [ ] Logging estruturado (pino)
- [ ] Endpoint `/health` no backend
- [ ] systemd service (`redragon-controller.service`)
- [x] Desktop entry (`packaging/redragon-controller.desktop` — integrar no bundle Tauri)
- [ ] i18n (pt-BR + en)

---

## 📂 Estrutura atual do projeto

```
teclado-redragon/
├── backend/                 ← Servidor Node.js (Express + WebSocket)
├── frontend/                ← Frontend Angular + Tauri
│   ├── src/app/             ← Componentes Angular
│   └── src-tauri/           ← Projeto Tauri (Rust)
│       ├── Cargo.toml       ← Dependências Rust
│       ├── tauri.conf.json  ← Config da janela, build, bundler
│       ├── src/
│       │   ├── main.rs      ← Entry point Rust
│       │   └── lib.rs       ← App Tauri (janela + tray icon)
│       ├── capabilities/    ← Permissões (shell, core)
│       └── icons/           ← Ícones PNG/ICO/ICNS gerados
├── docs/                    ← Documentação
├── package.json             ← Scripts (build, test, tauri)
└── TODO.md                  ← Este arquivo
```

---

## 🔄 Como retomar

```bash
# 1. Instalar deps de sistema (precisa sudo, só na primeira vez)
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

# 2. Instalar deps Node
pnpm install

# 3. Compilar backend (necessário para Tauri sidecar)
pnpm build:backend

# 4. Verificar compilação Rust
. ~/.cargo/env
cargo check --manifest-path frontend/src-tauri/Cargo.toml

# 5. Rodar em dev
pnpm tauri:dev

# 6. Build de produção
pnpm tauri:build
```
