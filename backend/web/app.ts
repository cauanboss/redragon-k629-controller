/// <reference lib="dom" />

/**
 * Redragon K629CGO-PRO-M Controller — Web Frontend
 *
 * Connects to the backend via WebSocket, renders a TKL keyboard layout
 * interactively, and allows per-key color control, effects, brightness,
 * and speed adjustments.
 */

// ── Types ───────────────────────────────────────────────────────

type RGBColor = { r: number; g: number; b: number };

interface KeyDef {
  id: string;
  label: string;
  width: number;
}

interface RowDef {
  keys: Array<KeyDef | null>; // null = gap spacer
}

interface LayoutMessage {
  type: 'layout';
  keys: Array<{
    id: string;
    label: string;
    position: { row: number; col: number };
    width?: number;
    color?: RGBColor;
  }>;
}

interface KeyColorMessage {
  type: 'key_color';
  keyId: string;
  color: RGBColor;
}

interface EffectActiveMessage {
  type: 'effect_active';
  effect: string;
}

interface ProfileDataMessage {
  type: 'profile_data';
  name: string;
  profile: {
    name: string;
    colors: Record<string, RGBColor>;
    effect?: string;
    brightness?: number;
    speed?: number;
  };
}

interface ProfileListMessage {
  type: 'profile_list';
  profiles: Array<{ name: string; builtin: boolean }>;
}

interface ProfileSavedMessage {
  type: 'profile_saved';
  name: string;
}

interface ProfileDeletedMessage {
  type: 'profile_deleted';
  name: string;
}

type ServerMessage =
  | LayoutMessage
  | KeyColorMessage
  | EffectActiveMessage
  | ProfileDataMessage
  | ProfileListMessage
  | ProfileSavedMessage
  | ProfileDeletedMessage;

// ── Constants ───────────────────────────────────────────────────

const WS_URL = 'ws://localhost:3000';
const KEY_UNIT = 54;
const KEY_HEIGHT = 40;
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

// ── Visual 75% Layout ───────────────────────────────────────────
//
// Layout ABNT2 75% do Redragon K629CGO-PRO-M.
// null entries = gap spacers entre grupos.

