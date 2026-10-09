// Отрисовка нот: два режима — «падающие» (вертикально) и «табы» (горизонтально, время слева-направо).
// Стиль — матовый, тёплая палитра, без свечения.
import { midiToName, assignFret } from './theory.js';

const STRING_COLORS = [
  '#8b93ff', '#6ee7f0', '#a5b4fc', '#f0abfc', '#93c5fd',
  '#c4b5fd', '#7dd3fc', '#e9d5ff', '#67e8f9', '#c7d2fe',
];
const JUDGE_COLORS = { perfect: '#a5b4fc', good: '#7dd3fc', ok: '#c7d2fe', miss: '#f0857a' };
const JUDGE_TEXT = { perfect: 'ИДЕАЛЬНО', good: 'ХОРОШО', ok: 'ОК', miss: 'ПРОМАХ' };
const INK = '#0b0b18';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';

export class HighwayRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 320;
    this.h = 240;
    this.dpr = 1;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(320, Math.floor(rect.width));
    this.h = Math.max(240, Math.floor(rect.height));
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr);
    else {
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }
  }

  _background() {
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, '#0c0c17');
    bg.addColorStop(1, '#07070d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  _noteState(g, songTime) {
    const base = g.notes[0] && g.notes[0].dead ? '#4a4a63' : null;
    let color = base;
    let alpha = 1;
    if (g.judged) {
      const age = songTime - (g.judgedAt || 0);
      if (g.judge === 'miss') { color = JUDGE_COLORS.miss; alpha = Math.max(0, 1 - age * 0.8); }
      else { color = JUDGE_COLORS[g.judge] || JUDGE_COLORS.perfect; alpha = Math.max(0, 1 - age * 1.6); }
    }
    return { color, alpha };
  }

  _countInAndJudge(songTime, countIn, game) {
    const ctx = this.ctx;
    const { w, h } = this;
    if (countIn) {
      const size = Math.min(w, h) * 0.34;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${size}px ${MONO}`;
      ctx.lineWidth = size * 0.07;
      ctx.strokeStyle = 'rgba(7, 7, 13, 0.85)';
      ctx.strokeText(String(countIn), w / 2, h * 0.44);
      ctx.fillStyle = '#f4f4fb';
      ctx.fillText(String(countIn), w / 2, h * 0.44);
      ctx.restore();
    }
    const lj = game.lastJudge;
    if (lj && songTime - lj.t < 0.6) {
      const alpha = Math.max(0, 1 - (songTime - lj.t) / 0.6);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = JUDGE_COLORS[lj.judge] || '#f4f4fb';
      ctx.font = `700 22px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(JUDGE_TEXT[lj.judge] || '', w / 2, h * 0.3);
      ctx.globalAlpha = 1;
    }
  }

  _detectedMarker(detected, song, x, y) {
    const ctx = this.ctx;
    if (!detected || !Number.isFinite(detected.midi) || detected.clarity <= 0.45) return;
    const a = assignFret(Math.round(detected.midi), song.tuning, song.capo || 0);
    if (!a) return;
    const color = STRING_COLORS[(a.string - 1) % STRING_COLORS.length];
    const r = 9 + detected.clarity * 9;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f4f4fb';
    ctx.font = `700 12px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${midiToName(detected.midi)} ${a.fret}`, x, y + r + 14);
  }

  render(state) {
    if (state.orientation === 'v') this.renderVertical(state);
    else this.renderHorizontal(state);
  }

  // ---------------- Вертикальный режим: ноты падают сверху вниз ----------------
  renderVertical(state) {
    const { song, game, songTime, pxPerSec, detected, showFret, showFinger, countIn } = state;
    const ctx = this.ctx;
    const { w, h } = this;
    const strings = song.stringCount || 6;

    const laneW = Math.min(88, Math.max(44, (w * 0.62) / strings));
    const highwayW = laneW * strings;
    const x0 = (w - highwayW) / 2;
    const hitLineY = h - Math.max(72, h * 0.16);
    const timeToY = (t) => hitLineY - (t - songTime) * pxPerSec;
    const laneCenter = (s) => x0 + (s - 1) * laneW + laneW / 2;

    this._background();

    ctx.save();
    for (let s = 1; s <= strings; s++) {
      const x = x0 + (s - 1) * laneW;
      ctx.fillStyle = s % 2 ? 'rgba(244,244,251,0.02)' : 'rgba(244,244,251,0.045)';
      ctx.fillRect(x, 0, laneW, h);
      ctx.strokeStyle = 'rgba(244,244,251,0.09)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(244,244,251,0.18)';
    ctx.beginPath();
    ctx.moveTo(x0 + 0.5, 0);
    ctx.lineTo(x0 + 0.5, h);
    ctx.moveTo(x0 + highwayW - 0.5, 0);
    ctx.lineTo(x0 + highwayW - 0.5, h);
    ctx.stroke();

    if (song.grid) {
      for (const beat of song.grid.beats) {
        const y = timeToY(beat.t);
        if (y < -2 || y > h + 2) continue;
        ctx.strokeStyle = beat.bar ? 'rgba(244,244,251,0.18)' : 'rgba(244,244,251,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, y + 0.5);
        ctx.lineTo(x0 + highwayW, y + 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();

    const groups = game.groups;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let i = this._lowerBound(groups, songTime - 1.2);
    for (; i < groups.length; i++) {
      const g = groups[i];
      const y = timeToY(g.t);
      if (y < -70) break;
      if (y > h + 60) continue;
      const st = this._noteState(g, songTime);
      for (const note of g.notes) {
        const lane = note.string;
        const cx = laneCenter(lane);
        const color = st.color || (note.dead ? '#4a4a63' : STRING_COLORS[(lane - 1) % STRING_COLORS.length]);
        const alpha = st.alpha;
        if (alpha <= 0.02) continue;

        const tail = Math.min(note.dur || 0.3, 1.6) * pxPerSec;
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = color;
        this._roundRect(ctx, cx - laneW * 0.16, y - tail, laneW * 0.32, tail, 2);
        ctx.fill();

        const nh = Math.min(34, laneW * 0.46);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        this._roundRect(ctx, cx - laneW * 0.39, y - nh / 2, laneW * 0.78, nh, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (showFret) {
          ctx.fillStyle = note.dead ? '#e8ecff' : INK;
          ctx.font = `700 ${Math.round(nh * 0.72)}px ${MONO}`;
          ctx.fillText(note.dead ? '×' : String(note.fret), cx, y + 1);
        }
        if (showFinger && !note.dead && note.finger > 0) {
          ctx.globalAlpha = alpha * 0.95;
          ctx.fillStyle = '#a5b4fc';
          ctx.font = `700 ${Math.round(nh * 0.44)}px ${MONO}`;
          ctx.fillText(String(note.finger), cx, y - nh / 2 - 10);
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#f4f4fb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, hitLineY + 0.5);
    ctx.lineTo(x0 + highwayW, hitLineY + 0.5);
    ctx.stroke();

    for (let s = 1; s <= strings; s++) {
      const cx = laneCenter(s);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = STRING_COLORS[(s - 1) % STRING_COLORS.length];
      ctx.lineWidth = 1.5;
      this._roundRect(ctx, cx - laneW * 0.32, hitLineY - 12, laneW * 0.64, 24, 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = 'rgba(159,161,189,0.95)';
    ctx.font = `600 11px ${MONO}`;
    for (let s = 1; s <= strings; s++) {
      const open = song.tuning[s - 1];
      ctx.fillText(open != null ? midiToName(open, false) : String(s), laneCenter(s), hitLineY + 26);
    }

    if (detected && Number.isFinite(detected.midi) && detected.clarity > 0.45) {
      const a = assignFret(Math.round(detected.midi), song.tuning, song.capo || 0);
      if (a) this._detectedMarker(detected, song, laneCenter(a.string), hitLineY);
    }

    this._countInAndJudge(songTime, countIn, game);
  }

  // ---------------- Горизонтальный режим: табы, время слева направо ----------------
  renderHorizontal(state) {
    const { song, game, songTime, pxPerSec, detected, showFret, showFinger, countIn } = state;
    const ctx = this.ctx;
    const { w, h } = this;
    const strings = song.stringCount || 6;

    const labelW = 46;
    const hitLineX = labelW + 18;
    const rowH = Math.min(46, Math.max(22, (h - 48) / strings));
    const totalH = rowH * strings;
    const topY = (h - totalH) / 2;
    // струна N (высокая) сверху, струна 1 (низкая) снизу — как в табулатуре
    const yFor = (s) => topY + (strings - s) * rowH + rowH / 2;
    const timeToX = (t) => hitLineX + (t - songTime) * pxPerSec;

    this._background();

    // строки-струны
    for (let s = 1; s <= strings; s++) {
      const y = yFor(s);
      const ry = y - rowH / 2;
      ctx.fillStyle = s % 2 ? 'rgba(244,244,251,0.015)' : 'rgba(244,244,251,0.035)';
      ctx.fillRect(0, ry, w, rowH);
      ctx.strokeStyle = 'rgba(244,244,251,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(labelW, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }

    // линии долей / тактов
    if (song.grid) {
      for (const beat of song.grid.beats) {
        const x = timeToX(beat.t);
        if (x < labelW || x > w + 2) continue;
        ctx.strokeStyle = beat.bar ? 'rgba(244,244,251,0.18)' : 'rgba(244,244,251,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, topY);
        ctx.lineTo(x + 0.5, topY + totalH);
        ctx.stroke();
      }
    }

    // ноты
    const groups = game.groups;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let i = this._lowerBound(groups, songTime - 1.2);
    for (; i < groups.length; i++) {
      const g = groups[i];
      const x = timeToX(g.t);
      if (x > w + 80) break;
      if (x < labelW - 60) continue;
      const st = this._noteState(g, songTime);
      for (const note of g.notes) {
        const lane = note.string;
        const cy = yFor(lane);
        const color = st.color || (note.dead ? '#4a4a63' : STRING_COLORS[(lane - 1) % STRING_COLORS.length]);
        const alpha = st.alpha;
        if (alpha <= 0.02) continue;

        const tail = Math.min(note.dur || 0.3, 1.6) * pxPerSec;
        ctx.globalAlpha = alpha * 0.32;
        ctx.fillStyle = color;
        this._roundRect(ctx, x, cy - rowH * 0.14, tail, rowH * 0.28, 2);
        ctx.fill();

        const nh = Math.min(30, rowH * 0.62);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        this._roundRect(ctx, x - nh / 2, cy - nh / 2, nh, nh, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (showFret) {
          ctx.fillStyle = note.dead ? '#e8ecff' : INK;
          ctx.font = `700 ${Math.round(nh * 0.72)}px ${MONO}`;
          ctx.fillText(note.dead ? '×' : String(note.fret), x, cy + 1);
        }
        if (showFinger && !note.dead && note.finger > 0) {
          ctx.globalAlpha = alpha * 0.95;
          ctx.fillStyle = '#a5b4fc';
          ctx.font = `700 ${Math.round(nh * 0.5)}px ${MONO}`;
          ctx.fillText(String(note.finger), x, cy - nh / 2 - 9);
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.globalAlpha = 1;

    // линия удара (вертикальная) и цели по струнам
    ctx.strokeStyle = '#f4f4fb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hitLineX + 0.5, topY);
    ctx.lineTo(hitLineX + 0.5, topY + totalH);
    ctx.stroke();

    for (let s = 1; s <= strings; s++) {
      const y = yFor(s);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = STRING_COLORS[(s - 1) % STRING_COLORS.length];
      ctx.lineWidth = 1.5;
      this._roundRect(ctx, hitLineX - 13, y - rowH * 0.3, 26, rowH * 0.6, 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // подписи струн слева
    ctx.fillStyle = 'rgba(159,161,189,0.95)';
    ctx.font = `600 11px ${MONO}`;
    ctx.textAlign = 'center';
    for (let s = 1; s <= strings; s++) {
      const open = song.tuning[s - 1];
      ctx.fillText(open != null ? midiToName(open, false) : String(s), labelW / 2, yFor(s));
    }

    if (detected && Number.isFinite(detected.midi) && detected.clarity > 0.45) {
      const a = assignFret(Math.round(detected.midi), song.tuning, song.capo || 0);
      if (a) this._detectedMarker(detected, song, hitLineX, yFor(a.string));
    }

    this._countInAndJudge(songTime, countIn, game);
  }

  _lowerBound(arr, t) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].t < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}
