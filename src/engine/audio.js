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
  }

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return this.ctx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio API не поддерживается браузером');
    this.ctx = new Ctx();
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

  playNote(midi, when, dur, velocity = 0.8) {
    const c = this.ctx;
    if (!c) return;
    const freq = midiToFreq(midi);
    const rel = Math.min(2.4, Math.max(0.3, dur + 0.4));

    const out = c.createGain();
    const peak = Math.max(0.001, 0.85 * velocity);
    out.gain.setValueAtTime(0.0001, when);
    out.gain.linearRampToValueAtTime(peak, when + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0008, when + rel);

    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = 0.8;
    filt.frequency.setValueAtTime(Math.min(6500, freq * 8 + 700), when);
    filt.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 2), when + rel);

    const o1 = c.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = freq;
    const o2 = c.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq * 2;
    const g2 = c.createGain();
    g2.gain.value = 0.22;

    o1.connect(filt);
    o2.connect(g2);
    g2.connect(filt);
    filt.connect(out);
    out.connect(this.guide);

    const stop = when + rel + 0.05;
    o1.start(when);
    o2.start(when);
    o1.stop(stop);
    o2.stop(stop);

    return this._track({ stop: () => { try { o1.stop(); } catch { /* noop */ } try { o2.stop(); } catch { /* noop */ } }, end: stop });
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

  async enableMic() {
    await this.ensure();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Микрофон недоступен: нет navigator.mediaDevices (нужен https или localhost)');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
    this.disableMic();
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
