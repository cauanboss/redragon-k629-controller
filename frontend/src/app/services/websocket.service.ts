import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ServerMessage } from '../models/types';

const WS_URL = 'ws://localhost:3000';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private messagesSubject = new Subject<ServerMessage>();
  private connectionStatusSubject = new Subject<'connected' | 'disconnected' | 'connecting'>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;

  public messages$: Observable<ServerMessage> = this.messagesSubject.asObservable();
  public connectionStatus$: Observable<'connected' | 'disconnected' | 'connecting'> =
    this.connectionStatusSubject.asObservable();

  constructor(private ngZone: NgZone) {
    this.connect();
  }

  sendMessage(msg: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private connect(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.ngZone.run(() => {
      this.connectionStatusSubject.next('connecting');
    });

    try {
      this.ws = new WebSocket(WS_URL);
    } catch {
      this.ngZone.run(() => {
        this.connectionStatusSubject.next('disconnected');
      });
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.ngZone.run(() => {
        this.reconnectAttempt = 0;
        this.connectionStatusSubject.next('connected');
        this.sendMessage({ type: 'get_layout' });
      });
    };

    this.ws.onclose = () => {
      this.ngZone.run(() => {
        this.connectionStatusSubject.next('disconnected');
        this.ws = null;
        this.scheduleReconnect();
      });
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.ngZone.run(() => {
        try {
          const data = JSON.parse(event.data as string) as ServerMessage;
          this.messagesSubject.next(data);
        } catch {
          console.error('Failed to parse server message:', event.data);
        }
      });
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempt++;
    const delay = Math.min(
      RECONNECT_DELAY_MS * Math.pow(1.5, this.reconnectAttempt - 1),
      MAX_RECONNECT_DELAY_MS
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}
