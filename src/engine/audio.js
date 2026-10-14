// Audio engine: tab playback (synthesizer), metronome and microphone input.
// Аудио-движок: воспроизведение таба (синтезатор), метроном и вход с микрофона.
import { midiToFreq } from './theory.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.guide = null;
    this.metro = null;
    this.micStream = null;
    this.micSource = null;
    this.micAnalyser = null;
    this._micBuf = null;
    this._sources = new Set();
    this._pluckCache = new Map();
  }

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return this.ctx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio API не поддерживается браузером');
    this.ctx = new Ctx();
    this._pluckCache = new Map();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.guide = this.ctx.createGain();
    this.guide.gain.value = 0.7;
    this.guide.connect(this.master);
    this.metro = this.ctx.createGain();
    this.metro.gain.value = 0.6;
    this.metro.connect(this.master);
    return this.ctx;
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  setGuideVolume(v) { if (this.guide) this.guide.gain.value = v; }
  setMetroVolume(v) { if (this.metro) this.metro.gain.value = v; }

  // Karplus–Strong plucked-string buffer, cached per pitch (guitar-like guide tone).
  // Щипковый синтез Карплуса–Стронга, с кэшем по высоте (гитарный «путевой» тон).
  _pluckBuffer(ctx, midi) {
    const key = Math.round(midi);
    const cached = this._pluckCache.get(key);
    if (cached) return cached;
    const sr = ctx.sampleRate;
    const freq = midiToFreq(key);
    const sec = 1.6;
    const len = Math.max(64, Math.floor(sr * sec));
    const N = Math.max(2, Math.round(sr / freq));
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    const decay = Math.pow(0.001, 1 / Math.max(1, freq * sec)); // ~ -60 dB by the end of `sec`
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx];
      const nxt = ring[(idx + 1) % N];
      out[i] = cur;
      ring[idx] = (cur + nxt) * 0.5 * decay;
      idx = (idx + 1) % N;
    }
    if (this._pluckCache.size < 96) this._pluckCache.set(key, buf);
    return buf;
  }

  playNote(midi, when, dur, velocity = 0.8) {
    const c = this.ctx;
    if (!c) return;
    const freq = midiToFreq(midi);
    const rel = Math.min(1.7, Math.max(0.5, dur + 0.5));
    const src = c.createBufferSource();
    src.buffer = this._pluckBuffer(c, midi);
    const out = c.createGain();
    out.gain.value = 0.9 * velocity;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = 0.6;
    filt.frequency.value = Math.min(7000, freq * 9 + 900);
    src.connect(filt); filt.connect(out); out.connect(this.guide);
    const stop = when + rel;
    src.start(when);
    src.stop(stop);
    this._pick(when, velocity);
    return this._track({ stop: () => { try { src.stop(); } catch { /* noop */ } }, end: stop });
  }

  // Short noise burst — the pick/string attack.
  // Короткий шумовой всплеск — атака медиатора/струны.
  _pick(when, velocity = 0.8) {
    const c = this.ctx;
    if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * 0.012));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
    const g = c.createGain(); g.gain.value = 0.13 * velocity;
    s.connect(hp); hp.connect(g); g.connect(this.guide);
    s.start(when); s.stop(when + 0.02);
    return this._track({ stop: () => { try { s.stop(); } catch { /* noop */ } }, end: when + 0.02 });
  }

  _track(handle) {
    const now = this.now;
    for (const h of this._sources) {
      if (h.end != null && h.end < now - 3) this._sources.delete(h);
    }
    this._sources.add(handle);
    return handle;
  }

  stopAll() {
    for (const h of this._sources) { try { h.stop(); } catch { /* noop */ } }
    this._sources.clear();
  }

  click(when, accent) {
    const c = this.ctx;
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.value = accent ? 1700 : 1150;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.28, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
    o.connect(g);
    g.connect(this.metro);
    o.start(when);
    o.stop(when + 0.09);
    return this._track({ stop: () => { try { o.stop(); } catch { /* noop */ } }, end: when + 0.09 });
  }

  async enableMic(deviceId) {
    await this.ensure();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Микрофон недоступен: нет navigator.mediaDevices (нужен https или localhost)');
    }
    const constraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    };
    if (deviceId) constraints.deviceId = { exact: deviceId };
    const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
    this.disableMic();
    this.inputDeviceId = deviceId || '';
    this.micStream = stream;
    this.micSource = this.ctx.createMediaStreamSource(stream);
    const an = this.ctx.createAnalyser();
    an.fftSize = 4096;
    an.smoothingTimeConstant = 0;
    this.micAnalyser = an;
    this.micSource.connect(an);
    this._micBuf = new Float32Array(an.fftSize);
    return true;
  }

  // List of available devices (labels appear only after permission).
  // Список доступных устройств (метки появляются только после разрешения).
  async listDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { inputs: [], outputs: [], canSelectOutput: false };
    }
    let devices = [];
    try { devices = await navigator.mediaDevices.enumerateDevices(); } catch { /* noop */ }
    const inputs = devices.filter((d) => d.kind === 'audioinput')
      .map((d, i) => ({ id: d.deviceId, label: d.label || `Микрофон ${i + 1}` }));
    const outputs = devices.filter((d) => d.kind === 'audiooutput')
      .map((d, i) => ({ id: d.deviceId, label: d.label || `Устройство вывода ${i + 1}` }));
    const proto = window.AudioContext && window.AudioContext.prototype;
    const canSelectOutput = !!((this.ctx && typeof this.ctx.setSinkId === 'function')
      || (proto && typeof proto.setSinkId === 'function'));
    return { inputs, outputs, canSelectOutput };
  }

  // Output device selection (headphones, etc.).
  // Выбор устройства вывода (наушники и т.п.).
  async setOutputDevice(deviceId) {
    await this.ensure();
    if (typeof this.ctx.setSinkId !== 'function') {
      throw new Error('Выбор вывода не поддерживается браузером');
    }
    await this.ctx.setSinkId(deviceId || '');
    this.outputDeviceId = deviceId || '';
  }

  disableMic() {
    if (this.micSource) { try { this.micSource.disconnect(); } catch { /* noop */ } }
    if (this.micStream) { for (const t of this.micStream.getTracks()) t.stop(); }
    this.micStream = null;
    this.micSource = null;
    this.micAnalyser = null;
    this._micBuf = null;
  }

  get micReady() { return !!this.micAnalyser; }

  getTimeData() {
    if (!this.micAnalyser) return null;
    this.micAnalyser.getFloatTimeDomainData(this._micBuf);
    return this._micBuf;
  }
}
