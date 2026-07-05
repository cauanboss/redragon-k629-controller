import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { KeyboardStateService } from '../../services/keyboard-state.service';
import { LAYOUT } from '../../models/layout';
import { RowDef, RGBColor } from '../../models/types';

@Component({
  selector: 'app-keyboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyboard.component.html',
  styleUrls: ['./keyboard.component.css'],
})
export class KeyboardComponent implements OnInit, OnDestroy {
  readonly KEY_UNIT = 54;
  readonly KEY_HEIGHT = 40;

  layout: RowDef[] = LAYOUT;
  keyColors = new Map<string, RGBColor>();
  selectedKeys = new Set<string>();

  private subs: Subscription[] = [];

  constructor(private state: KeyboardStateService) {}

  ngOnInit(): void {
    this.subs.push(
      this.state.keyColors$.subscribe((colors) => {
        this.keyColors = colors;
      })
    );
    this.subs.push(
      this.state.selectedKeys$.subscribe((keys) => {
        this.selectedKeys = keys;
      })
    );
  }

  ngOnDestroy(): void {
    for (const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  onKeyClick(keyId: string, event: MouseEvent): void {
    this.state.selectKey(keyId, event.ctrlKey || event.metaKey);
  }

  getKeyColor(keyId: string): string {
    const color = this.keyColors.get(keyId);
    if (color) {
      return this.state.rgbToHex(color);
    }
    return '';
  }

  isKeySelected(keyId: string): boolean {
    return this.selectedKeys.has(keyId);
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByKeyId(_index: number, item: { id: string } | null): string | number {
    return item ? item.id : _index;
  }
}
