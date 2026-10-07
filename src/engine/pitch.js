// Определение основного тона методом YIN (с децимацией для скорости).
// Работает в реальном времени на монофоническом сигнале (одна нота / аккорд).
import { freqToMidi } from './theory.js';

export class PitchDetector {
  constructor(sampleRate = 44100) {
    this.sr = sampleRate;
    this.targetRate = 8000;
    this.minFreq = 60;
    this.maxFreq = 1500;
    this.threshold = 0.15;
    this.rmsGate = 0.006;
    this._buf = new Float32Array(0);
    this._d = null;
    this._dp = null;
  }

  setSampleRate(sr) {
    if (sr > 0) this.sr = sr;
  }

  _ensure(n) {
    if (this._buf.length < n) this._buf = new Float32Array(n);
    if (!this._d || this._d.length < n) { this._d = new Float32Array(n); this._dp = new Float32Array(n); }
  }

  detect(input) {
    const factor = Math.max(1, Math.round(this.sr / this.targetRate));
    const n = Math.floor(input.length / factor);
    if (n < 64) return null;

    this._ensure(n);
    const x = this._buf;
    const dsr = this.sr / factor;

    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      let s = 0;
      const base = i * factor;
      for (let k = 0; k < factor; k++) s += input[base + k];
      const v = s / factor;
      x[i] = v;
      sumSq += v * v;
    }

    const rms = Math.sqrt(sumSq / n);
    if (rms < this.rmsGate) return { freq: 0, midi: NaN, clarity: 0, rms };

    const tauMax = Math.min(Math.floor(dsr / this.minFreq), n - 2);
    const tauMin = Math.max(2, Math.floor(dsr / this.maxFreq));
    const w = n - tauMax;
    if (w < 32 || tauMax <= tauMin) return null;

    const d = this._d;
    const dp = this._dp;

    for (let tau = 1; tau <= tauMax; tau++) {
      let s = 0;
      for (let j = 0; j < w; j++) {
        const diff = x[j] - x[j + tau];
        s += diff * diff;
      }
      d[tau] = s;
    }

    dp[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
      running += d[tau];
      dp[tau] = running > 0 ? (d[tau] * tau) / running : 1;
    }

    let tauEst = -1;
    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (dp[tau] < this.threshold && dp[tau] <= dp[tau - 1] && dp[tau] < dp[tau + 1]) {
        tauEst = tau;
        break;
      }
    }
    if (tauEst < 0) {
      let best = tauMin;
      for (let tau = tauMin + 1; tau <= tauMax; tau++) if (dp[tau] < dp[best]) best = tau;
      tauEst = best;
    }

    let betterTau = tauEst;
    const x0 = tauEst > tauMin ? tauEst - 1 : tauEst;
    const x2 = tauEst < tauMax - 1 ? tauEst + 1 : tauEst;
    const s0 = dp[x0], s1 = dp[tauEst], s2 = dp[x2];
    const denom = 2 * (2 * s1 - s0 - s2);
    if (denom !== 0) betterTau = tauEst - (s2 - s0) / denom;

    const clarity = Math.max(0, Math.min(1, 1 - dp[tauEst]));
    const freq = dsr / betterTau;
    if (clarity < 0.5 || freq < this.minFreq || freq > this.maxFreq) {
      return { freq: 0, midi: NaN, clarity, rms };
    }
    return { freq, midi: freqToMidi(freq), clarity, rms };
  }
}
