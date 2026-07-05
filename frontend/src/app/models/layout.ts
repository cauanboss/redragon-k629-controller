import { RowDef } from './types';

/**
 * Visual 75% Layout for Redragon K629CGO-PRO-M (ABNT2).
 * null entries = gap spacers between groups.
 */
export const LAYOUT: RowDef[] = [
  // Row 0 — Function keys + Del
  {
    keys: [
      { id: 'esc', label: 'Esc', width: 1 }, null,
      { id: 'f1', label: 'F1', width: 1 },
      { id: 'f2', label: 'F2', width: 1 },
      { id: 'f3', label: 'F3', width: 1 },
      { id: 'f4', label: 'F4', width: 1 }, null,
      { id: 'f5', label: 'F5', width: 1 },
      { id: 'f6', label: 'F6', width: 1 },
      { id: 'f7', label: 'F7', width: 1 },
      { id: 'f8', label: 'F8', width: 1 }, null,
      { id: 'f9', label: 'F9', width: 1 },
      { id: 'f10', label: 'F10', width: 1 },
      { id: 'f11', label: 'F11', width: 1 },
      { id: 'f12', label: 'F12', width: 1 }, null,
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
      { id: 'bksp', label: 'Bksp', width: 2 }, null,
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
      { id: 'k610', label: '\\', width: 1 }, null,
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
      { id: 'rshift', label: 'RShift', width: 2.75 }, null,
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
      { id: 'menu', label: 'Menu', width: 1 }, null,
      { id: 'left', label: '←', width: 1 },
      { id: 'down', label: '↓', width: 1 },
      { id: 'right', label: '→', width: 1 },
    ],
  },
];
