// Спектральный анализ для guided-детекции (алгоритм Гоерцеля).
// Идея: вместо «чистого» определения высоты тона мы проверяем энергию
// на ожидаемых из табулатуры нотах и их гармониках. Это устойчивее к октавным
// ошибкам и позволяет распознавать аккорды (несколько нот одновременно).

const A4_HZ = 440;
const midiToFreq = (m) => A4_HZ * Math.pow(2, (m - 69) / 12);

export class SpectralAnalyzer {
  constructor(sampleRate = 44100) {
    this.sr = sampleRate;
    this.factor = 1;
    this.buf = new Float32Array(0);
    this.win = null;
    this.setSampleRate(sampleRate);
  }

  setSampleRate(sr) {
    if (!(sr > 0)) return;
    this.sr = sr;
    this.factor = Math.max(1, Math.round(sr / 8000));
    this.buf = new Float32Array(0);
    this.win = null;
  }

  _decimate(input) {
    const f = this.factor;
    const n = Math.floor(input.length / f);
    if (n < 64) return 0;
    if (this.buf.length < n) {
      this.buf = new Float32Array(n);
      this.win = new Float32Array(n);
      for (let i = 0; i < n; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    }
    const buf = this.buf;
    for (let i = 0; i < n; i++) {
      let s = 0;
      const base = i * f;
      for (let k = 0; k < f; k++) s += input[base + k];
      buf[i] = s / f;
    }
    return n;
  }

  // Нормированная энергия на частоте по окну Ханна.
  _energy(n, freq, sr) {
    const buf = this.buf;
    const win = this.win;
    const w = (2 * Math.PI * freq) / sr;
    const c = 2 * Math.cos(w);
    let s1 = 0, s2 = 0;
    for (let i = 0; i < n; i++) {
      const x = buf[i] * win[i];
      const s0 = x + c * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    const power = s1 * s1 + s2 * s2 - c * s1 * s2;
    return Math.sqrt(Math.max(0, power)) / n;
  }

  // Для каждого MIDI-номера — поддержка по гармоникам (упор на основной тон).
  analyze(input, midis) {
    const n = this._decimate(input);
    if (!n) return null;
    const sr = this.sr / this.factor;
    const buf = this.buf;
    let sumSq = 0;
    for (let i = 0; i < n; i++) sumSq += buf[i] * buf[i];
    const rms = Math.sqrt(sumSq / n);
    if (rms < 1e-4) return { rms, scores: midis.map(() => 0), max: 0 };

    const nyq = sr / 2;
    const weights = [1, 0.45, 0.7, 0.3]; // 1f, 2f, 3f, 4f
    const scores = midis.map((m) => {
      const f = midiToFreq(m);
      if (f >= nyq) return 0;
      let acc = 0, wsum = 0;
      for (let h = 1; h <= 4; h++) {
        const hf = f * h;
        if (hf >= nyq) break;
        acc += weights[h - 1] * this._energy(n, hf, sr);
        wsum += weights[h - 1];
      }
      return wsum > 0 ? acc / wsum : 0;
    });
    let max = 0;
    for (const s of scores) if (s > max) max = s;
    return { rms, scores, max };
  }
}
