import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { isTauri } from '@tauri-apps/api/core';
import { WebSocketService } from '../../services/websocket.service';
import { KeyboardStateService } from '../../services/keyboard-state.service';

const STORAGE_KEY = 'redragon-udev-hint-dismissed';

interface UdevHint {
  intro: string;
  commands: string[];
  footer: string;
}

function udevHintForEnvironment(): UdevHint {
  if (isTauri()) {
    return {
      intro: 'USB permission is required. Run in a terminal:',
      commands: [
        'sudo cp "/usr/lib/Redragon K629 Controller/backend/config/99-redragon.rules" /etc/udev/rules.d/',
        'sudo udevadm control --reload-rules && sudo udevadm trigger',
      ],
      footer: 'Then unplug and reconnect the keyboard USB cable.',
    };
  }

  return {
    intro: 'USB permission is required. From the project folder, run:',
    commands: [
      'bash scripts/install-udev.sh',
    ],
    footer: 'Then unplug and reconnect the keyboard USB cable.',
  };
}

@Component({
  selector: 'app-onboarding-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside *ngIf="visible" class="onboarding-banner" role="status">
      <div class="onboarding-text">
        <strong>USB Permission</strong>
        <p>{{ hint.intro }}</p>
        <pre class="udev-commands"><code>{{ commandsText }}</code></pre>
        <span class="onboarding-note">{{ hint.footer }}</span>
      </div>
      <button type="button" class="btn" (click)="dismiss()">Got it</button>
    </aside>
  `,
  styles: [
    `
      .onboarding-banner {
        width: 100%;
        display: flex;
        gap: 12px;
        align-items: flex-start;
        justify-content: space-between;
        padding: 12px 16px;
        background: rgba(255, 200, 0, 0.08);
        border: 1px solid rgba(255, 200, 0, 0.25);
        border-radius: 10px;
        font-size: 0.85rem;
        color: var(--text-secondary);
      }

      .onboarding-text p {
        margin: 6px 0 0;
      }

      .udev-commands {
        margin: 8px 0 0;
        padding: 8px 10px;
        border-radius: 6px;
        background: var(--bg-key);
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .udev-commands code {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 0.78rem;
      }

      .onboarding-note {
        display: block;
        margin-top: 8px;
        color: var(--text-muted);
        font-size: 0.78rem;
      }
    `,
  ],
})
export class OnboardingBannerComponent implements OnInit, OnDestroy {
  visible = false;
  hint = udevHintForEnvironment();
  commandsText = this.hint.commands.join('\n');

  private subs: Subscription[] = [];
  private dismissed = false;

  constructor(
    private ws: WebSocketService,
    private state: KeyboardStateService
  ) {}

  ngOnInit(): void {
    this.dismissed = localStorage.getItem(STORAGE_KEY) === '1';

    this.subs.push(
      combineLatest([
        this.ws.connectionStatus$,
        this.state.keyboardConnected$,
      ]).subscribe(([wsStatus, keyboardConnected]) => {
        const backendReady = wsStatus === 'connected';
        this.visible =
          !this.dismissed && backendReady && !keyboardConnected;
      })
    );
  }

  ngOnDestroy(): void {
    for (const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  dismiss(): void {
    localStorage.setItem(STORAGE_KEY, '1');
    this.dismissed = true;
    this.visible = false;
  }
}
