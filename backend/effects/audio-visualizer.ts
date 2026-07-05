import type { IEffect, IEffectLifecycle } from '../effect.js';
import type { KeyInfo } from '../layout.js';
import type { RGBColor } from '../color.js';
import { hslToRgb } from '../color.js';
import { AudioCapture } from './audio-capture.js';
import { fftMagnitude, hannWindow } from './fft.js';

const FFT_SIZE = 256;
const NUM_COLS = 6;
const EMA_ALPHA = 0.3;

// Logarithmic bin groups per column (skip bin 0 = DC)
const COLUMN_BIN_RANGES: [number, number][] = [
  [1, 3],    [4, 7],    [8, 15],
  [16, 31],  [32, 63],  [64, 127],
];

class SpectrumData {
  readonly columns = new Float32Array(NUM_COLS);

  update(magnitudes: Float32Array): void {
    for (let col = 0; col < NUM_COLS; col++) {
      const [start, end] = COLUMN_BIN_RANGES[col];
      let sum = 0;
      for (let i = start; i <= end; i++) sum += magnitudes[i];
      const avg = sum / (end - start + 1);
      const normalized = Math.min(1.0, Math.log10(1 + avg * 50) / 2.5);
      this.columns[col] = this.columns[col] * (1 - EMA_ALPHA) + normalized * EMA_ALPHA;
    }
  }

  getColumn(col: number): number {
    return this.columns[col] ?? 0;
  }
}

export class AudioVisualizerEffect implements IEffect, IEffectLifecycle {
  readonly name = 'audio-visualizer';
  readonly description = 'Music visualizer — frequency bars on keyboard columns reacting to system audio';

  private capture: AudioCapture | null = null;
  private spectrum = new SpectrumData();
  private available = false;
  private started = false;
  private warnedUnavailable = false;

  onStart(): void {
    if (this.started) return;
    this.started = true;
    this.warnedUnavailable = false;

    this.capture = new AudioCapture(16000, FFT_SIZE, (samples) => {
      const real = new Float32Array(samples);
      const imag = new Float32Array(FFT_SIZE);
      hannWindow(real);
      const mag = fftMagnitude(real, imag);
      this.spectrum.update(mag);
    });

    this.capture.start()
      .then(() => { this.available = true; })
      .catch(() => {
        this.available = false;
      });
  }

  onStop(): void {
    this.capture?.stop();
    this.capture = null;
    this.available = false;
    this.started = false;
  }

  getColorAt(key: KeyInfo, _step: number, _time: number): RGBColor {
    if (!this.available) {
      if (this.started && !this.warnedUnavailable) {
        console.warn('Audio visualizer: capture unavailable. Install pulseaudio-utils (parec).');
        this.warnedUnavailable = true;
      }
      return { r: 0, g: 0, b: 0 };
    }

    const col = key.position.col;
    const row = key.position.row;
    const amplitude = this.spectrum.getColumn(col);

    const barRows = Math.round(amplitude * 16);
    const rowFromBottom = 15 - row;
    if (rowFromBottom >= barRows) return { r: 0, g: 0, b: 0 };

    const hue = (240 - (col / 5) * 240) / 360; // blue→red
    const saturation = 1.0;
    const lightness = 0.25 + 0.55 * (rowFromBottom / Math.max(1, barRows - 1));

    return hslToRgb(hue, saturation, lightness);
  }
}
