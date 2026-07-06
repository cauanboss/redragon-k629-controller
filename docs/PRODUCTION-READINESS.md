# Prontidão para produção

Este documento consolida o estado atual do **redragon-k629-controller**, o que falta para distribuir o software a outros usuários, e quais melhorias de interface valem a pena antes ou depois do v1.0.

---

## Resumo executivo

| Dimensão | Status | Bloqueia release? |
|----------|--------|-------------------|
| Funcionalidade core (RGB, efeitos host, perfis) | ✅ Pronta | Não |
| App desktop (Tauri dev) | ✅ Validado | Não |
| Build release (`.deb`/AppImage) | 🟡 Parcial — bundle + Node no PATH | **Sim** (Node ainda externo) |
| Instalação USB (udev) | 🟡 Script `install-udev.sh` + banner no app | Parcial |
| Interface (UX básica) | ✅ MVP (English UI, stop effect, status USB) | Não |
| Interface (polish comercial) | 🟡 Parcial | Não |

**Conclusão:** o software está **pronto para uso pessoal** e desenvolvimento. Para **produção** (outros usuários instalarem sem clonar o repo), o foco deve ser **empacotamento do backend** e **instalação automática das regras udev** — não redesign visual.

---

## O que já está pronto

### Backend
- Controle RGB per-key (85 teclas com LED na matriz física)
- 11 efeitos **host-driven** (via frames USB a ~30 fps) — ver [FIRMWARE-EFFECTS.md](FIRMWARE-EFFECTS.md)
- 8 perfis built-in com copy-on-write
- Validação WebSocket, auto-reconnect USB, 179 testes
- Porta unificada **3000** (dev, Tauri, produção)

### Frontend (Angular)
- Grid visual 75% ABNT2, toolbar de efeitos, perfis, status de conexão
- Tema escuro consistente, layout responsivo (breakpoints 900px / 600px)
- Teclas só visuais (`scrlk`, `rshift`, `menu`) desabilitadas na UI

### Desktop (Tauri)
- Janela GTK + tray icon + close-to-tray (`prevent_close`)
- Dev: backend via `tsx backend/start-server.ts` (código fonte atual)
- Release: backend via `node dist/start-server.js` em `bundle/backend/` (dist + `node_modules` + regras udev) embutido como resource Tauri
- Script `scripts/bundle-backend.sh`; `pnpm build` inclui o bundle automaticamente

---

## Bloqueadores para produção

### 1. Build Tauri release ainda depende de Node.js no sistema

Em produção, o app executa:

```text
node dist/start-server.js
```

O resource Tauri em `bundle/backend/` inclui **`dist/`**, **`node_modules`** e as regras udev em `config/`. **Ainda falta:**

- Runtime **Node.js** ≥ 18 no `PATH` do usuário

Um usuário que instalar o `.deb`/AppImage **sem** Node verá a janela abrir, mas o backend **não sobe** (mensagem no stderr do Tauri).

**Soluções possíveis (escolher uma):**

| Abordagem | Prós | Contras |
|-----------|------|---------|
| Binário standalone do backend (`pkg`, `bun build --compile`, etc.) como sidecar Tauri (`externalBin`) | Melhor UX de instalação | Trabalho de build; `node-hid` nativo |
| Embutir `node_modules` + exigir Node no PATH | Mais simples de implementar | Dependência externa; frágil |
| Flatpak com Node + deps como runtime | Bom para Linux sandbox | Esforço extra de empacotamento |

**Critério de aceite:** instalar o artefato numa máquina limpa (sem repo, sem `pnpm install`) e controlar o teclado normalmente.

### 2. Regras udev — script existe, falta integração no instalador

Disponível:

```bash
bash scripts/install-udev.sh
```

O app exibe um banner de primeira execução com a mesma orientação. **Ainda falta:** `postinst` no `.deb` ou wizard que execute o script automaticamente.

**Critério de aceite:** usuário final instala permissão USB sem copiar paths manualmente do README.

### 3. `pnpm tauri:build` não validado end-to-end

O fluxo de release deve ser testado numa VM ou máquina sem o projeto clonado:

```bash
pnpm tauri:build
# artefatos em frontend/src-tauri/target/release/bundle/
```

### 4. Dependências opcionais de efeitos

| Efeito | Requisito extra |
|--------|-----------------|
| Audio Visualizer | `parec` / PulseAudio |
| Type FX | Leitura evdev (grupo `input` ou permissão equivalente) |

Documentar na instalação ou detectar na UI e avisar quando indisponível.

---

## Qualidade de código ✅

| Item | Status |
|------|--------|
| ESLint + Prettier | ✅ `pnpm lint`, `pnpm format` |
| Husky pre-commit | ✅ lint-staged em TS/HTML/CSS |
| CI lint + format | ✅ GitHub Actions |
| `GET /health` | ✅ JSON com status e device |
| Cache Angular no Git | ✅ removido + `.gitignore` |
| Testes | ✅ 179 passando |

Ver roadmap completo em **[NEXT-STEPS.md](NEXT-STEPS.md)**.

---

## Importante (qualidade de produto, não bloqueia MVP)

