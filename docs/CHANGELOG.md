# Changelog

Registro das mudanças arquiteturais e operacionais do projeto.

## 1.0.0 (2026-01-05)

### 🏗 Architecture
- Migrated backend from `src/` to `backend/` for clear frontend/backend separation
- Migrated frontend from vanilla TypeScript to Angular 19 standalone components
- Added Tauri v2 wrapper for native GTK desktop app with tray icon and sidecar
- pnpm monorepo workspace with `backend/` and `frontend/` packages
- 13 design patterns documented: Facade, Strategy, Command, Observer, Repository, Registry, Adapter, Ports & Adapters, Template Method, Factory, Decorator, IEffectLifecycle, IInputReader

### 🎮 Effects
- Added 6 firmware effects: Snake, Star Twinkle, Sine Wave, Waterfall, Rainbow Blossom, Wheel
- **Firmware effects do NOT work on the K629CGO-PRO-M** — the MCU ignores the firmware burst format regardless of bytecode/report ID. See `docs/FIRMWARE-EFFECTS.md` for full diagnosis.
- Added Audio Visualizer host-driven effect (FFT-based, PulseAudio capture)
- Added Typing Reactive host-driven effect (evdev key detection with exponential fade)
- Renamed host-driven StaticEffect → static-host, RainbowEffect → rainbow-host (avoid collision)
- Unified all firmware strategies to use GenericFirmwareBurst (Template Method)
- Added `debug-effect` CLI command for USB protocol diagnostics

### 🔐 Profiles
- 8 built-in profiles: gaming, programmer, synthwave, matrix, nord, gruvbox, ocean, cyberpunk
- Copy-on-write: saving with built-in name auto-creates "{name} (custom)"
- Built-in profiles cannot be deleted
- ProfileLoad now restores effect, brightness, and speed (not just colors)
- 🔒 lock icon in UI for built-in profiles

### 🐛 Bug fixes
- Fixed brightness slider not updating keyboard colors (state sync)
- Fixed speed slider not converting 0-10 → 0-4 nibble range
- Fixed ABNT2 keys (ç, k191) missing from frontend keyboard layout
- Fixed WebSocket port inconsistency (now unified to port 3000)
- Fixed Typing Reactive crashing server (blocking evdev → stream-based)
- Fixed Audio Visualizer warnings on server startup

### 🔌 Device support
- Expanded detection to 8 SH68F90A models: K629, K530, K599, K618 (wired + wireless)
- Auto-reconnect watcher (polls every 2s for USB reconnection)
- Updated udev rules to cover all Sinowealth vendor IDs

### 🖥 Frontend (Angular)
- 4 standalone components: Keyboard, Toolbar, Profiles, StatusBar
- Reactive state management with RxJS (BehaviorSubject, Subject)
- WebSocket auto-reconnect with exponential backoff
- Dark theme ported from original vanilla CSS
- Angular 19, no SSR, no routing (SPA single view)

### 🦀 Tauri
- Native GTK window (1080×720, min 800×500)
- Tray icon with Show/Quit menu
- Sidecar spawns Node.js backend on port 3000
- Close-to-tray (minimizes instead of closing)
- Icons generated for all platforms (PNG, ICO, ICNS)

### 🧪 Testing
- 176 unit tests (15 test files, vitest)
- Test coverage: Controller, UIServer, Protocol, Effects, Profiles, Commands, Device, Layout, Color, Typing Reactive, Firmware Burst, Decorator, Runner

### 📦 Build & DevOps
- `pnpm build` builds both backend (tsc) and frontend (ng build)
- `pnpm tauri:dev` / `pnpm tauri:build` for desktop app
- `pnpm dev:all` runs backend + Angular dev server concurrently

## 0.1.0 (2026-06-30)

### Initial release
- Basic per-key RGB control for Redragon K629CGO-PRO-M
- Static and Rainbow firmware effects
- Command pattern for WebSocket messages
- FileProfileRepository for profile persistence
- Express + ws server
- Commander CLI
- udev rules for USB HID access
- Initial architecture refactoring (Ports & Adapters, Strategy, Factory)
