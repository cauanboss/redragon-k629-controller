/**
 * Maps Linux evdev key codes to KeyLayout key IDs.
 * Evdev codes: https://github.com/torvalds/linux/blob/master/include/uapi/linux/input-event-codes.h
 */
export const EVDEV_TO_LAYOUT: Record<number, string> = {
  // Letters
  30: 'a', 48: 'b', 46: 'c', 32: 'd', 18: 'e', 33: 'f', 34: 'g',
  35: 'h', 23: 'i', 36: 'j', 37: 'k', 38: 'l', 50: 'm', 49: 'n',
  24: 'o', 25: 'p', 16: 'q', 19: 'r', 31: 's', 20: 't', 22: 'u',
  47: 'v', 17: 'w', 45: 'x', 21: 'y', 44: 'z',
  // Numbers
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7',
  9: '8', 10: '9', 11: '0',
  // Function keys
  59: 'f1', 60: 'f2', 61: 'f3', 62: 'f4', 63: 'f5', 64: 'f6',
  65: 'f7', 66: 'f8', 67: 'f9', 68: 'f10', 87: 'f11', 88: 'f12',
  // Navigation
  105: 'left', 106: 'right', 103: 'up', 108: 'down',
  // Special keys
  1: 'esc', 15: 'tab', 58: 'caps', 57: 'space', 14: 'bksp',
  28: 'enter', 111: 'del', 102: 'home', 107: 'end',
  104: 'pgup', 109: 'pgdn', 99: 'prtsc', 119: 'pause',
  // Modifiers
  42: 'lshift', 29: 'lctrl', 56: 'lalt', 125: 'lwin',
  97: 'rctrl', 100: 'ralt',
  // Fn key (code 464 = KEY_FN on many keyboards; may vary)
  464: 'fn',
  // Punctuation — using the project's non-standard key IDs
  41: '~',       // grave/tilde
  12: 'k70',     // minus
  13: 'k386',    // equals
  26: 'k659',    // left bracket
  27: 'k186',    // right bracket
  43: 'k610',    // backslash (position 12,3)
  39: 'k832',    // semicolon
  40: 'k15',     // apostrophe
  51: 'k987',    // comma
  52: 'k621',    // period
  53: 'k818',    // forward slash
  86: 'k191',    // ISO extra key (ABNT2 \ near shift)
  // ABNT2 ç key — may be KEY_RO (89) or differ by firmware
  89: 'ç',
};
