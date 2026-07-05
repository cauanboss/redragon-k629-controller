import type { ICommand } from './types.js';
import type { CommandResult } from '../observer/server-events.js';
import type { CommandContext } from './types.js';

/**
 * Registry — maps message types to Command instances (Command pattern).
 */
export class CommandRegistry {
  private readonly commands = new Map<string, ICommand>();

  register(command: ICommand): this {
    this.commands.set(command.type, command);
    return this;
  }

  registerAll(commands: ICommand[]): this {
    for (const command of commands) {
      this.register(command);
    }
    return this;
  }

  dispatch(context: CommandContext): CommandResult {
    const command = this.commands.get(context.message.type);

    if (!command) {
      const result: CommandResult = {
        events: [{
          kind: 'error',
          message: `Unknown message type: ${context.message.type}`,
        }],
      };

      // If a Subject is present, notify events through it and return empty
      if (context.subject) {
        for (const event of result.events) {
          context.subject.notify(event);
        }
        return { events: [] };
      }

      return result;
    }

    const result = command.execute(context);

    // If a Subject is present, notify events through it and return empty
    if (context.subject) {
      for (const event of result.events) {
        context.subject.notify(event);
      }
      return { events: [] };
    }

    return result;
  }
}

/** Default registry with all built-in keyboard commands. */
export function createDefaultCommandRegistry(commands: ICommand[]): CommandRegistry {
  return new CommandRegistry().registerAll(commands);
}
