import { describe, it, expect } from 'vitest';
import { CommandRegistry } from '../commands/registry.js';
import { createDefaultCommands } from '../commands/keyboard.commands.js';
import type { CommandContext } from '../commands/types.js';
import type { Controller } from '../controller.js';
import type { EffectDispatcher } from '../effects/dispatcher.js';
import type { IProfileRepository } from '../ports/iprofile-repository.js';

function createContext(
  message: CommandContext['message'],
  overrides: Partial<CommandContext> = {},
): CommandContext {
  const controller = {
    getLayout: () => ({
      toJSON: () => [{ id: 'esc', label: 'Esc' }],
    }),
    setKeyColor: () => {},
    applyColors: () => {},
    setAllColor: () => {},
    stopEffect: () => {},
  } as unknown as Controller;

  const profiles: IProfileRepository = {
    list: () => ['default'],
    save: () => ({ saved: true, name: 'default' }),
    load: () => undefined,
    delete: () => false,
    isBuiltin: () => false,
  };

  const effectDispatcher = {
    apply: () => true,
  } as unknown as EffectDispatcher;

  return {
    controller,
    profiles,
    effectDispatcher,
    settings: { brightness: 3, speed: 2 },
    message,
    ...overrides,
  };
}

describe('CommandRegistry', () => {
  const registry = new CommandRegistry().registerAll(createDefaultCommands());

  it('dispatches get_layout command', () => {
    const result = registry.dispatch(createContext({ type: 'get_layout' }));

    expect(result.events).toEqual([
      {
        kind: 'send',
        data: {
          type: 'layout',
          keys: [{ id: 'esc', label: 'Esc' }],
        },
      },
    ]);
  });

  it('returns error for unknown message type', () => {
    const result = registry.dispatch(createContext({ type: 'invalid' }));

    expect(result.events).toEqual([
      { kind: 'error', message: 'Unknown message type: invalid' },
    ]);
  });

  it('validates set_key_color payload', () => {
    const result = registry.dispatch(createContext({ type: 'set_key_color' }));

    expect(result.events).toEqual([
      { kind: 'error', message: 'set_key_color requires keyId and color' },
    ]);
  });
});
