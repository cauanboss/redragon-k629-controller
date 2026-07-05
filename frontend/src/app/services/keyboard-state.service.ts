import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { RGBColor, ServerMessage } from '../models/types';
import { LAYOUT } from '../models/layout';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root',
})
export class KeyboardStateService implements OnDestroy {
  public keyColors$ = new BehaviorSubject<Map<string, RGBColor>>(new Map());
  public selectedKeys$ = new BehaviorSubject<Set<string>>(new Set());
  public currentEffect$ = new BehaviorSubject<string | null>(null);
  public validKeyIds$ = new BehaviorSubject<Set<string>>(new Set());
  public brightness$ = new BehaviorSubject<number>(10);
  public speed$ = new BehaviorSubject<number>(2);

  private subscriptions: Subscription[] = [];

  constructor(private ws: WebSocketService) {
    this.subscriptions.push(
      this.ws.messages$.subscribe((msg) => this.handleServerMessage(msg))
    );
  }

  ngOnDestroy(): void {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
  }

  rgbToHex(color: RGBColor): string {
    const r = Math.max(0, Math.min(255, Math.round(color.r)));
    const g = Math.max(0, Math.min(255, Math.round(color.g)));
    const b = Math.max(0, Math.min(255, Math.round(color.b)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  hexToRgb(hex: string): RGBColor {
    const value = hex.replace(/^#/, '');
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  selectKey(keyId: string, ctrlKey: boolean): void {
    const current = new Set(this.selectedKeys$.value);
    if (ctrlKey) {
      if (current.has(keyId)) {
        current.delete(keyId);
      } else {
        current.add(keyId);
      }
    } else {
      current.clear();
      current.add(keyId);
    }
    this.selectedKeys$.next(current);
  }

  clearSelection(): void {
    this.selectedKeys$.next(new Set());
  }

  setKeyColor(keyId: string, color: RGBColor): void {
    const colors = new Map(this.keyColors$.value);
    colors.set(keyId, color);
    this.keyColors$.next(colors);
  }

  private scaleByBrightness(color: RGBColor): RGBColor {
    const level = this.brightness$.value;
    const factor = Math.min(level / 10, 1);
    return {
      r: Math.round(color.r * factor),
      g: Math.round(color.g * factor),
      b: Math.round(color.b * factor),
    };
  }

  applyColorToSelected(color: RGBColor): void {
    const selected = this.selectedKeys$.value;
    if (selected.size === 0) return;

    const scaled = this.scaleByBrightness(color);
    const validKeyIds = this.validKeyIds$.value;
    const colors: Record<string, RGBColor> = {};

    for (const keyId of selected) {
      if (validKeyIds.has(keyId)) {
        colors[keyId] = scaled;
      }
    }

    if (Object.keys(colors).length > 0) {
      this.ws.sendMessage({ type: 'set_colors', colors });
    }

    // Update local display with full-brightness color (for preview)
    const currentColors = new Map(this.keyColors$.value);
    for (const keyId of selected) {
      currentColors.set(keyId, color);
    }
    this.keyColors$.next(currentColors);
  }

  applyColorToAll(color: RGBColor): void {
    const scaled = this.scaleByBrightness(color);
    const validKeyIds = this.validKeyIds$.value;
    const colors: Record<string, RGBColor> = {};
    const currentColors = new Map(this.keyColors$.value);

    for (const row of LAYOUT) {
      for (const item of row.keys) {
        if (item !== null) {
          currentColors.set(item.id, color);
          if (validKeyIds.has(item.id)) {
            colors[item.id] = scaled;
          }
        }
      }
    }

    if (Object.keys(colors).length > 0) {
      this.ws.sendMessage({ type: 'set_colors', colors });
    }
    this.keyColors$.next(currentColors);
  }

  applyCurrentColors(): void {
    const keyColors = this.keyColors$.value;
    if (keyColors.size === 0) return;

    const validKeyIds = this.validKeyIds$.value;
    const scaled: Record<string, RGBColor> = {};

    for (const [keyId, color] of keyColors) {
      if (validKeyIds.has(keyId)) {
        scaled[keyId] = this.scaleByBrightness(color);
      }
    }

    if (Object.keys(scaled).length > 0) {
      this.ws.sendMessage({ type: 'set_colors', colors: scaled });
    }
  }

  resetAll(): void {
    this.keyColors$.next(new Map());
    this.ws.sendMessage({ type: 'reset' });
  }

  collectAllColors(): Record<string, RGBColor> {
    const keyColors = this.keyColors$.value;
    const colors: Record<string, RGBColor> = {};
    for (const row of LAYOUT) {
      for (const item of row.keys) {
        if (item !== null && keyColors.has(item.id)) {
          colors[item.id] = keyColors.get(item.id)!;
        }
      }
    }
    return colors;
  }

  private handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'layout': {
        const validKeys = new Set(msg.keys.map((k) => k.id));
        this.validKeyIds$.next(validKeys);

        const colors = new Map(this.keyColors$.value);
        for (const key of msg.keys) {
          if (key.color) {
            colors.set(key.id, key.color);
          }
        }
        this.keyColors$.next(colors);
        break;
      }

      case 'key_color': {
        const colors = new Map(this.keyColors$.value);
        colors.set(msg.keyId, msg.color);
        this.keyColors$.next(colors);
        break;
      }

      case 'effect_active': {
        this.currentEffect$.next(msg.effect);
        break;
      }

      case 'profile_data': {
        const colors = new Map<string, RGBColor>();
        for (const [keyId, color] of Object.entries(msg.profile.colors)) {
          colors.set(keyId, color);
        }
        this.keyColors$.next(colors);
        // Re-apply with current brightness
        this.applyCurrentColors();
        break;
      }

      case 'profile_saved':
        this.ws.sendMessage({ type: 'profile_list' });
        break;

      case 'profile_deleted':
        this.ws.sendMessage({ type: 'profile_list' });
        break;

      default:
        break;
    }
  }
}
