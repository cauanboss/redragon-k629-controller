import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../services/websocket.service';
import { KeyboardStateService } from '../../services/keyboard-state.service';

interface EffectDef {
  id: string;
  label: string;
}

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements OnInit, OnDestroy {
  readonly effects: EffectDef[] = [
    { id: 'static', label: 'Static' },
    { id: 'rainbow', label: 'Rainbow' },
    { id: 'wave', label: 'Wave' },
    { id: 'audio-visualizer', label: '🎵 Audio Viz' },
    { id: 'snake', label: 'Snake' },
    { id: 'star-twinkle', label: 'Star Twinkle' },
    { id: 'sine-wave', label: 'Sine Wave' },
    { id: 'waterfall', label: 'Waterfall' },
    { id: 'rainbow-blossom', label: 'Blossom' },
    { id: 'wheel', label: 'Wheel' },
    { id: 'typing-reactive', label: '⌨️ Type FX' },
  ];

  brightness = 10;
  speed = 2;
  currentEffect: string | null = null;
  selectedKeyCount = 0;
  colorPickerValue = '#ff6600';

  private subs: Subscription[] = [];

  constructor(
    private ws: WebSocketService,
    private state: KeyboardStateService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.state.brightness$.subscribe((b) => (this.brightness = b))
    );
    this.subs.push(
      this.state.speed$.subscribe((s) => (this.speed = s))
    );
    this.subs.push(
      this.state.currentEffect$.subscribe((e) => (this.currentEffect = e))
    );
    this.subs.push(
      this.state.selectedKeys$.subscribe((keys) => (this.selectedKeyCount = keys.size))
    );
  }

  ngOnDestroy(): void {
    for (const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  onEffectClick(effectId: string): void {
    const brightness = Math.round(this.brightness * 4 / 10);
    const speed = Math.round(this.speed * 4 / 10);
    this.ws.sendMessage({
      type: 'apply_effect',
      effect: effectId,
      params: { brightness, speed },
    });
  }

  onBrightnessChange(): void {
    const firmwareLevel = Math.round(this.brightness * 4 / 10);
    this.ws.sendMessage({ type: 'set_brightness', level: firmwareLevel });
    // Sync brightness to state so scaleByBrightness() uses the current value
    this.state.brightness$.next(this.brightness);
    this.state.applyCurrentColors();
  }

  onSpeedChange(): void {
    this.ws.sendMessage({ type: 'set_speed', level: this.speed });
  }

  onApplyColor(): void {
    const color = this.state.hexToRgb(this.colorPickerValue);
    if (this.selectedKeyCount > 0) {
      this.state.applyColorToSelected(color);
    } else {
      this.state.applyColorToAll(color);
    }
  }

  onApplyToSelected(): void {
    if (this.selectedKeyCount === 0) return;
    const color = this.state.hexToRgb(this.colorPickerValue);
    this.state.applyColorToSelected(color);
  }

  onClearSelection(): void {
    this.state.clearSelection();
  }

  onReset(): void {
    this.state.resetAll();
  }

  isEffectActive(effectId: string): boolean {
    return this.currentEffect === effectId;
  }
}
