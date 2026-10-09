// Музыкальная теория, строи, тайминги (темпо-карта, сетка долей).
// Внутреннее соглашение: струна 1 = самая низкая (толстая), струна N = самая высокая.
// index 0 массива строя соответствует струне 1.

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const A4_HZ = 440;

export function midiToFreq(midi) {
  return A4_HZ * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / A4_HZ);
}

export function midiToName(midi, withOctave = true) {
  const m = Math.round(midi);
  const name = NOTE_NAMES[((m % 12) + 12) % 12];
  return withOctave ? name + (Math.floor(m / 12) - 1) : name;
}

export function nameToMidi(text) {
  const s = String(text).trim();
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(s);
  if (!m) {
    const n = Number(s);
    if (Number.isFinite(n)) return n;
    throw new Error('Нота не распознана: ' + text);
  }
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semi = base[m[1].toUpperCase()];
  if (m[2] === '#') semi += 1;
  else if (m[2] === 'b') semi -= 1;
  return (parseInt(m[3], 10) + 1) * 12 + semi;
}

export function parseTuning(input) {
  if (Array.isArray(input)) return input.map(v => (typeof v === 'number' ? v : nameToMidi(v)));
  if (typeof input === 'string') return input.trim().split(/[\s,]+/).filter(Boolean).map(nameToMidi);
  throw new Error('Неверный формат строя');
}

// Строи указаны от самой низкой струны к самой высокой.
export const TUNING_PRESETS = {
  standard: { name: 'Standard E (EADGBE)', pitches: [40, 45, 50, 55, 59, 64] },
  eb: { name: 'Eb (полутон вниз)', pitches: [39, 44, 49, 54, 58, 63] },
  dropd: { name: 'Drop D (DADGBE)', pitches: [38, 45, 50, 55, 59, 64] },
  dropc: { name: 'Drop C (CGCFAD)', pitches: [36, 43, 48, 53, 57, 62] },
  dadgad: { name: 'DADGAD', pitches: [38, 45, 50, 55, 57, 62] },
  openg: { name: 'Open G (DGDGBD)', pitches: [38, 43, 50, 55, 59, 62] },
  bass: { name: 'Бас EADG', pitches: [28, 33, 38, 43] },
};

export function pitchFor(tuning, string, fret, capo = 0) {
  const open = tuning[string - 1];
  return open === undefined ? null : open + capo + fret;
}

export function assignFret(pitch, tuning, capo = 0, maxFret = 24) {
  const tryAssign = (p) => {
    let best = null;
    for (let s = 1; s <= tuning.length; s++) {
      const fret = p - (tuning[s - 1] + capo);
      if (fret >= 0 && fret <= maxFret && (!best || fret < best.fret)) {
        best = { string: s, fret, midi: p };
      }
    }
    return best;
  };
  let best = tryAssign(pitch);
  let p = pitch;
  while (!best && p > 24) { p -= 12; best = tryAssign(p); }
  while (!best && p < 108) { p += 12; best = tryAssign(p); }
  return best;
}

