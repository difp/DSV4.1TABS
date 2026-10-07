// Отрисовка "нотной трассы": падающие табы, линия удара, обратная связь.
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
const SANS = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

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

  render(state) {
    const { song, game, songTime, pxPerSec, detected, showFret, countIn } = state;
    const ctx = this.ctx;
    const { w, h } = this;
    const strings = song.stringCount || 6;

    const laneW = Math.min(88, Math.max(44, (w * 0.62) / strings));
    const highwayW = laneW * strings;
    const x0 = (w - highwayW) / 2;
    const hitLineY = h - Math.max(72, h * 0.16);
    const timeToY = (t) => hitLineY - (t - songTime) * pxPerSec;
    const laneCenter = (s) => x0 + (s - 1) * laneW + laneW / 2;

    // фон
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0c0c17');
    bg.addColorStop(1, '#07070d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // трасса
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

    // линии долей / тактов
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

    // ноты
    const groups = game.groups;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let i = this._lowerBound(groups, songTime - 1.2);
    for (; i < groups.length; i++) {
      const g = groups[i];
      const y = timeToY(g.t);
      if (y < -70) break;
      if (y > h + 60) continue;
      for (const note of g.notes) {
        const lane = note.string;
        const cx = laneCenter(lane);
        const baseColor = note.dead ? '#4a4a63' : STRING_COLORS[(lane - 1) % STRING_COLORS.length];

        let color = baseColor;
        let alpha = 1;
        if (g.judged) {
          const age = songTime - (g.judgedAt || 0);
          if (g.judge === 'miss') {
            color = JUDGE_COLORS.miss;
            alpha = Math.max(0, 1 - age * 0.8);
          } else {
            color = JUDGE_COLORS[g.judge] || JUDGE_COLORS.perfect;
            alpha = Math.max(0, 1 - age * 1.6);
          }
        }
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
      }
    }
    ctx.globalAlpha = 1;

    // линия удара
    ctx.strokeStyle = '#f4f4fb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, hitLineY + 0.5);
    ctx.lineTo(x0 + highwayW, hitLineY + 0.5);
    ctx.stroke();

    // цели на линии удара
    for (let s = 1; s <= strings; s++) {
      const cx = laneCenter(s);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = STRING_COLORS[(s - 1) % STRING_COLORS.length];
      ctx.lineWidth = 1.5;
      this._roundRect(ctx, cx - laneW * 0.32, hitLineY - 12, laneW * 0.64, 24, 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // подписи струн
    ctx.fillStyle = 'rgba(159,161,189,0.95)';
    ctx.font = `600 11px ${MONO}`;
    for (let s = 1; s <= strings; s++) {
      const open = song.tuning[s - 1];
      ctx.fillText(open != null ? midiToName(open, false) : String(s), laneCenter(s), hitLineY + 26);
    }

    // индикатор сыгранной ноты
    if (detected && Number.isFinite(detected.midi) && detected.clarity > 0.45) {
      const a = assignFret(Math.round(detected.midi), song.tuning, song.capo || 0);
      if (a) {
        const cx = laneCenter(a.string);
        const r = 9 + detected.clarity * 9;
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = STRING_COLORS[(a.string - 1) % STRING_COLORS.length];
        ctx.beginPath();
        ctx.arc(cx, hitLineY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = STRING_COLORS[(a.string - 1) % STRING_COLORS.length];
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f4f4fb';
        ctx.font = `700 12px ${MONO}`;
        ctx.fillText(`${midiToName(detected.midi)} ${a.fret}`, cx, hitLineY + 46);
      }
    }

    // отсчёт перед стартом — крупно и контрастно (читается с расстояния)
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

    // всплывающая оценка
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
