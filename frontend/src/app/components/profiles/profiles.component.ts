import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../services/websocket.service';
import { KeyboardStateService } from '../../services/keyboard-state.service';
import { ProfileListItem, ServerMessage } from '../../models/types';

@Component({
  selector: 'app-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profiles.component.html',
  styleUrls: ['./profiles.component.css'],
})
export class ProfilesComponent implements OnInit, OnDestroy {
  profiles: ProfileListItem[] = [];
  selectedProfile = '';
  profileName = '';
  isBuiltinSelected = false;

  private subs: Subscription[] = [];

  constructor(
    private ws: WebSocketService,
    private state: KeyboardStateService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.ws.messages$.subscribe((msg: ServerMessage) => {
        switch (msg.type) {
          case 'profile_list':
            this.profiles = msg.profiles;
            // Re-check if currently selected is built-in
            this.updateBuiltinStatus();
            break;
          case 'profile_saved':
            this.profileName = '';
            this.ws.sendMessage({ type: 'profile_list' });
            break;
          case 'profile_deleted':
            this.selectedProfile = '';
            this.isBuiltinSelected = false;
            this.ws.sendMessage({ type: 'profile_list' });
            break;
        }
      })
    );

    // Request profile list after connection
    setTimeout(() => this.ws.sendMessage({ type: 'profile_list' }), 1000);
  }

  ngOnDestroy(): void {
    for (const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  onProfileChange(): void {
    this.updateBuiltinStatus();
  }

  onLoad(): void {
    if (!this.selectedProfile) {
      alert('Select a profile to load');
      return;
    }
    this.ws.sendMessage({ type: 'profile_load', name: this.selectedProfile });
  }

  onSave(): void {
    const name = this.profileName.trim();
    if (!name) {
      alert('Enter a profile name');
      return;
    }

    const colors = this.state.collectAllColors();
    const brightness = this.state.brightness$.value;
    const speed = this.state.speed$.value;
    const currentEffect = this.state.currentEffect$.value;

    this.ws.sendMessage({
      type: 'profile_save',
      name,
      profile: {
        colors,
        effect: currentEffect || undefined,
        brightness,
        speed,
      },
    });
  }

  onDelete(): void {
    if (!this.selectedProfile) {
      alert('Select a profile to delete');
      return;
    }
    if (confirm(`Delete profile "${this.selectedProfile}"?`)) {
      this.ws.sendMessage({ type: 'profile_delete', name: this.selectedProfile });
    }
  }

  private updateBuiltinStatus(): void {
    const found = this.profiles.find((p) => p.name === this.selectedProfile);
    this.isBuiltinSelected = found ? found.builtin : false;
  }
}
