export interface KeyPosition {
  row: number;
  col: number;
}

export interface KeyInfo {
  id: string;
  label: string;
  position: KeyPosition;
  width?: number;
}

interface RawKeyDef {
  id: string;
  label: string;
  width?: number;
}

export class KeyLayout {
  static readonly ROWS = 16;
  static readonly COLS = 6;

  readonly keys: KeyInfo[];
  readonly matrix: (KeyInfo | null)[][];

  constructor() {
    this.keys = this.buildKeys();
    this.matrix = this.buildMatrix();
  }

  getKey(row: number, col: number): KeyInfo | null {
    if (row < 0 || row >= KeyLayout.ROWS || col < 0 || col >= KeyLayout.COLS) return null;
    return this.matrix[row][col];
  }

  getKeyById(id: string): KeyInfo | undefined {
    return this.keys.find(k => k.id === id);
  }

  toJSON(): KeyInfo[] {
    return this.keys.map(k => ({ ...k, position: { ...k.position } }));
  }

  private static KEY_DEFS: [number, number, RawKeyDef][] = [
    [0, 0, { id: 'esc', label: 'Esc' }],
    [0, 1, { id: '~', label: '`~' }],
    [0, 2, { id: 'tab', label: 'Tab' }],
    [0, 3, { id: 'caps', label: 'Caps' }],
    [0, 4, { id: 'lshift', label: 'LShift' }],
    [0, 5, { id: 'lctrl', label: 'LCtrl' }],
    [1, 0, { id: 'f1', label: 'F1' }],
    [1, 1, { id: '1', label: '1' }],
    [1, 2, { id: 'q', label: 'Q' }],
    [1, 3, { id: 'a', label: 'A' }],
    [1, 4, { id: 'z', label: 'Z' }],
    [1, 5, { id: 'lwin', label: 'LWin' }],
    [2, 0, { id: 'f2', label: 'F2' }],
    [2, 1, { id: '2', label: '2' }],
    [2, 2, { id: 'w', label: 'W' }],
    [2, 3, { id: 's', label: 'S' }],
    [2, 4, { id: 'x', label: 'X' }],
    [2, 5, { id: 'lalt', label: 'LAlt' }],
    [3, 0, { id: 'f3', label: 'F3' }],
    [3, 1, { id: '3', label: '3' }],
    [3, 2, { id: 'e', label: 'E' }],
    [3, 3, { id: 'd', label: 'D' }],
    [3, 4, { id: 'c', label: 'C' }],
    [4, 0, { id: 'f4', label: 'F4' }],
    [4, 1, { id: '4', label: '4' }],
    [4, 2, { id: 'r', label: 'R' }],
    [4, 3, { id: 'f', label: 'F' }],
    [4, 4, { id: 'v', label: 'V' }],
    [5, 0, { id: 'f5', label: 'F5' }],
    [5, 1, { id: '5', label: '5' }],
    [5, 2, { id: 't', label: 'T' }],
    [5, 3, { id: 'g', label: 'G' }],
    [5, 4, { id: 'b', label: 'B' }],
    [5, 5, { id: 'space', label: 'Space' }],
    [6, 0, { id: 'f6', label: 'F6' }],
    [6, 1, { id: '6', label: '6' }],
    [6, 2, { id: 'y', label: 'Y' }],
    [6, 3, { id: 'h', label: 'H' }],
    [6, 4, { id: 'n', label: 'N' }],
    [7, 0, { id: 'f7', label: 'F7' }],
    [7, 1, { id: '7', label: '7' }],
    [7, 2, { id: 'u', label: 'U' }],
    [7, 3, { id: 'j', label: 'J' }],
    [7, 4, { id: 'm', label: 'M' }],
    [8, 0, { id: 'f8', label: 'F8' }],
    [8, 1, { id: '8', label: '8' }],
    [8, 2, { id: 'i', label: 'I' }],
    [8, 3, { id: 'k', label: 'K' }],
    [8, 4, { id: 'k987', label: ',' }],
    [8, 5, { id: 'ralt', label: 'RAlt' }],
    [9, 0, { id: 'f9', label: 'F9' }],
    [9, 1, { id: '9', label: '9' }],
    [9, 2, { id: 'o', label: 'O' }],
    [9, 3, { id: 'l', label: 'L' }],
    [9, 4, { id: 'k621', label: '.' }],
    [9, 5, { id: 'fn', label: 'Fn' }],
    [10, 0, { id: 'f10', label: 'F10' }],
    [10, 1, { id: '0', label: '0' }],
    [10, 2, { id: 'p', label: 'P' }],
    [10, 3, { id: 'k832', label: ';' }],
    [10, 4, { id: 'k818', label: '/' }],
    [10, 5, { id: 'rctrl', label: 'RCtrl' }],
    [11, 0, { id: 'f11', label: 'F11' }],
    [11, 1, { id: 'k70', label: '-' }],
    [11, 2, { id: 'k659', label: '[' }],
    [11, 3, { id: 'k15', label: "'" }],
    [12, 0, { id: 'f12', label: 'F12' }],
    [12, 1, { id: 'k386', label: '=' }],
    [12, 2, { id: 'k186', label: ']' }],
    [12, 3, { id: 'k610', label: '\\' }],
    [12, 4, { id: 'ç', label: 'Ç' }],
    [13, 0, { id: 'prtsc', label: 'PrtSc' }],
    [13, 1, { id: 'bksp', label: 'Bksp' }],
    [13, 3, { id: 'enter', label: 'Enter' }],
    [13, 4, { id: 'k191', label: '\\' }],
    [13, 5, { id: 'left', label: 'Left' }],
    [14, 0, { id: 'pause', label: 'Pause' }],
    [14, 4, { id: 'up', label: 'Up' }],
    [14, 5, { id: 'down', label: 'Down' }],
    [15, 0, { id: 'del', label: 'Del' }],
    [15, 1, { id: 'home', label: 'Home' }],
    [15, 2, { id: 'end', label: 'End' }],
    [15, 3, { id: 'pgup', label: 'PgUp' }],
    [15, 4, { id: 'pgdn', label: 'PgDn' }],
    [15, 5, { id: 'right', label: 'Right' }]
  ];

  private static NULL_CELLS: [number, number][] = [
    [3, 5],
    [4, 5],
    [6, 5],
    [7, 5],
    [11, 4],
    [11, 5],
    [12, 5],
    [13, 2],
    [14, 1],
    [14, 2],
    [14, 3]
  ];

  private buildKeys(): KeyInfo[] {
    return KeyLayout.KEY_DEFS.map(([row, col, def]) => ({
      id: def.id, label: def.label, position: { row, col }, width: def.width,
    }));
  }

  private buildMatrix(): (KeyInfo | null)[][] {
    const matrix: (KeyInfo | null)[][] = [];
    for (let r = 0; r < KeyLayout.ROWS; r++) {
      matrix[r] = [];
      for (let c = 0; c < KeyLayout.COLS; c++) matrix[r][c] = null;
    }
    for (const key of this.keys) matrix[key.position.row][key.position.col] = key;
    return matrix;
  }
}
