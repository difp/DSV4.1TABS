// Парсер Guitar Pro 6/7/8 (.gpx, .gp): ZIP-контейнер + Content/score.gpif.
// Формат GPIF разобран по спецификации Guitar Pro (сверено с реализацией alphaTab).
// Соглашение GPIF: <String> 0 = самая низкая струна; <Pitches> перечислены от низкой к высокой.
import { isZip, readZip, findEntry } from './zip.js';
import { TempoMap, TUNING_PRESETS } from '../engine/theory.js';

const childOf = (el, name) => {
  if (!el) return null;
  for (const c of el.children) if (c.localName === name) return c;
  return null;
};
const childrenOf = (el, name) => {
  const out = [];
  if (!el) return out;
  for (const c of el.children) if (c.localName === name) out.push(c);
  return out;
};
const textOf = (el, name) => { const c = childOf(el, name); return c ? c.textContent : null; };
const splitNums = (s) => (s || '').trim().split(/\s+/).filter(Boolean);
const toInt = (s, d) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : d; };
const toFloat = (s, d) => { const n = parseFloat(s); return Number.isFinite(n) ? n : d; };

const BASE_QUARTERS = {
  Long: 16, DoubleWhole: 8, Whole: 4, Half: 2, Quarter: 1,
  Eighth: 0.5, '16th': 0.25, '32nd': 0.125, '64th': 0.0625,
  '128th': 0.03125, '256th': 0.015625,
};

function beatQuarters(rhythm) {
  if (!rhythm) return 1;
  let q = BASE_QUARTERS[rhythm.value] != null ? BASE_QUARTERS[rhythm.value] : 1;
  const dots = rhythm.dots || 0;
  if (dots > 0) q *= 2 - Math.pow(0.5, dots);
  if (rhythm.num > 0 && rhythm.den > 0) q *= rhythm.den / rhythm.num;
  return q;
}

function findProperty(scope, name) {
  if (!scope) return null;
  for (const p of scope.getElementsByTagNameNS('*', 'Property')) {
    if (p.getAttribute('name') === name) return p;
  }
  return null;
}

export async function parseGuitarPro(bytes) {
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic.startsWith('FICH') || (bytes[0] === 0x46 && bytes[1] === 0x49)) {
    throw new Error('Форматы Guitar Pro 3/4/5 (.gp3/.gp4/.gp5) не поддерживаются. Экспортируйте трек в .gp/.gpx или MIDI.');
  }
  if (!isZip(bytes)) throw new Error('Неизвестный контейнер Guitar Pro (ожидался .gp/.gpx — ZIP с score.gpif)');

  const entries = await readZip(bytes);
  const entry = findEntry(entries, n => /score\.gpif$/i.test(n)) || findEntry(entries, n => /\.gpif$/i.test(n));
  if (!entry) throw new Error('Внутри файла не найден score.gpif');

  const xml = new TextDecoder('utf-8').decode(entry.data);
  return parseGpifXml(xml);
}

