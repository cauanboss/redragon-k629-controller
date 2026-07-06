import { spawn, type ChildProcess } from 'node:child_process';

export type ChunkCallback = (samples: Float32Array) => void;

export class AudioCapture {
  private proc: ChildProcess | null = null;
  private buffer = Buffer.alloc(0);
  private readonly sampleRate: number;
  private readonly chunkSize: number;
  private readonly onChunk: ChunkCallback;

  constructor(sampleRate: number, chunkSize: number, onChunk: ChunkCallback) {
    this.sampleRate = sampleRate;
    this.chunkSize = chunkSize;
    this.onChunk = onChunk;
  }

  async start(): Promise<void> {
    let sink: string;
    try {
      sink = await this.getDefaultSink();
    } catch {
      sink = '@DEFAULT_SINK@';
    }
    const source = `${sink}.monitor`;

    return new Promise((resolve, reject) => {
      this.proc = spawn(
        'parec',
        [
          '-d',
          source,
          '--latency-msec=10',
          '--format=s16le',
          `--rate=${this.sampleRate}`,
          '--channels=1',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      this.proc.stdout!.on('data', (chunk: Buffer) => this.onData(chunk));
      this.proc.on('error', reject);
      this.proc.stdout!.once('data', () => resolve());
    });
  }

  stop(): void {
    if (this.proc) {
      this.proc.kill('SIGTERM');
      this.proc = null;
    }
    this.buffer = Buffer.alloc(0);
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const bytesPerSample = 2;
    const bytesNeeded = this.chunkSize * bytesPerSample;

    while (this.buffer.length >= bytesNeeded) {
      const frame = this.buffer.subarray(0, bytesNeeded);
      this.buffer = this.buffer.subarray(bytesNeeded);

      const samples = new Float32Array(this.chunkSize);
      for (let i = 0; i < this.chunkSize; i++) {
        samples[i] = frame.readInt16LE(i * bytesPerSample) / 32768.0;
      }
      this.onChunk(samples);
    }
  }

  private getDefaultSink(): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('pactl', ['get-default-sink'], { stdio: 'pipe' });
      let output = '';
      proc.stdout.on('data', (d: Buffer) => {
        output += d.toString();
      });
      proc.on('close', (code) => {
        const sink = output.trim();
        if (sink) {
          resolve(sink);
        } else {
          reject(new Error(`pactl exited ${code}`));
        }
      });
      proc.on('error', reject);
    });
  }
}
