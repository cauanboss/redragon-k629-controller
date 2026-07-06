import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../services/websocket.service';
import { KeyboardStateService } from '../../services/keyboard-state.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.css'],
})
export class StatusBarComponent implements OnInit, OnDestroy {
  wsStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  keyboardConnected = false;
  keyboardLabel: string | null = null;
  lastError: string | null = null;

  private subs: Subscription[] = [];

  constructor(
    private ws: WebSocketService,
    private state: KeyboardStateService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.ws.connectionStatus$.subscribe((status) => {
        this.wsStatus = status;
      })
    );
    this.subs.push(
      this.state.keyboardConnected$.subscribe((connected) => {
        this.keyboardConnected = connected;
      })
    );
    this.subs.push(
      this.state.keyboardLabel$.subscribe((label) => {
        this.keyboardLabel = label;
      })
    );
    this.subs.push(
      this.state.lastError$.subscribe((error) => {
        this.lastError = error;
      })
    );
  }

  ngOnDestroy(): void {
    for (const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  get wsBadgeClass(): string {
    return `badge badge-${this.wsStatus}`;
  }

  get wsBadgeText(): string {
    switch (this.wsStatus) {
      case 'connected':
        return 'Server';
      case 'connecting':
        return 'Connecting…';
      case 'disconnected':
        return 'Offline';
    }
  }

  get keyboardBadgeClass(): string {
    return this.keyboardConnected ? 'badge badge-connected' : 'badge badge-disconnected';
  }

  get keyboardBadgeText(): string {
    return this.keyboardConnected ? 'Keyboard' : 'No keyboard';
  }

  get statusText(): string {
    if (this.lastError) {
      return this.lastError;
    }
    if (this.wsStatus !== 'connected') {
      return 'Waiting for backend connection…';
    }
    if (this.keyboardConnected) {
      return this.keyboardLabel ?? 'Keyboard connected';
    }
    return 'Keyboard not detected — check USB cable and udev rules';
  }
}