// Аппликатура левой руки: 0 — открытая струна, 1..4 — указательный..мизинец.
// Позиция (лад указательного пальца) двигается минимально; работает как эвристика
// «один палец на лад», которой учат новичков.
export function assignFingers(notes) {
  let base = 1;
  let started = false;
  let lastT = -Infinity;
  for (const n of notes) {
    if (n.dead) { n.finger = 0; continue; }
    if (!Number.isFinite(n.fret) || n.fret <= 0) { n.finger = 0; started = false; lastT = n.t; continue; }
    const phraseBreak = n.t - lastT > 1.5;
    if (!started || phraseBreak) {
      base = Math.max(1, n.fret);
      started = true;
    } else if (n.fret < base) {
      base = Math.max(1, n.fret);
    } else if (n.fret > base + 3) {
      base = Math.max(1, n.fret - 3);
    }
    n.finger = Math.max(1, Math.min(4, n.fret - base + 1));
    lastT = n.t;
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Темпо-карта: ступенчатая (между событиями темп постоянен).
// События задаются в четвертных долях: { q, bpm }.
// ---------------------------------------------------------------------------
export class TempoMap {
  constructor(events, defaultBpm = 120) {
    let list = (events && events.length) ? events.slice() : [{ q: 0, bpm: defaultBpm }];
    list = list.filter(e => e && Number.isFinite(e.q) && Number.isFinite(e.bpm) && e.bpm > 0);
    list.sort((a, b) => a.q - b.q);
    this.events = [];
    for (const e of list) {
      const last = this.events[this.events.length - 1];
      if (last && Math.abs(last.q - e.q) < 1e-9) last.bpm = e.bpm;
      else this.events.push({ q: e.q, bpm: e.bpm });
    }
    if (this.events.length === 0) this.events = [{ q: 0, bpm: defaultBpm }];
    if (this.events[0].q > 0) this.events.unshift({ q: 0, bpm: this.events[0].bpm });

    this.seconds = [0];
    for (let i = 1; i < this.events.length; i++) {
      const a = this.events[i - 1];
      const b = this.events[i];
      this.seconds[i] = this.seconds[i - 1] + (b.q - a.q) * 60 / a.bpm;
    }
  }

  get bpmAtStart() { return this.events[0].bpm; }

  quarterToSeconds(q) {
    const first = this.events[0];
    if (q <= first.q) return (q - first.q) * 60 / first.bpm;
    let i = this.events.length - 1;
    while (i > 0 && this.events[i].q > q) i--;
    const a = this.events[i];
    return this.seconds[i] + (q - a.q) * 60 / a.bpm;
  }
}

// Сетка долей и тактов для отрисовки. TimeSignatures: [{ q, num, den }].
export function buildGrid({ tempoMap, timeSignatures, duration }) {
  let ts = (timeSignatures && timeSignatures.length)
    ? timeSignatures.slice()
    : [{ q: 0, num: 4, den: 4 }];
  ts = ts.filter(t => t && Number.isFinite(t.q)).sort((a, b) => a.q - b.q);
  if (!ts.length || ts[0].q > 0) ts.unshift({ q: 0, num: 4, den: 4 });

  const beats = [];
  const bars = [];
  const limit = duration + 1.5;
  let q = 0;
  let idx = 0;
  let cur = ts[0];
  let guard = 0;
  while (guard++ < 20000) {
    const t = tempoMap.quarterToSeconds(q);
    if (t > limit) break;
    bars.push(t);
    const beatLen = 4 / cur.den;
    for (let b = 0; b < cur.num; b++) {
      const bq = q + b * beatLen;
      beats.push({ t: tempoMap.quarterToSeconds(bq), bar: b === 0 });
    }
    q += cur.num * beatLen;
    while (idx + 1 < ts.length && ts[idx + 1].q <= q + 1e-9) { idx++; cur = ts[idx]; }
  }
  return { beats, bars };
}

// Превращает "сырую" песню парсера в игровую модель (струны/лады + тайминги).
export function buildSong(raw, trackIndex = 0) {
  const tracks = raw.tracks || [];
  const idx = Math.max(0, Math.min(trackIndex, tracks.length - 1));
  const track = tracks[idx] || { notes: [] };
  const tuning = (track.tuning && track.tuning.length) ? track.tuning.slice() : TUNING_PRESETS.standard.pitches.slice();
  const capo = track.capo || 0;
  const notes = [];

  for (const n of track.notes || []) {
    let midi = n.midi;
    let string = n.string;
    let fret = n.fret;
    if ((midi == null || !Number.isFinite(midi)) && string != null && fret != null) {
      midi = pitchFor(tuning, string, fret, capo);
    }
    if ((string == null || fret == null) && Number.isFinite(midi)) {
      const a = assignFret(midi, tuning, capo);
      if (a) { string = a.string; fret = a.fret; }
    }
    if (!Number.isFinite(midi)) continue;
    notes.push({
      t: n.t,
      dur: n.dur || 0.25,
      midi,
      string: string || 1,
      fret: fret == null ? 0 : fret,
      dead: !!n.dead,
      velocity: n.velocity == null ? 0.8 : n.velocity,
    });
  }
  notes.sort((a, b) => a.t - b.t || a.string - b.string);
  assignFingers(notes);

  let duration = 0;
  for (const n of notes) duration = Math.max(duration, n.t + n.dur);

  const tempoMap = raw.tempoMap instanceof TempoMap
    ? raw.tempoMap
    : new TempoMap(raw.tempo || [{ q: 0, bpm: raw.bpm || 120 }]);
  const grid = buildGrid({
    tempoMap,
    timeSignatures: raw.timeSignatures || [{ q: 0, num: 4, den: 4 }],
    duration,
  });

  return {
    title: raw.title || 'Без названия',
    artist: raw.artist || '',
    source: raw.source || 'native',
    stringCount: tuning.length,
    tuning,
    capo,
    notes,
    duration,
    tempoMap,
    grid,
    bpm: tempoMap.bpmAtStart,
    timeSignatures: raw.timeSignatures || [{ q: 0, num: 4, den: 4 }],
    trackIndex: idx,
    trackName: track.name || '',
    trackCount: tracks.length,
    tracksMeta: tracks.map(t => ({ name: t.name || '', percussion: !!t.percussion, noteCount: (t.notes || []).length })),
  };
}

// Группировка одновременных нот в аккорд (для монофонического детектора).
export function groupNotes(notes, tolerance = 0.035) {
  const groups = [];
  let cur = null;
  for (const n of notes) {
    if (!cur || n.t - cur.t > tolerance) {
      cur = { t: n.t, notes: [], hit: false, judged: false, judge: null };
      groups.push(cur);
    }
    cur.notes.push(n);
  }
  return groups;
}
