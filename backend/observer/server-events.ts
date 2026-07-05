/**
 * Observer — receives server-side domain events.
 */
export interface IObserver<T> {
  update(event: T): void;
}

/**
 * Subject — maintains a list of observers and notifies them on change.
 *
 * Used by UIServer to decouple command execution from WebSocket I/O.
 */
export class Subject<T> {
  private readonly observers = new Set<IObserver<T>>();

  subscribe(observer: IObserver<T>): () => void {
    this.observers.add(observer);
    return () => {
      this.observers.delete(observer);
    };
  }

  notify(event: T): void {
    for (const observer of this.observers) {
      observer.update(event);
    }
  }
}

/** Events emitted by WebSocket commands for the server to dispatch. */
export type ServerEvent =
  | { kind: 'send'; data: Record<string, unknown> }
  | { kind: 'broadcast'; data: Record<string, unknown> }
  | { kind: 'error'; message: string };

/** Result of executing a Command — zero or more server events. */
export interface CommandResult {
  events: ServerEvent[];
}

export function send(data: Record<string, unknown>): CommandResult {
  return { events: [{ kind: 'send', data }] };
}

export function broadcast(data: Record<string, unknown>): CommandResult {
  return { events: [{ kind: 'broadcast', data }] };
}

export function error(message: string): CommandResult {
  return { events: [{ kind: 'error', message }] };
}

export function combine(...results: CommandResult[]): CommandResult {
  return {
    events: results.flatMap((result) => result.events),
  };
}