const LAYOUT: RowDef[] = [
  // Row 0 — Function keys + Del
  {
    keys: [
      { id: 'esc', label: 'Esc', width: 1 },
      null,
      { id: 'f1', label: 'F1', width: 1 },
      { id: 'f2', label: 'F2', width: 1 },
      { id: 'f3', label: 'F3', width: 1 },
      { id: 'f4', label: 'F4', width: 1 },
      null,
      { id: 'f5', label: 'F5', width: 1 },
      { id: 'f6', label: 'F6', width: 1 },
      { id: 'f7', label: 'F7', width: 1 },
      { id: 'f8', label: 'F8', width: 1 },
      null,
      { id: 'f9', label: 'F9', width: 1 },
      { id: 'f10', label: 'F10', width: 1 },
      { id: 'f11', label: 'F11', width: 1 },
      { id: 'f12', label: 'F12', width: 1 },
      null,
      { id: 'prtsc', label: 'PrtSc', width: 1 },
      { id: 'scrlk', label: 'ScrLk', width: 1 },
      { id: 'pause', label: 'Pause', width: 1 },
    ],
  },

  // Row 1 — Number row + Home
  {
    keys: [
      { id: '~', label: '`~', width: 1 },
      { id: '1', label: '1', width: 1 },
      { id: '2', label: '2', width: 1 },
      { id: '3', label: '3', width: 1 },
      { id: '4', label: '4', width: 1 },
      { id: '5', label: '5', width: 1 },
      { id: '6', label: '6', width: 1 },
      { id: '7', label: '7', width: 1 },
      { id: '8', label: '8', width: 1 },
      { id: '9', label: '9', width: 1 },
      { id: '0', label: '0', width: 1 },
      { id: 'k70', label: '-', width: 1 },
      { id: 'k386', label: '=', width: 1 },
      { id: 'bksp', label: 'Bksp', width: 2 },
      null,
      { id: 'home', label: 'Home', width: 1 },
      { id: 'pgup', label: 'PgUp', width: 1 },
    ],
  },

  // Row 2 — QWERTY row + PgUp
  {
    keys: [
      { id: 'tab', label: 'Tab', width: 1.5 },
      { id: 'q', label: 'Q', width: 1 },
      { id: 'w', label: 'W', width: 1 },
      { id: 'e', label: 'E', width: 1 },
      { id: 'r', label: 'R', width: 1 },
      { id: 't', label: 'T', width: 1 },
      { id: 'y', label: 'Y', width: 1 },
      { id: 'u', label: 'U', width: 1 },
      { id: 'i', label: 'I', width: 1 },
      { id: 'o', label: 'O', width: 1 },
      { id: 'p', label: 'P', width: 1 },
      { id: 'k659', label: '[', width: 1 },
      { id: 'k186', label: ']', width: 1 },
      { id: 'k610', label: '\\', width: 1 },
      { id: 'k191', label: '|', width: 1 },
      null,
      { id: 'del', label: 'Del', width: 1 },
      { id: 'end', label: 'End', width: 1 },
      { id: 'pgdn', label: 'PgDn', width: 1 },
    ],
  },

  // Row 3 — Home row
  {
    keys: [
      { id: 'caps', label: 'Caps', width: 1.75 },
      { id: 'a', label: 'A', width: 1 },
      { id: 's', label: 'S', width: 1 },
      { id: 'd', label: 'D', width: 1 },
      { id: 'f', label: 'F', width: 1 },
      { id: 'g', label: 'G', width: 1 },
      { id: 'h', label: 'H', width: 1 },
      { id: 'j', label: 'J', width: 1 },
      { id: 'k', label: 'K', width: 1 },
      { id: 'l', label: 'L', width: 1 },
      { id: 'k832', label: ';', width: 1 },
      { id: 'k15', label: "'", width: 1 },
      { id: 'enter', label: 'Enter', width: 2.25 },
      { id: 'ç', label: 'Ç', width: 1 },
    ],
  },

  // Row 4 — Bottom alpha + ↑
  {
    keys: [
      { id: 'lshift', label: 'LShift', width: 2.25 },
      { id: 'z', label: 'Z', width: 1 },
      { id: 'x', label: 'X', width: 1 },
      { id: 'c', label: 'C', width: 1 },
      { id: 'v', label: 'V', width: 1 },
      { id: 'b', label: 'B', width: 1 },
      { id: 'n', label: 'N', width: 1 },
      { id: 'm', label: 'M', width: 1 },
      { id: 'k987', label: ',', width: 1 },
      { id: 'k621', label: '.', width: 1 },
      { id: 'k818', label: '/', width: 1 },
      { id: 'rshift', label: 'RShift', width: 2.75 },
      null,
      { id: 'up', label: '↑', width: 1 },
    ],
  },

  // Row 5 — Bottom modifiers + arrows
  {
    keys: [
      { id: 'lctrl', label: 'LCtrl', width: 1.25 },
      { id: 'lwin', label: 'LWin', width: 1.25 },
      { id: 'lalt', label: 'LAlt', width: 1.25 },
      { id: 'space', label: 'Space', width: 6.25 },
      { id: 'ralt', label: 'RAlt', width: 1.25 },
      { id: 'fn', label: 'Fn', width: 1.25 },
      { id: 'rctrl', label: 'RCtrl', width: 1.25 },
      { id: 'menu', label: 'Menu', width: 1 },
      null,
      { id: 'left', label: '←', width: 1 },
      { id: 'down', label: '↓', width: 1 },
      { id: 'right', label: '→', width: 1 },
    ],
  },
];

// ── State ───────────────────────────────────────────────────────

const keyColors = new Map<string, RGBColor>();
let ws: WebSocket | null = null;
const selectedKeys = new Set<string>();
let currentEffect: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;

