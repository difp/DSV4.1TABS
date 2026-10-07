// Нативный формат песен (JSON) — простой и предсказуемый.
// Доли задаются в четвертных нотах от начала (beat), длительности тоже (dur).
import { parseTuning, TUNING_PRESETS } from '../engine/theory.js';

export function parseNative(input) {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  if (!data || typeof data !== 'object') throw new Error('Пустой JSON песни');

  const bpm = Number(data.bpm) || 120;
  let tuning = data.tuning;
  if (!tuning && data.tuningPreset && TUNING_PRESETS[data.tuningPreset]) {
    tuning = TUNING_PRESETS[data.tuningPreset].pitches;
  }
  tuning = tuning ? parseTuning(tuning) : TUNING_PRESETS.standard.pitches.slice();
  const capo = Number(data.capo) || 0;
  const ts = Array.isArray(data.timeSignature) ? data.timeSignature : [4, 4];
  const quarter = 60 / bpm;

  const notes = (data.notes || []).map(n => {
    let t, dur;
    if (n.time != null) {
      t = Number(n.time);
      dur = n.dur != null ? Number(n.dur) : 0.25;
    } else {
      const beat = n.beat != null ? Number(n.beat) : 0;
      t = beat * quarter;
      dur = (n.dur != null ? Number(n.dur) : 1) * quarter;
    }
    const out = { t, dur };
    if (n.string != null) out.string = Number(n.string);
    if (n.fret != null) out.fret = Number(n.fret);
    if (n.midi != null) out.midi = Number(n.midi);
    if (n.dead) out.dead = true;
    if (n.velocity != null) out.velocity = Number(n.velocity);
    return out;
  });

  return {
    title: data.title || 'Песня',
    artist: data.artist || '',
    source: 'native',
    tempo: [{ q: 0, bpm }],
    timeSignatures: [{ q: 0, num: ts[0], den: ts[1] }],
    tracks: [{
      name: data.trackName || 'Гитара',
      tuning,
      capo,
      notes,
    }],
  };
}
