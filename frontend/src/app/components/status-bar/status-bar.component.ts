import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-bar.component.html',
  styleUrls: ['./status-bar.component.css'],
})
export class StatusBarComponent implements OnInit, OnDestroy {
  status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  statusText = 'Waiting for connection…';

  private subs: Subscription[] = [];

  constructor(private ws: WebSocketService) {}

  ngOnInit(): void {
    this.subs.push(
      this.ws.connectionStatus$.subscribe((status) => {
        this.status = status;
        switch (status) {
          case 'connected':
            this.statusText = 'Connected to server';
            break;
          case 'connecting':
            this.statusText = 'Connecting to server…';
            break;
          case 'disconnected':
            this.statusText = 'Disconnected from server';
            break;
        }
      })
    );
  }

  ngOnDestroy(): void {
    for (const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  get badgeClass(): string {
    return `badge badge-${this.status}`;
  }

  get badgeText(): string {
    switch (this.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting…';
      case 'disconnected':
        return 'Disconnected';
    }
  }
}
