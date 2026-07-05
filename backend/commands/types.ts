import type { Controller } from '../controller.js';
import type { IProfileRepository } from '../ports/iprofile-repository.js';
import type { RGBColor } from '../color.js';
import type { EffectDispatcher } from '../effects/dispatcher.js';
import type { Subject, ServerEvent, CommandResult } from '../observer/server-events.js';

/** Discriminated union of all incoming WebSocket message shapes. */
export type WsMessage =
  | { type: 'get_layout' }
  | { type: 'set_key_color'; keyId: string; color: RGBColor }
  | { type: 'set_colors'; colors: Record<string, RGBColor> }
  | { type: 'set_all_color'; color: RGBColor }
  | { type: 'reset' }
  | { type: 'set_brightness'; level: number }
  | { type: 'set_speed'; level: number }
  | { type: 'apply_effect'; effect: string; params?: Record<string, number> }
  | { type: 'profile_save'; name: string; profile: Record<string, unknown> }
  | { type: 'profile_load'; name: string }
  | { type: 'profile_list' }
  | { type: 'profile_delete'; name: string };

/** Mutable server state shared across commands. */
export interface ServerSettings {
  brightness: number;
  speed: number;
}

/** Context passed to every Command (Command pattern). */
export interface CommandContext {
  controller: Controller;
  profiles: IProfileRepository;
  effectDispatcher: EffectDispatcher;
  settings: ServerSettings;
  message: WsMessage;
  /** Optional Subject for observer-based event dispatch. */
  subject?: Subject<ServerEvent>;
}

/**
 * Command — encapsulates a single WebSocket action.
 *
 * Each command validates input, mutates the controller/repository,
 * and returns {@link CommandResult} events for the server to dispatch.
 */
export interface ICommand {
  readonly type: string;
  execute(context: CommandContext): CommandResult;
}