export function parseGpifXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const perr = doc.getElementsByTagName('parsererror');
  if (perr.length) throw new Error('Ошибка разбора score.gpif (XML)');
  const root = doc.documentElement;
  if (!root || root.localName !== 'GPIF') throw new Error('Корневой узел не GPIF');

  const scoreEl = childOf(root, 'Score');
  const masterTrackEl = childOf(root, 'MasterTrack');
  const tracksEl = childOf(root, 'Tracks');
  const masterBarsEl = childOf(root, 'MasterBars');
  const barsEl = childOf(root, 'Bars');
  const voicesEl = childOf(root, 'Voices');
  const beatsEl = childOf(root, 'Beats');
  const notesEl = childOf(root, 'Notes');
  const rhythmsEl = childOf(root, 'Rhythms');

  // --- Ритмы ---
  const rhythmById = new Map();
  for (const r of childrenOf(rhythmsEl, 'Rhythm')) {
    const dotEl = childOf(r, 'AugmentationDot');
    const tup = childOf(r, 'PrimaryTuplet');
    rhythmById.set(r.getAttribute('id'), {
      value: textOf(r, 'NoteValue') || 'Quarter',
      dots: dotEl ? toInt(dotEl.getAttribute('count'), 0) : 0,
      num: tup ? toInt(tup.getAttribute('num'), -1) : -1,
      den: tup ? toInt(tup.getAttribute('den'), -1) : -1,
    });
  }

  // --- Ноты ---
  const noteById = new Map();
  for (const n of childrenOf(notesEl, 'Note')) {
    const props = childOf(n, 'Properties');
    const pString = findProperty(props, 'String');
    const pFret = findProperty(props, 'Fret');
    const pMuted = findProperty(props, 'Muted');
    noteById.set(n.getAttribute('id'), {
      string: toInt(pString ? textOf(pString, 'String') : '0', 0) + 1,
      fret: toInt(pFret ? textOf(pFret, 'Fret') : '0', 0),
      dead: !!(pMuted && childOf(pMuted, 'Enable')),
    });
  }

  // --- Биты ---
  const beatById = new Map();
  for (const b of childrenOf(beatsEl, 'Beat')) {
    const rhythmEl = childOf(b, 'Rhythm');
    beatById.set(b.getAttribute('id'), {
      notes: splitNums(textOf(b, 'Notes')),
      rhythm: rhythmEl ? rhythmEl.getAttribute('ref') : null,
    });
  }

  // --- Голоса ---
  const voiceById = new Map();
  for (const v of childrenOf(voicesEl, 'Voice')) {
    voiceById.set(v.getAttribute('id'), splitNums(textOf(v, 'Beats')));
  }

  // --- Такты ---
  const barById = new Map();
  for (const bar of childrenOf(barsEl, 'Bar')) {
    barById.set(bar.getAttribute('id'), splitNums(textOf(bar, 'Voices')));
  }

  // --- Мастер-такты (размеры) ---
  const masterBars = [];
  for (const mb of childrenOf(masterBarsEl, 'MasterBar')) {
    const time = textOf(mb, 'Time') || '4/4';
    const parts = time.split('/');
    masterBars.push({
      num: toInt(parts[0], 4),
      den: toInt(parts[1], 4),
      bars: splitNums(textOf(mb, 'Bars')),
    });
  }

  // --- Дорожки ---
  const tracks = [];
  const trackEls = childrenOf(tracksEl, 'Track');
  trackEls.forEach((tr, index) => {
    let percussion = false;
    const instSet = childOf(tr, 'InstrumentSet');
    if (instSet && (textOf(instSet, 'Type') || '').toLowerCase() === 'drumkit') percussion = true;
    const gm = childOf(tr, 'GeneralMidi');
    if (gm && gm.getAttribute('table') === 'Percussion') percussion = true;

    const tuningProp = findProperty(tr, 'Tuning');
    let tuning = null;
    if (tuningProp) {
      const pit = tuningProp.getElementsByTagNameNS('*', 'Pitches')[0];
      if (pit) {
        const vals = splitNums(pit.textContent).map(s => toInt(s, 0));
        if (vals.length) tuning = vals; // low -> high
      }
    }
    if (!tuning) tuning = TUNING_PRESETS.standard.pitches.slice();

    const capoProp = findProperty(tr, 'CapoFret');
    const capo = capoProp ? toInt(textOf(capoProp, 'Fret'), 0) : 0;

    tracks.push({
      index,
      id: tr.getAttribute('id'),
      name: textOf(tr, 'Name') || `Дорожка ${index + 1}`,
      percussion,
      tuning,
      capo,
    });
  });

  // --- Длины и начала тактов ---
  const barContentLen = (barId) => {
    const voiceIds = barById.get(barId);
    if (!voiceIds) return 0;
    let maxLen = 0;
    for (const vid of voiceIds) {
      if (vid === '-1') continue;
      const beatIds = voiceById.get(vid);
      if (!beatIds) continue;
      let len = 0;
      for (const bid of beatIds) {
        if (bid === '-1') continue;
        const beat = beatById.get(bid);
        len += beatQuarters(beat ? rhythmById.get(beat.rhythm) : null);
      }
      maxLen = Math.max(maxLen, len);
    }
    return maxLen;
  };

  const barStarts = [];
  const timeSignatures = [];
  let q = 0;
  for (const mb of masterBars) {
    barStarts.push(q);
    timeSignatures.push({ q, num: mb.num, den: mb.den });
    let content = 0;
    for (const barId of mb.bars) {
      if (barId !== '-1') content = Math.max(content, barContentLen(barId));
    }
    q += content > 0 ? content : mb.num * (4 / mb.den);
  }

  // --- Темп ---
  const tempoEvents = [];
  const autoRoot = masterTrackEl ? childOf(masterTrackEl, 'Automations') : null;
  for (const a of autoRoot ? autoRoot.getElementsByTagNameNS('*', 'Automation') : []) {
    if (textOf(a, 'Type') !== 'Tempo') continue;
    const barIdx = toInt(textOf(a, 'Bar'), 0);
    const pos = toFloat(textOf(a, 'Position'), 0);
    const val = splitNums(textOf(a, 'Value'))[0];
    const bpm = toFloat(val, 0);
    if (bpm <= 0) continue;
    const startQ = barStarts[barIdx] != null ? barStarts[barIdx] : 0;
    const mb = masterBars[barIdx];
    const barLen = mb ? mb.num * (4 / mb.den) : 4;
    tempoEvents.push({ q: startQ + pos * barLen, bpm });
  }
  const tempoMap = new TempoMap(tempoEvents, 120);

  const rawTracks = tracks.map((track, index) => {
    const notes = [];
    if (!track.percussion) {
      for (let mi = 0; mi < masterBars.length; mi++) {
        const barIds = masterBars[mi].bars;
        const barId = barIds[index];
        if (!barId || barId === '-1') continue;
        const voiceIds = barById.get(barId) || [];
        const barStart = barStarts[mi];
        for (const vid of voiceIds) {
          if (vid === '-1') continue;
          const beatIds = voiceById.get(vid) || [];
          let vq = barStart;
          for (const bid of beatIds) {
            if (bid === '-1') continue;
            const beat = beatById.get(bid);
            if (!beat) continue;
            const qDur = beatQuarters(rhythmById.get(beat.rhythm));
            if (beat.notes.length) {
              const noteTime = tempoMap.quarterToSeconds(vq);
              const endTime = tempoMap.quarterToSeconds(vq + qDur);
              for (const nid of beat.notes) {
                if (nid === '-1') continue;
                const nn = noteById.get(nid);
                if (!nn) continue;
                const open = track.tuning[nn.string - 1];
                if (open == null) continue;
                notes.push({
                  t: noteTime,
                  dur: Math.max(0.05, endTime - noteTime),
                  string: nn.string,
                  fret: nn.fret,
                  midi: open + track.capo + nn.fret,
                  dead: nn.dead,
                });
              }
            }
            vq += qDur;
          }
        }
      }
      notes.sort((a, b) => a.t - b.t);
    }
    return { name: track.name, percussion: track.percussion, tuning: track.tuning, capo: track.capo, notes };
  });

  if (!rawTracks.some(t => !t.percussion && t.notes.length)) {
    throw new Error('В файле не найдено нот для гитары');
  }

  return {
    title: scoreEl ? (textOf(scoreEl, 'Title') || 'Без названия') : 'Без названия',
    artist: scoreEl ? (textOf(scoreEl, 'Artist') || '') : '',
    source: 'gp',
    tempoMap,
    timeSignatures,
    tracks: rawTracks,
  };
}
