/**
 * Lightweight runtime validation for incoming WebSocket messages.
 *
 * Accepts a parsed JSON object (or JSON string) and returns the typed
 * {@link WsMessage} on success or an error message string on failure.
 */

import type { RGBColor } from '../color.js';
import type { WsMessage } from './types.js';

function isRGBColor(value: unknown): value is RGBColor {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return typeof c.r === 'number' && typeof c.g === 'number' && typeof c.b === 'number';
}

/**
 * Validates an incoming message against the {@link WsMessage} discriminated union.
 *
 * @param raw - A parsed JSON object or JSON string to validate.
 * @returns The typed {@link WsMessage} on success, or an error string on failure.
 */
export function validateMessage(raw: unknown): WsMessage | string {
  // If raw is a string, attempt JSON parse
  const obj: unknown = typeof raw === 'string' ? tryParseJson(raw) : raw;

  if (!obj || typeof obj !== 'object') {
    return 'Message must be a non-null object';
  }

  const msg = obj as Record<string, unknown>;

  if (typeof msg.type !== 'string' || msg.type.length === 0) {
    return 'Message must have a non-empty type string';
  }

  switch (msg.type) {
    case 'get_layout':
    case 'reset':
    case 'profile_list':
    case 'stop_effect':
      return { type: msg.type };

    case 'set_key_color': {
      if (typeof msg.keyId !== 'string' || msg.keyId.length === 0) {
        return 'set_key_color requires a non-empty keyId string';
      }
      if (!isRGBColor(msg.color)) {
        return 'set_key_color requires a valid color object with r, g, b numbers';
      }
      return {
        type: 'set_key_color',
        keyId: msg.keyId,
        color: msg.color,
      };
    }

    case 'set_colors': {
      if (!msg.colors || typeof msg.colors !== 'object') {
        return 'set_colors requires a colors object';
      }
      const colors = msg.colors as Record<string, unknown>;
      for (const [key, val] of Object.entries(colors)) {
        if (!isRGBColor(val)) {
          return `set_colors: invalid color value for key "${key}"`;
        }
      }
      return {
        type: 'set_colors',
        colors: colors as Record<string, RGBColor>,
      };
    }

    case 'set_all_color': {
      if (!isRGBColor(msg.color)) {
        return 'set_all_color requires a valid color object with r, g, b numbers';
      }
      return {
        type: 'set_all_color',
        color: msg.color,
      };
    }

    case 'set_brightness': {
      if (typeof msg.level !== 'number' || !Number.isFinite(msg.level)) {
        return 'set_brightness requires a numeric level';
      }
      return { type: 'set_brightness', level: msg.level };
    }

    case 'set_speed': {
      if (typeof msg.level !== 'number' || !Number.isFinite(msg.level)) {
        return 'set_speed requires a numeric level';
      }
      return { type: 'set_speed', level: msg.level };
    }

    case 'apply_effect': {
      if (typeof msg.effect !== 'string' || msg.effect.length === 0) {
        return 'apply_effect requires a non-empty effect string';
      }
      const params = msg.params as Record<string, number> | undefined;
      if (params !== undefined) {
        if (typeof params !== 'object' || params === null) {
          return 'apply_effect params must be an object';
        }
        for (const [key, val] of Object.entries(params)) {
          if (typeof val !== 'number') {
            return `apply_effect params.${key} must be a number`;
          }
        }
      }
      return {
        type: 'apply_effect',
        effect: msg.effect,
        ...(params !== undefined ? { params } : {}),
      };
    }

    case 'profile_save': {
      if (typeof msg.name !== 'string' || msg.name.length === 0) {
        return 'profile_save requires a non-empty name string';
      }
      if (!msg.profile || typeof msg.profile !== 'object') {
        return 'profile_save requires a profile object';
      }
      return {
        type: 'profile_save',
        name: msg.name,
        profile: msg.profile as Record<string, unknown>,
      };
    }

    case 'profile_load': {
      if (typeof msg.name !== 'string' || msg.name.length === 0) {
        return 'profile_load requires a non-empty name string';
      }
      return { type: 'profile_load', name: msg.name };
    }

    case 'profile_delete': {
      if (typeof msg.name !== 'string' || msg.name.length === 0) {
        return 'profile_delete requires a non-empty name string';
      }
      return { type: 'profile_delete', name: msg.name };
    }

    default:
      return `Unknown message type: ${msg.type}`;
  }
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