/** Valid key IDs as reported by the backend via the `layout` message.
 *  Used to filter out visual-only keys (rshift, scrlk, menu) when
 *  sending `set_colors` so the backend never receives unknown IDs. */
let validKeyIds = new Set<string>();

// ── DOM References ──────────────────────────────────────────────

const keyboardEl = document.getElementById('keyboard')!;
const statusText = document.getElementById('status-text')!;
const connectionInfo = document.getElementById('connection-info')!;
const connectionBadge = document.getElementById('connection-badge')!;
const hiddenColorPicker = document.getElementById('hidden-color-picker') as HTMLInputElement;
const effectButtons = document.querySelectorAll<HTMLButtonElement>('.btn-effect');
const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
const brightnessValue = document.getElementById('brightness-value')!;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedValue = document.getElementById('speed-value')!;
const singleColorBtn = document.getElementById('single-color-btn')!;
const singleColorPicker = document.getElementById('single-color-picker') as HTMLInputElement;
const resetBtn = document.getElementById('reset-btn')!;
const selectionInfo = document.getElementById('selection-info')!;
const clearSelectionBtn = document.getElementById('clear-selection-btn')!;
const applySelectedBtn = document.getElementById('apply-selected-btn')!;
const profileSelect = document.getElementById('profile-select') as HTMLSelectElement;
const profileNameInput = document.getElementById('profile-name-input') as HTMLInputElement;
const profileSaveBtn = document.getElementById('profile-save-btn')!;
const profileLoadBtn = document.getElementById('profile-load-btn')!;
const profileDeleteBtn = document.getElementById('profile-delete-btn') as HTMLButtonElement;

// ── Utility ─────────────────────────────────────────────────────