| Item | Motivo |
|------|--------|
| **CI (GitHub Actions)** | ✅ test + lint + format + build + bundle — falta `tauri:build` |
| **Instalador `.deb` / AppImage** | Tauri gera; falta testar end-to-end e publicar releases |
| **Desktop entry** (`.desktop`) | ✅ `packaging/redragon-controller.desktop` — falta integrar no bundle Tauri |
| **Single instance** | Evitar duas instâncias disputando o dispositivo USB |
| **UX teclado desconectado** | ✅ `device_status` + badge na status bar |
| **Atualizar docs/TODO** | ✅ Este doc + `TODO.md` |

---

## Opcional (pós-MVP)

- Flatpak (permissoes USB sandboxed)
- Serviço systemd (`redragon-controller.service`) — modo servidor sem Tauri
- i18n completo (pt-BR + en)
- ESLint + Prettier + Husky
- Endpoint `/health` no backend
- Autenticação WebSocket (só relevante se expor na rede; em loopback/desktop, ok sem)
- Auto-update Tauri
- Efeitos firmware nativos no K629 (requer captura USB do software oficial — ver [FIRMWARE-EFFECTS.md](FIRMWARE-EFFECTS.md))

---

## Roadmap sugerido

Ver **[NEXT-STEPS.md](NEXT-STEPS.md)** para o roadmap reorganizado em fases.

Resumo:

1. Testar `.deb` em máquina limpa
2. Backend standalone (sidecar Tauri)
3. `postinst` udev no `.deb`
4. Single instance + `tauri:build` na CI
5. Release v1.0 no GitHub
6. Polish de produto (deps de efeitos, `.desktop`, AppImage)

---

## Interface — precisa melhorar?

### Situação atual

A UI **não bloqueia** um release v1.0 técnico. Ela já oferece:

- Tema escuro coerente
- Grid do teclado, cores, efeitos, perfis, badge de conexão
- Layout responsivo
- Feedback visual para teclas sem LED

Para um utilitário de hardware Linux, isso é **suficiente como MVP**.

### Quando vale investir em UI

| Objetivo | Redesign necessário? |
|----------|----------------------|
| Uso pessoal / dev | Não |
| Distribuir para outros usuários Linux | Pouco — foco em onboarding + erros + pt-BR |
| Parecer produto comercial de loja | Sim — reorganização + polish visual |

### Melhorias recomendadas (pacote mínimo v1.0)

Estimativa: ~1–2 dias. **Não substituem** o trabalho de empacotamento do backend.

#### Prioridade alta (UX, não estética)

1. **Feedback de erros** — 🟡 teclado desconectado + backend ok; falta detectar evdev/audio na UI
2. **Primeira execução** — ✅ banner udev + `scripts/install-udev.sh`
3. **Toolbar de efeitos** — ✅ scroll horizontal
4. **Botão “Parar efeito”** — ✅ comando `stop_effect`
5. **Textos em pt-BR** — ✅ toolbar, perfis, status bar

#### Prioridade média (polish)

6. Legenda para teclas sem LED (`ScrLk`, `RShift`, `Menu`)
7. Perfis: carregar ao selecionar no dropdown — ✅
8. Sliders: brilho 0–10 vs velocidade 0–5 — alinhar escala ou explicar na UI
9. Título fixo “K629CGO-PRO-M” — app suporta outros modelos SH68F90A
10. Status bar: distinguir “WebSocket ok” vs “Teclado USB conectado” — ✅

#### Prioridade baixa (nice to have)

- Logo/ícone no header
- Atalhos de teclado
- Acessibilidade (ARIA, navegação por foco)
- Animações extras

---

## Checklist de release v1.0

```markdown
### Técnico (obrigatório)
- [x] `pnpm test` passando (179 testes)
- [x] ESLint + Prettier + Husky
- [x] `GET /health`
- [x] `pnpm tauri:build` gera `.deb` / `.rpm`
- [ ] App funciona em máquina limpa (sem repo clonado; Node ≥ 18 no PATH)
- [x] Backend sobe automaticamente ao abrir o app (dev + release com Node)
- [ ] Teclado acende e efeitos host-driven funcionam no artefato instalado
- [x] Regras udev instaláveis (`scripts/install-udev.sh` + banner no app)

### UX (recomendado)
- [x] Mensagem quando teclado não encontrado
- [x] UI em inglês
- [x] Botão “Stop Effect”
- [x] Toolbar de efeitos reorganizada (scroll horizontal)

### Distribuição
- [x] CI no GitHub (test + lint + format + build + bundle)
- [ ] Release notes + artefatos anexados
- [ ] README de instalação para usuário final (Node + udev)
```

---

## Referências

- [ARCHITECTURE.md](ARCHITECTURE.md) — camadas e padrões de projeto
- [FIRMWARE-EFFECTS.md](FIRMWARE-EFFECTS.md) — limitações de firmware no K629
- [CHANGELOG.md](CHANGELOG.md) — histórico de mudanças
- [../TODO.md](../TODO.md) — tarefas operacionais do dia a dia
- [NEXT-STEPS.md](NEXT-STEPS.md) — roadmap por fases
