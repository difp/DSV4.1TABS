// Парсер Standard MIDI File (SMF) формата 0/1/2.
// Ноты мапятся на гриф позже (в theory.buildSong) по выбору наименьшего лада.
import { TempoMap, TUNING_PRESETS } from '../engine/theory.js';

function readVarLen(dv, state, end) {
  let value = 0, b;
  do {
    if (state.p >= end) return value;
    b = dv.getUint8(state.p++);
    value = (value << 7) | (b & 0x7f);
  } while (b & 0x80);
  return value;
}

function decodeText(bytes) {
  try { return new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/\0/g, '').trim(); }
  catch { return ''; }
}

export function parseMidiBytes(bytes) {
  if (bytes.length < 14 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'MThd') {
    throw new Error('Это не MIDI-файл (отсутствует заголовок MThd)');
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 4;
  const headerLen = dv.getUint32(p); p += 4;
  const format = dv.getUint16(p); p += 2;
  const ntrks = dv.getUint16(p); p += 2;
  const division = dv.getUint16(p); p += 2;
  p += Math.max(0, headerLen - 6);

  const ppq = (division & 0x8000) ? 480 : (division || 480);

  const tempoEvents = [];
  const timeSigEvents = [];
  const rawNotes = []; // { track, channel, midi, startTick, endTick, velocity }
  const trackNames = [];
  const trackPrograms = new Map(); // track*16+channel -> program

  let lastTick = 0;

  for (let ti = 0; ti < ntrks; ti++) {
    if (p + 8 > bytes.length) break;
    const magic = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]);
    if (magic !== 'MTrk') break;
    p += 4;
    const len = dv.getUint32(p); p += 4;
    const end = Math.min(p + len, bytes.length);

    const state = { p };
    let absTick = 0;
    let status = 0;
    let trackName = '';
    const open = new Map(); // key channel*128+note -> {startTick, velocity}

    while (state.p < end) {
      absTick += readVarLen(dv, state, end);
      if (state.p >= end) break;
      let b = bytes[state.p];
      if (b & 0x80) { status = b; state.p++; }
      if (state.p >= end) break;

      const hi = status & 0xf0;
      const channel = status & 0x0f;

      if (status === 0xff) {
        const type = bytes[state.p++];
        const mlen = readVarLen(dv, state, end);
        const data = bytes.subarray(state.p, state.p + mlen);
        state.p += mlen;
        if (type === 0x51 && mlen >= 3) {
          const us = (data[0] << 16) | (data[1] << 8) | data[2];
          if (us > 0) tempoEvents.push({ tick: absTick, bpm: 60000000 / us });
        } else if (type === 0x58 && mlen >= 2) {
          timeSigEvents.push({ tick: absTick, num: data[0] || 4, den: Math.pow(2, data[1] || 2) });
        } else if (type === 0x03) {
          trackName = decodeText(data);
        } else if (type === 0x2f) {
          break;
        }
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        const mlen = readVarLen(dv, state, end);
        state.p += mlen;
        status = 0;
        continue;
      }

      switch (hi) {
        case 0x80: { // note off
          const note = bytes[state.p++]; state.p++;
          const key = channel * 128 + note;
          const o = open.get(key);
          if (o) { rawNotes.push({ track: ti, channel, midi: note, startTick: o.startTick, endTick: absTick, velocity: o.velocity }); open.delete(key); }
          break;
        }
        case 0x90: { // note on
          const note = bytes[state.p++];
          const vel = bytes[state.p++];
          if (vel === 0) {
            const key = channel * 128 + note;
            const o = open.get(key);
            if (o) { rawNotes.push({ track: ti, channel, midi: note, startTick: o.startTick, endTick: absTick, velocity: o.velocity }); open.delete(key); }
          } else {
            const key = channel * 128 + note;
            const prev = open.get(key);
            if (prev) rawNotes.push({ track: ti, channel, midi: note, startTick: prev.startTick, endTick: absTick, velocity: prev.velocity });
            open.set(key, { startTick: absTick, velocity: vel / 127 });
          }
          break;
        }
        case 0xa0: state.p += 2; break;
        case 0xb0: state.p += 2; break;
        case 0xc0: {
          const prog = bytes[state.p++];
          trackPrograms.set(channel, prog);
          break;
        }
        case 0xd0: state.p += 1; break;
        case 0xe0: state.p += 2; break;
        default:
          // неизвестный байт — чтобы не зациклиться
          state.p++;
          break;
      }
    }

    // незакрытые ноты
    for (const [key, o] of open) {
      rawNotes.push({ track: ti, channel: Math.floor(key / 128), midi: key % 128, startTick: o.startTick, endTick: absTick, velocity: o.velocity });
    }
    trackNames[ti] = trackName;
    lastTick = Math.max(lastTick, absTick);
    p = end;
  }

  // Темпо-карта в четвертных долях
  const tempoMap = new TempoMap(
    tempoEvents.map(e => ({ q: e.tick / ppq, bpm: e.bpm })),
    120
  );

  const timeSignatures = timeSigEvents.length
    ? timeSigEvents.map(e => ({ q: e.tick / ppq, num: e.num, den: e.den }))
    : [{ q: 0, num: 4, den: 4 }];

  // Группировка: формат 0 -> по каналам, иначе по трекам
  const groups = new Map();
  const groupKey = (n) => (format === 0 ? `ch${n.channel}` : `tr${n.track}`);
  for (const n of rawNotes) {
    const key = groupKey(n);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: format === 0 ? `Канал ${n.channel + 1}` : (trackNames[n.track] || `Трек ${n.track + 1}`),
        channel: n.channel,
        percussion: n.channel === 9,
        program: trackPrograms.get(n.channel),
        notes: [],
      });
    }
    const g = groups.get(key);
    g.notes.push({
      t: tempoMap.quarterToSeconds(n.startTick / ppq),
      dur: Math.max(0.05, tempoMap.quarterToSeconds(n.endTick / ppq) - tempoMap.quarterToSeconds(n.startTick / ppq)),
      midi: n.midi,
      velocity: n.velocity,
    });
  }

  const tracks = [...groups.values()]
    .filter(g => g.notes.length > 0)
    .map(g => {
      const program = g.program;
      const nameLc = (g.name || '').toLowerCase();
      const pitches = g.notes.map(n => n.midi).sort((a, b) => a - b);
      const median = pitches[Math.floor(pitches.length / 2)];
      const isBass = (program != null && program >= 32 && program <= 39)
        || /bass|бас|контрабас/.test(nameLc)
        || (!g.percussion && median < 38);
      return {
        name: g.name,
        percussion: g.percussion,
        tuning: (isBass ? TUNING_PRESETS.bass : TUNING_PRESETS.standard).pitches.slice(),
        capo: 0,
        notes: g.notes.sort((a, b) => a.t - b.t),
      };
    });

  if (!tracks.length) throw new Error(`В MIDI-файле не найдено нот (fmt=${format}, trk=${ntrks}, raw=${rawNotes.length})`);

  return {
    title: 'MIDI: ' + (trackNames.find(n => n) || 'без названия'),
    artist: '',
    source: 'midi',
    tempoMap,
    timeSignatures,
    tracks,
  };
}
