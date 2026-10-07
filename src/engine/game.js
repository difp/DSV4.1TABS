// Логика игры: сопоставление сыгранной ноты с табом, очки, комбо, точность.
import { groupNotes } from './theory.js';

export class Game {
  constructor(song, opts = {}) {
    this.song = song;
    this.opts = Object.assign({
      perfect: 0.06,
      good: 0.12,
      early: 0.16,
      late: 0.20,
      chordTolerance: 0.035,
      clarity: 0.5,
      chordMode: 'any', // any | root | all
    }, opts);
    this.groups = groupNotes(song.notes, this.opts.chordTolerance);
    this.autoplay = false;
    this.reset();
  }

  reset() {
    for (const g of this.groups) { g.hit = false; g.judged = false; g.judge = null; g.judgedAt = null; }
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hits = 0;
    this.misses = 0;
    this.missByString = {};
    this.missByFret = {};
    this.notesTotal = this.groups.length;
    this.pointer = 0;
    this.events = [];
    this.lastJudge = null;
    this.finished = false;
  }

  // Сбрасывает оценку нот после позиции (при перемотке), не трогая очки.
  rewind(songTime) {
    for (const g of this.groups) {
      if (g.t >= songTime - 0.15) { g.hit = false; g.judged = false; g.judge = null; g.judgedAt = null; }
    }
    this.pointer = 0;
    this.advancePointer();
    this.finished = false;
  }

  advancePointer() {
    while (this.pointer < this.groups.length && this.groups[this.pointer].judged) this.pointer++;
  }

  update(now, detected) {
    this.events.length = 0;
    const { early, late, perfect, good, clarity } = this.opts;

    if (this.autoplay) {
      for (let i = this.pointer; i < this.groups.length; i++) {
        const g = this.groups[i];
        if (g.judged) continue;
        if (g.t > now) break;
        if (now - g.t <= late) this._hit(g, now, 0);
      }
    } else if (detected) {
      const heard = detected.heard instanceof Set ? detected.heard : null;
      const yinMidi = Number.isFinite(detected.midi) && detected.clarity >= clarity ? Math.round(detected.midi) : null;
      if (heard || yinMidi != null) {
        let best = null;
        let bestDt = Infinity;
        for (let i = this.pointer; i < this.groups.length; i++) {
          const g = this.groups[i];
          if (g.judged) continue;
          if (g.t - early > now) break;
          const dt = Math.abs(now - g.t);
          if (dt > late || dt > bestDt) continue;
          if (!this._matches(g, heard, yinMidi)) continue;
          best = g;
          bestDt = dt;
        }
        if (best) this._hit(best, now, now - best.t);
      }
    }

    // Пропуски
    for (let i = this.pointer; i < this.groups.length; i++) {
      const g = this.groups[i];
      if (g.judged) continue;
      if (g.t - early > now) break;
      if (now - g.t > late) this._miss(g, now);
    }

    this.advancePointer();

    if (!this.finished && this.pointer >= this.groups.length && now > this.song.duration + late) {
      this.finished = true;
      this.events.push({ type: 'finish', t: now });
    }
  }

  // Совпадает ли группа с услышанным (guided-энергия и/или YIN).
  _matches(g, heard, yinMidi) {
    const has = (m) => (heard != null && heard.has(m)) || (yinMidi != null && yinMidi === m);
    if (g.notes.every((n) => n.dead)) return heard != null || yinMidi != null;
    const mode = this.opts.chordMode || 'any';
    if (mode === 'all' && heard && g.notes.length > 1) {
      return g.notes.every((n) => n.dead || has(Math.round(n.midi)));
    }
    if (mode === 'root') {
      const root = g.notes.reduce((a, b) => (b.midi < a.midi ? b : a), g.notes[0]);
      return has(Math.round(root.midi));
    }
    return g.notes.some((n) => has(Math.round(n.midi)));
  }

  _hit(g, now, dt) {
    g.hit = true;
    g.judged = true;
    g.judgedAt = now;
    const adt = Math.abs(dt);
    let judge = 'ok', points = 40;
    if (adt <= this.opts.perfect) { judge = 'perfect'; points = 100; }
    else if (adt <= this.opts.good) { judge = 'good'; points = 70; }
    g.judge = judge;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.hits++;
    const mult = 1 + Math.floor(this.combo / 10) * 0.5;
    this.score += Math.round(points * mult);
    this.lastJudge = { judge, dt, t: now };
    this.events.push({ type: 'hit', judge, dt, notes: g.notes, t: now, combo: this.combo });
  }

  _miss(g, now) {
    g.judged = true;
    g.judgedAt = now;
    g.judge = 'miss';
    this.combo = 0;
    this.misses++;
    // статистика ошибок: по струне и по ладу (для советов и отработки)
    for (const n of g.notes) {
      const s = String(n.string);
      const f = String(n.fret);
      this.missByString[s] = (this.missByString[s] || 0) + 1;
      this.missByFret[f] = (this.missByFret[f] || 0) + 1;
    }
    this.lastJudge = { judge: 'miss', t: now };
    this.events.push({ type: 'miss', notes: g.notes, t: now });
  }

  get accuracy() {
    const total = this.hits + this.misses;
    return total === 0 ? 1 : this.hits / total;
  }

  get progress() {
    return this.groups.length === 0 ? 0 : this.pointer / this.groups.length;
  }
}
