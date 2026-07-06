/**
 * Radix-2 Cooley-Tukey FFT (in-place, complex input via two Float32Arrays).
 * Returns magnitude spectrum (sqrt(re² + im²)) for first N/2 bins.
 */

export function fftMagnitude(real: Float32Array, imag: Float32Array): Float32Array {
  const N = real.length;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < N; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let m = N >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Butterfly
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1;
    const angle = (-2 * Math.PI) / size;
    for (let i = 0; i < N; i += size) {
      for (let k = 0; k < half; k++) {
        const cos = Math.cos(angle * k);
        const sin = Math.sin(angle * k);
        const tr = real[i + k + half] * cos - imag[i + k + half] * sin;
        const ti = real[i + k + half] * sin + imag[i + k + half] * cos;
        real[i + k + half] = real[i + k] - tr;
        imag[i + k + half] = imag[i + k] - ti;
        real[i + k] += tr;
        imag[i + k] += ti;
      }
    }
  }

  const mag = new Float32Array(N >> 1);
  for (let i = 0; i < mag.length; i++) {
    mag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return mag;
}

/** Apply Hann window in-place. */
export function hannWindow(samples: Float32Array): void {
  const N = samples.length;
  for (let i = 0; i < N; i++) {
    samples[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  }
}