function rgbToHex(color: RGBColor): string {
  const r = Math.max(0, Math.min(255, Math.round(color.r)));
  const g = Math.max(0, Math.min(255, Math.round(color.g)));
  const b = Math.max(0, Math.min(255, Math.round(color.b)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string): RGBColor {
  const value = hex.replace(/^#/, '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

// ── WebSocket ──────────────────────────────────────────────────

function setStatus(type: 'connected' | 'disconnected' | 'connecting', message: string): void {
  statusText.textContent = message;
  connectionBadge.className = `badge badge-${type}`;
  connectionBadge.textContent =
    type === 'connected' ? 'Connected' : type === 'connecting' ? 'Connecting…' : 'Disconnected';
}

function sendMessage(msg: unknown): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function handleServerMessage(raw: unknown): void {
  const msg = raw as ServerMessage;

  switch (msg.type) {
    case 'layout': {
      const layoutMsg = msg;
      validKeyIds = new Set(layoutMsg.keys.map((k) => k.id));
      for (const key of layoutMsg.keys) {
        if (key.color) {
          keyColors.set(key.id, key.color);
        }
      }
      refreshAllKeyColors();
      setStatus('connected', 'Layout received from server');
      break;
    }

    case 'key_color': {
      const colorMsg = msg;
      keyColors.set(colorMsg.keyId, colorMsg.color);
      updateKeyColorDisplay(colorMsg.keyId);
      break;
    }

    case 'effect_active': {
      const effectMsg = msg;
      currentEffect = effectMsg.effect;
      updateActiveEffect(effectMsg.effect);
      break;
    }

    case 'profile_list': {
      const listMsg = msg;
      profileSelect.innerHTML = '<option value="">-- Select Profile --</option>';
      for (const item of listMsg.profiles) {
        const opt = document.createElement('option');
        opt.value = item.name;
        opt.textContent = item.builtin ? `🔒 ${item.name}` : item.name;
        opt.dataset.builtin = item.builtin ? 'true' : 'false';
        profileSelect.appendChild(opt);
      }
      break;
    }

    case 'profile_data': {
      const dataMsg = msg;
      // Apply colors from profile
      keyColors.clear();
      for (const [keyId, color] of Object.entries(dataMsg.profile.colors)) {
        keyColors.set(keyId, color);
        updateKeyColorDisplay(keyId);
      }
      // Re-apply with current brightness
      applyCurrentColors();
      break;
    }

    case 'profile_saved':
      sendMessage({ type: 'profile_list' });
      break;

    case 'profile_deleted':
      sendMessage({ type: 'profile_list' });
      break;

    default:
      break;
  }
}

function connectWebSocket(): void {
  if (ws) {
    ws.onopen = null;
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    ws = null;
  }

  setStatus('connecting', 'Connecting to server…');
  connectionInfo.textContent = `ws://localhost:3000`;

  try {
    ws = new WebSocket(WS_URL);
  } catch {
    setStatus('disconnected', 'Failed to create WebSocket');
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectAttempt = 0;
    setStatus('connected', 'Connected to server');
    sendMessage({ type: 'get_layout' });
  };

  ws.onclose = (event: CloseEvent) => {
    setStatus('disconnected', `Disconnected (code: ${event.code})`);
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    // onclose will fire after this, so we let that handle the state
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as Record<string, unknown>;
      handleServerMessage(data);
    } catch {
      console.error('Failed to parse server message:', event.data);
    }
  };
}

function scheduleReconnect(): void {
  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
    setStatus('disconnected', 'Max reconnection attempts reached. Refresh the page.');
    return;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectAttempt++;
  const delay = Math.min(
    RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempt - 1),
    MAX_RECONNECT_DELAY_MS
  );

  setStatus('connecting', `Reconnecting in ${Math.round(delay / 1000)}s…`);

  reconnectTimer = setTimeout(() => {
    connectWebSocket();
  }, delay);
}

// ── Keyboard Rendering ─────────────────────────────────────────

function refreshAllKeyColors(): void {
  const keys = keyboardEl.querySelectorAll<HTMLElement>('.key');
  for (const el of keys) {
    const keyId = el.dataset.keyId;
    if (keyId) {
      updateKeyColorDisplay(keyId);
    }
  }
}

function updateKeyColorDisplay(keyId: string): void {
  const el = keyboardEl.querySelector<HTMLElement>(`.key[data-key-id="${keyId}"]`);
  if (!el) return;

  const color = keyColors.get(keyId);
  if (color) {
    el.style.backgroundColor = rgbToHex(color);
    el.classList.add('has-color');
  } else {
    el.style.backgroundColor = '';
    el.classList.remove('has-color');
  }

  // Update selection highlight
  el.classList.toggle('key-selected', selectedKeys.has(keyId));
}

function refreshSelectionHighlights(): void {
  const keys = keyboardEl.querySelectorAll<HTMLElement>('.key');
  for (const el of keys) {
    const id = el.dataset.keyId;
    if (id) el.classList.toggle('key-selected', selectedKeys.has(id));
  }
}

function renderKeyboard(): void {
  keyboardEl.innerHTML = '';

  for (const row of LAYOUT) {
    const rowEl = document.createElement('div');
    rowEl.className = 'keyboard-row';

    for (const item of row.keys) {
      if (item === null) {
        // Gap spacer
        const gapEl = document.createElement('div');
        gapEl.className = 'key-gap';
        rowEl.appendChild(gapEl);
      } else {
        const keyEl = document.createElement('div');
        keyEl.className = 'key';
        keyEl.dataset.keyId = item.id;
        keyEl.style.width = `${item.width * KEY_UNIT}px`;
        keyEl.style.height = `${KEY_HEIGHT}px`;
        keyEl.title = item.label;

        const labelEl = document.createElement('span');
        labelEl.className = 'key-label';
        labelEl.textContent = item.label;
        keyEl.appendChild(labelEl);

        keyEl.addEventListener('click', (e: MouseEvent) => onKeyClick(item.id, e));

        rowEl.appendChild(keyEl);
      }
    }

    keyboardEl.appendChild(rowEl);
  }
}

// ── Key Click / Color Picker ───────────────────────────────────

function onKeyClick(keyId: string, event: MouseEvent): void {
  if (event.ctrlKey || event.metaKey) {
    // Ctrl+Click: toggle this key in/out of selection
    if (selectedKeys.has(keyId)) {
      selectedKeys.delete(keyId);
    } else {
      selectedKeys.add(keyId);
    }
  } else {
    // Normal click: select only this key
    selectedKeys.clear();
    selectedKeys.add(keyId);
    // Open color picker for immediate color change
    const currentColor = keyColors.get(keyId);
    if (currentColor) {
      hiddenColorPicker.value = rgbToHex(currentColor);
      singleColorPicker.value = hiddenColorPicker.value;
    }
    hiddenColorPicker.click();
  }

  refreshSelectionHighlights();
  updateSelectionCounter();

  // Set the preview color picker to the last selected key's color
  if (selectedKeys.size >= 1) {
    const lastKey = [...selectedKeys][selectedKeys.size - 1];
    const currentColor = keyColors.get(lastKey);
    if (currentColor) {
      hiddenColorPicker.value = rgbToHex(currentColor);
    }
  }
}

hiddenColorPicker.addEventListener('input', () => {
  // Sync the visible picker with the hidden one
  singleColorPicker.value = hiddenColorPicker.value;
  applyColorToSelected(hexToRgb(hiddenColorPicker.value));
});

// Sync hidden picker when user changes the visible picker
singleColorPicker.addEventListener('input', () => {
  hiddenColorPicker.value = singleColorPicker.value;
});

function scaleByBrightness(color: RGBColor): RGBColor {
  const level = parseInt(brightnessSlider.value, 10);
  const factor = Math.min(level / 10, 1); // 0.0 – 1.0, saturate at 10
  return {
    r: Math.round(color.r * factor),
    g: Math.round(color.g * factor),
    b: Math.round(color.b * factor),
  };
}

function applyColorToSelected(color: RGBColor): void {
  if (selectedKeys.size === 0) return;
  const scaled = scaleByBrightness(color);
  const colors: Record<string, RGBColor> = {};
  for (const keyId of selectedKeys) {
    if (validKeyIds.has(keyId)) {
      colors[keyId] = scaled;
    }
  }
  if (Object.keys(colors).length > 0) {
    sendMessage({ type: 'set_colors', colors });
  }
  // Update local display with full-brightness color (for preview)
  for (const keyId of selectedKeys) {
    keyColors.set(keyId, color);
    updateKeyColorDisplay(keyId);
  }
}

function applyCurrentColors(): void {
  if (keyColors.size === 0) return;

  const scaled: Record<string, RGBColor> = {};
  for (const [keyId, color] of keyColors) {
    if (validKeyIds.has(keyId)) {
      scaled[keyId] = scaleByBrightness(color);
    }
  }

  if (Object.keys(scaled).length > 0) {
    sendMessage({ type: 'set_colors', colors: scaled });
  }
}

// ── Toolbar Controls ───────────────────────────────────────────

function updateActiveEffect(effect: string): void {
  for (const btn of effectButtons) {
    const isActive = btn.dataset.effect === effect;
    btn.classList.toggle('btn-active', isActive);
  }
}

function updateSelectionCounter(): void {
  if (selectionInfo) {
    selectionInfo.textContent = selectedKeys.size > 0 ? `${selectedKeys.size} key(s) selected` : '';
  }
}

function setupToolbar(): void {
  // Effect buttons
  for (const btn of effectButtons) {
    btn.addEventListener('click', () => {
      const effect = btn.dataset.effect!;

      // Apply effect — map 0-10 to 0-4 for firmware
      const brightness = Math.round((parseInt(brightnessSlider.value, 10) * 4) / 10);
      const speed = Math.round((parseInt(speedSlider.value, 10) * 4) / 10);
      sendMessage({
        type: 'apply_effect',
        effect,
        params: { brightness, speed },
      });
    });
  }

  // Brightness slider — scales ALL current colors in real time
  brightnessSlider.addEventListener('input', () => {
    const level = parseInt(brightnessSlider.value, 10);
    brightnessValue.textContent = String(level);
    // Map 0-10 → 0-4 for firmware effects
    const firmwareLevel = Math.round((level * 4) / 10);
    sendMessage({ type: 'set_brightness', level: firmwareLevel });
    // Re-apply all current colors with new brightness
    applyCurrentColors();
  });

  // Speed slider
  speedSlider.addEventListener('input', () => {
    const level = parseInt(speedSlider.value, 10);
    speedValue.textContent = String(level);
    sendMessage({ type: 'set_speed', level });
  });

  // Single color button
  singleColorBtn.addEventListener('click', () => {
    const color = hexToRgb(singleColorPicker.value);

    if (selectedKeys.size > 0) {
      // Apply only to selected keys
      applyColorToSelected(color);
    } else {
      // Apply to ALL keys
      const scaled = scaleByBrightness(color);
      const colors: Record<string, RGBColor> = {};
      for (const row of LAYOUT) {
        for (const item of row.keys) {
          if (item !== null) {
            keyColors.set(item.id, color);
            updateKeyColorDisplay(item.id);
            if (validKeyIds.has(item.id)) {
              colors[item.id] = scaled;
            }
          }
        }
      }
      if (Object.keys(colors).length > 0) {
        sendMessage({ type: 'set_colors', colors });
      }
    }
  });

  // Apply to selected button
  if (applySelectedBtn) {
    applySelectedBtn.addEventListener('click', () => {
      if (selectedKeys.size === 0) return;
      const color = hexToRgb(singleColorPicker.value);
      applyColorToSelected(color);
    });
  }

  // Clear selection button
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', () => {
      selectedKeys.clear();
      refreshSelectionHighlights();
      updateSelectionCounter();
    });
  }

  // Click on background to clear selection
  keyboardEl.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('keyboard-container')) {
      selectedKeys.clear();
      refreshSelectionHighlights();
      updateSelectionCounter();
    }
  });

  // Reset button
  resetBtn.addEventListener('click', () => {
    keyColors.clear();
    refreshAllKeyColors();
    sendMessage({ type: 'reset' });
  });

  // ── Profile buttons ──────────────────────────────────────
  profileSaveBtn.addEventListener('click', () => {
    const name = profileNameInput.value.trim();
    if (!name) {
      alert('Enter a profile name');
      return;
    }

    // Collect all current key colors
    const colors: Record<string, RGBColor> = {};
    for (const row of LAYOUT) {
      for (const item of row.keys) {
        if (item !== null && keyColors.has(item.id)) {
          colors[item.id] = keyColors.get(item.id)!;
        }
      }
    }

    sendMessage({
      type: 'profile_save',
      name,
      profile: {
        colors,
        effect: currentEffect || undefined,
        brightness: parseInt(brightnessSlider.value, 10),
        speed: parseInt(speedSlider.value, 10),
      },
    });
  });

  profileLoadBtn.addEventListener('click', () => {
    const name = profileSelect.value;
    if (!name) {
      alert('Select a profile to load');
      return;
    }
    sendMessage({ type: 'profile_load', name });
  });

  profileDeleteBtn.addEventListener('click', () => {
    const name = profileSelect.value;
    if (!name) {
      alert('Select a profile to delete');
      return;
    }
    if (confirm(`Delete profile "${name}"?`)) {
      sendMessage({ type: 'profile_delete', name });
    }
  });

  // Disable delete button when a built-in profile is selected
  profileSelect.addEventListener('change', () => {
    const selected = profileSelect.selectedOptions[0];
    const isBuiltin = selected?.dataset.builtin === 'true';
    profileDeleteBtn.disabled = isBuiltin;
    profileDeleteBtn.title = isBuiltin
      ? 'Built-in profiles cannot be deleted'
      : 'Delete selected profile';
  });

  // Request profile list on connect
  setTimeout(() => sendMessage({ type: 'profile_list' }), 1000);

  // If an effect button was previously active, mark it
  if (currentEffect) {
    updateActiveEffect(currentEffect);
  }
}

// ── Init ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderKeyboard();
  setupToolbar();
  connectWebSocket();
});
