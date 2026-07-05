import { describe, it, expect } from 'vitest';
import { KeyLayout } from '../layout.js';

describe('KeyLayout', () => {
  const layout = new KeyLayout();

  it('has 85 physical keys', () => {
    expect(layout.keys).toHaveLength(85);
  });

  it('has a 16×6 matrix = 96 cells', () => {
    expect(layout.matrix).toHaveLength(16);
    for (const row of layout.matrix) {
      expect(row).toHaveLength(6);
    }
  });

  it('keys + nulls = 96', () => {
    let nullCount = 0;
    for (const row of layout.matrix) {
      for (const cell of row) {
        if (cell === null) nullCount++;
      }
    }
    expect(layout.keys.length + nullCount).toBe(96);
  });

  it('returns null for out-of-bounds positions', () => {
    expect(layout.getKey(-1, 0)).toBeNull();
    expect(layout.getKey(0, -1)).toBeNull();
    expect(layout.getKey(16, 0)).toBeNull();
    expect(layout.getKey(0, 6)).toBeNull();
  });

  it('returns a key for position (0,0) Esc', () => {
    const k = layout.getKey(0, 0);
    expect(k).not.toBeNull();
    expect(k!.id).toBe('esc');
  });

  it('getKeyById returns undefined for unknown IDs', () => {
    expect(layout.getKeyById('nonexistent')).toBeUndefined();
    expect(layout.getKeyById('')).toBeUndefined();
  });

  it('toJSON returns 85 entries', () => {
    expect(layout.toJSON()).toHaveLength(85);
  });

  it('all keys have unique IDs', () => {
    const ids = layout.keys.map(k => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
