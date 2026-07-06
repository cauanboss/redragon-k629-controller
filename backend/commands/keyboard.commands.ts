import type { RGBColor } from '../color.js';
import type { CommandContext, ICommand, WsMessage } from './types.js';
import { broadcast, error, send } from '../observer/server-events.js';

export class GetLayoutCommand implements ICommand {
  readonly type = 'get_layout';

  execute(context: CommandContext) {
    const keys = context.controller.getLayout().toJSON();
    return send({ type: 'layout', keys });
  }
}

export class SetKeyColorCommand implements ICommand {
  readonly type = 'set_key_color';

  execute(context: CommandContext) {
    const msg = context.message as WsMessage & { type: 'set_key_color'; keyId: string; color: RGBColor };
    const { keyId, color } = msg;

    if (!keyId || !color) {
      return error('set_key_color requires keyId and color');
    }

    context.controller.setKeyColor(keyId, color);
    return broadcast({ type: 'key_color', keyId, color });
  }
}

export class SetColorsCommand implements ICommand {
  readonly type = 'set_colors';

  execute(context: CommandContext) {
    const msg = context.message as WsMessage & { type: 'set_colors'; colors: Record<string, RGBColor> };
    const { colors } = msg;

    if (!colors || typeof colors !== 'object') {
      return error('set_colors requires colors object');
    }

    context.controller.applyColors(colors);
    return { events: [] };
  }
}

export class SetAllColorCommand implements ICommand {
  readonly type = 'set_all_color';

  execute(context: CommandContext) {
    const msg = context.message as WsMessage & { type: 'set_all_color'; color: RGBColor };
    const { color } = msg;

    if (!color) {
      return error('set_all_color requires color');
    }

    context.controller.setAllColor(color);
    return { events: [] };
  }
}

export class ResetCommand implements ICommand {
  readonly type = 'reset';

  execute(context: CommandContext) {
    context.controller.stopEffect();
    context.controller.setAllColor({ r: 0, g: 0, b: 0 });
    return broadcast({ type: 'effect_active', effect: null });
  }
}

export class StopEffectCommand implements ICommand {
  readonly type = 'stop_effect';

  execute(context: CommandContext) {
    context.controller.stopEffect();
    return broadcast({ type: 'effect_active', effect: null });
  }
}

export class SetBrightnessCommand implements ICommand {
  readonly type = 'set_brightness';

  execute(context: CommandContext) {
    const msg = context.message as WsMessage & { type: 'set_brightness'; level: number };
    const rawLevel = msg.level;

    if (rawLevel === undefined || rawLevel < 0 || rawLevel > 5) {
      return error('set_brightness requires level 0-5');
    }

    context.settings.brightness = Math.min(4, Math.round(rawLevel));
    return { events: [] };
  }
}

export class SetSpeedCommand implements ICommand {
  readonly type = 'set_speed';

  execute(context: CommandContext) {
    const msg = context.message as WsMessage & { type: 'set_speed'; level: number };
    const rawLevel = msg.level;

    if (rawLevel === undefined || rawLevel < 0 || rawLevel > 5) {
      return error('set_speed requires level 0-5');
    }

    context.settings.speed = Math.min(4, Math.round(rawLevel));
    return { events: [] };
  }
}

export class ApplyEffectCommand implements ICommand {
  readonly type = 'apply_effect';

  execute(context: CommandContext) {
    const msg = context.message as WsMessage & { type: 'apply_effect'; effect: string; params?: Record<string, number> };
    const effectName = msg.effect;

    if (!effectName) {
      return error('apply_effect requires effect name');
    }

    const brightness = msg.params?.brightness ?? context.settings.brightness;
    const speed = msg.params?.speed ?? context.settings.speed;

    const applied = context.effectDispatcher.apply(
      effectName,
      context.controller,
      { brightness, speed },
    );

    if (!applied) {
      return error(`Unknown effect: ${effectName}`);
    }

    return broadcast({ type: 'effect_active', effect: effectName });
  }
}

function readProfileField<T>(
  profile: Record<string, unknown>,
  field: string,
): T | undefined {
  return profile[field] as T | undefined;
}

export class ProfileSaveCommand implements ICommand {
  readonly type = 'profile_save';

  execute(context: CommandContext) {
    const msg = context.message as WsMessage & { type: 'profile_save'; name: string; profile: Record<string, unknown> };
    const { name, profile } = msg;

    if (!name || !profile) {
      return error('profile_save requires name and profile');
    }

    const result = context.profiles.save({
      name,
      colors: readProfileField<Record<string, RGBColor>>(profile, 'colors') ?? {},
      effect: readProfileField<string>(profile, 'effect'),
      brightness: readProfileField<number>(profile, 'brightness'),
      speed: readProfileField<number>(profile, 'speed'),
    });

    return send({ type: 'profile_saved', name: result.name });
  }
}

export class ProfileLoadCommand implements ICommand {
  readonly type = 'profile_load';

  execute(context: CommandContext) {
    const msg = context.message as WsMessage & { type: 'profile_load'; name: string };
    const { name } = msg;

    if (!name) {
      return error('profile_load requires name');
    }

    const loaded = context.profiles.load(name);

    if (!loaded) {
      return error(`Profile "${name}" not found`);
    }

    // Apply colors
    context.controller.applyColors(loaded.colors);

    // Restore stored effect if present
    if (loaded.effect) {
      const brightness = loaded.brightness ?? 3;
      const speed = loaded.speed ?? 2;
      context.effectDispatcher.apply(loaded.effect, context.controller, { brightness, speed });
    }

    // Restore brightness/speed into server settings
    if (loaded.brightness !== undefined) {
      context.settings.brightness = loaded.brightness;
    }
    if (loaded.speed !== undefined) {
      context.settings.speed = loaded.speed;
    }

    return send({
      type: 'profile_data',
      name,
      profile: loaded,
      brightness: loaded.brightness,
      speed: loaded.speed,
      effect: loaded.effect,
    });
  }
}

export class ProfileListCommand implements ICommand {
  readonly type = 'profile_list';

  execute(context: CommandContext) {
    const names = context.profiles.list();
    const profiles = names.map(name => ({
      name,
      builtin: context.profiles.isBuiltin(name),
    }));
    return send({ type: 'profile_list', profiles });
  }
}

export class ProfileDeleteCommand implements ICommand {
  readonly type = 'profile_delete';

  execute(context: CommandContext) {
    const msg = context.message as WsMessage & { type: 'profile_delete'; name: string };
    const { name } = msg;

    if (!name) {
      return error('profile_delete requires name');
    }

    if (context.profiles.isBuiltin(name)) {
      return error(`"${name}" is a built-in profile and cannot be deleted. Save changes as a new profile instead.`);
    }

    if (context.profiles.delete(name)) {
      return send({ type: 'profile_deleted', name });
    }

    return error(`Profile "${name}" not found`);
  }
}

/** Factory — builds the default command set for the WebSocket server. */
export function createDefaultCommands(): ICommand[] {
  return [
    new GetLayoutCommand(),
    new SetKeyColorCommand(),
    new SetColorsCommand(),
    new SetAllColorCommand(),
    new ApplyEffectCommand(),
    new SetBrightnessCommand(),
    new SetSpeedCommand(),
    new StopEffectCommand(),
    new ResetCommand(),
    new ProfileSaveCommand(),
    new ProfileLoadCommand(),
    new ProfileListCommand(),
    new ProfileDeleteCommand(),
  ];
}
