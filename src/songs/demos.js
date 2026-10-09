// Встроенные упражнения (нативный формат). Без авторских прав.
// Сложность вычисляется автоматически: плотность нот, средний/максимальный лад, аккорды.
const N = (beat, string, fret, dur) => ({ beat, string, fret, dur });

// --- Уровень 1 ---
function openStrings() {
  const notes = [];
  let beat = 0;
  for (const s of [1, 2, 3, 4, 5, 6]) { notes.push(N(beat, s, 0, 0.9)); beat += 1; }
  for (const s of [6, 5, 4, 3, 2, 1]) { notes.push(N(beat, s, 0, 0.9)); beat += 1; }
  return { title: 'Открытые струны', artist: 'Упражнение', bpm: 70, notes };
}

function firstFret() {
  const notes = [];
  let beat = 0;
  for (const s of [1, 2, 3, 4, 5, 6]) {
    notes.push(N(beat, s, 0, 0.9)); beat += 1;
    notes.push(N(beat, s, 1, 0.9)); beat += 1;
  }
  return { title: 'Первый лад', artist: 'Упражнение', bpm: 80, notes };
}

// --- Уровень 2 ---
function fiveInARow() {
  const notes = [];
  let beat = 0;
  for (const s of [1, 2, 3]) for (const f of [0, 1, 2, 3, 4]) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { title: 'Пять нот подряд', artist: 'Упражнение', bpm: 90, notes };
}

function scaleOneString() {
  const notes = [];
  let beat = 0;
  for (const f of [3, 5, 7, 8, 10, 12, 10, 8, 7, 5, 3]) { notes.push(N(beat, 2, f, 0.9)); beat += 1; }
  return { title: 'Гамма на одной струне', artist: 'Упражнение', bpm: 90, notes };
}

function chromatic() {
  const notes = [];
  let beat = 0;
  for (let s = 1; s <= 6; s++) for (const f of [0, 1, 2, 3]) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  for (let s = 6; s >= 1; s--) for (const f of [3, 2, 1, 0]) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { title: 'Разминка: хроматика', artist: 'Упражнение', bpm: 90, notes };
}

// --- Уровень 3 ---
function pentatonic() {
  const up = [[1, 5], [1, 8], [2, 5], [2, 7], [3, 5], [3, 7], [4, 5], [4, 7], [5, 5], [5, 8], [6, 5], [6, 8]];
  const notes = [];
  let beat = 0;
  for (const [s, f] of up) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  for (const [s, f] of up.slice().reverse()) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { title: 'Лады: A-минор пентатоника', artist: 'Упражнение', bpm: 100, notes };
}

function majorScale() {
  const up = [[2, 3], [2, 5], [3, 2], [3, 3], [3, 5], [4, 2], [4, 4], [4, 5], [5, 3], [5, 5], [6, 2], [6, 3], [6, 5], [6, 7], [6, 8]];
  const notes = [];
  let beat = 0;
  for (const [s, f] of up) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  for (const [s, f] of up.slice().reverse()) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { title: 'Мажорная гамма C', artist: 'Упражнение', bpm: 100, notes };
}

function spider() {
  const notes = [];
  let beat = 0;
  for (const s of [1, 2, 3, 4]) for (const f of [0, 2, 1, 3]) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { title: 'Спуск и подъём 1-3-2-4', artist: 'Упражнение', bpm: 100, notes };
}

// --- Уровень 4 ---
function handsSync() {
  const notes = [];
  let beat = 0;
  for (const s of [1, 2]) for (const f of [0, 1, 2, 3, 4, 5]) { notes.push(N(beat, s, f, 0.22)); beat += 0.25; }
  for (const s of [3, 4]) for (const f of [0, 1, 2, 3, 4, 5]) { notes.push(N(beat, s, f, 0.22)); beat += 0.25; }
  return { title: 'Синхронизация рук', artist: 'Упражнение', bpm: 110, notes };
}

function fifths() {
  const notes = [];
  let beat = 0;
  for (const r of [0, 2, 3, 5, 7, 5, 3, 2]) {
    notes.push(N(beat, 1, r, 0.9));
    notes.push(N(beat, 2, r + 2, 0.9));
    beat += 1;
  }
  return { title: 'Квинты вверх', artist: 'Упражнение', bpm: 100, notes };
}

function fingerstyle() {
  const seq = [[1, 0], [3, 2], [4, 2], [5, 1], [4, 2], [3, 2]];
  const notes = [];
  let beat = 0;
  for (let i = 0; i < 4; i++) for (const [s, f] of seq) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { title: 'Перебор Am', artist: 'Упражнение', bpm: 90, notes };
}

function rockRiff() {
  const notes = [];
  let beat = 0;
  for (const f of [0, 0, 3, 0, 5, 3, 0, 0, 0, 3, 5, 6, 5, 3, 0, 0]) { notes.push(N(beat, 1, f, 0.45)); beat += 0.5; }
  beat = Math.ceil(beat / 4) * 4;
  for (const [r, f2] of [[3, 5], [5, 7], [6, 8], [5, 7], [3, 5], [0, 2]]) {
    notes.push(N(beat, 1, r, 0.9));
    notes.push(N(beat, 2, f2, 0.9));
    beat += 1;
  }
  return { title: 'Рифф: квинт-аккорды', artist: 'Упражнение', bpm: 110, notes };
}

// --- Уровень 5 ---
function pentatonic16() {
  const up = [[1, 5], [1, 8], [2, 5], [2, 7], [3, 5], [3, 7], [4, 5], [4, 7], [5, 5], [5, 8], [6, 5], [6, 8]];
  const notes = [];
  let beat = 0;
  for (const [s, f] of up) { notes.push(N(beat, s, f, 0.22)); beat += 0.25; }
  for (const [s, f] of up.slice().reverse()) { notes.push(N(beat, s, f, 0.22)); beat += 0.25; }
  return { title: 'Пентатоника 16-ми', artist: 'Упражнение', bpm: 140, notes };
}

// --- Известные простые произведения (общественное достояние) и паттерны «в стиле» ---
// Мелодии классики/фольклора — public domain; рок/блюз — оригинальные паттерны.
function odeToJoy() {
  const q = [[5, 0], [5, 0], [5, 1], [5, 3], [5, 3], [5, 1], [5, 0], [4, 2], [4, 0], [4, 0], [4, 2], [5, 0], [5, 0], [4, 2], [4, 2]];
  const notes = [];
  q.forEach(([s, f], i) => notes.push(N(i, s, f, i === q.length - 1 ? 2 : 0.95)));
  return { title: 'Ode to Joy', artist: 'Бетховен · PD', bpm: 100, timeSignature: [4, 4], notes };
}

function greensleeves() {
  const seq = [
    [2, 0, 1.5], [2, 3, 0.5], [3, 0, 1],
    [3, 2, 1.5], [3, 3, 0.5], [3, 2, 1],
    [3, 0, 1.5], [2, 2, 0.5], [4, 0, 1],
    [2, 0, 1.5], [2, 2, 0.5], [2, 3, 1],
    [2, 2, 1.5], [2, 0, 0.5], [2, 0, 1],
    [2, 0, 3],
  ];
  const notes = [];
  let b = 0;
  for (const [s, f, d] of seq) { notes.push(N(b, s, f, Math.max(0.4, d * 0.9))); b += d; }
  return { title: 'Greensleeves', artist: 'Народная · PD', bpm: 110, timeSignature: [3, 4], notes };
}

function spanishRomance() {
  const notes = [];
  let b = 0;
  const em = [[1, 0], [5, 0], [6, 0], [4, 0], [6, 0], [5, 0]];
  const b7 = [[2, 2], [5, 0], [6, 2], [4, 2], [6, 2], [5, 0]];
  for (const bar of [em, em, b7, b7, em, em, b7, b7]) {
    for (const [s, f] of bar) { notes.push(N(b, s, f, 0.45)); b += 0.5; }
  }
  return { title: 'Испанский романс (перебор Em)', artist: 'Классика · PD', bpm: 96, timeSignature: [3, 4], notes };
}

function houseOfRisingSun() {
  const notes = [];
  let b = 0;
  const am = [[1, 0], [2, 0], [3, 2], [4, 2], [5, 1], [6, 0]];
  const c = [[2, 3], [3, 2], [4, 0], [5, 1], [6, 0], [4, 0]];
  const d = [[3, 0], [4, 2], [5, 3], [6, 2], [5, 3], [4, 2]];
  const f = [[3, 3], [4, 2], [5, 1], [6, 1], [5, 1], [4, 2]];
  const e = [[1, 0], [2, 2], [3, 2], [4, 1], [5, 0], [6, 0]];
  for (const bar of [am, c, d, f, am, e, am, e]) {
    for (const [s, fr] of bar) { notes.push(N(b, s, fr, 0.45)); b += 0.5; }
  }
  return { title: 'Дом восходящего солнца (перебор)', artist: 'Народная · PD', bpm: 100, timeSignature: [3, 4], notes };
}

function laBamba() {
  const c = [[2, 3], [3, 2], [4, 0], [5, 1], [6, 0], [5, 1], [4, 0], [3, 2]];
  const f = [[3, 3], [4, 2], [5, 1], [6, 1], [5, 1], [4, 2], [5, 1], [4, 2]];
  const g = [[1, 3], [2, 2], [3, 0], [4, 0], [5, 0], [6, 3], [5, 0], [4, 0]];
  const notes = [];
  let b = 0;
  for (const bar of [c, f, g, c, f, g]) {
    for (const [s, fr] of bar) { notes.push(N(b, s, fr, 0.45)); b += 0.5; }
  }
  return { title: 'La Bamba', artist: 'Народная · PD', bpm: 120, timeSignature: [4, 4], notes };
}

function spanishStrum() {
  const C = [[2, 3], [3, 2], [4, 0], [5, 1], [6, 0]];
  const F = [[3, 3], [4, 2], [5, 1], [6, 1]];
  const G = [[1, 3], [2, 2], [3, 0], [4, 0], [5, 0], [6, 3]];
  const Am = [[1, 0], [2, 0], [3, 2], [4, 2], [5, 1], [6, 0]];
  const notes = [];
  let b = 0;
  for (const ch of [C, F, G, Am, C, F, G, Am]) {
    for (let k = 0; k < 4; k++) {
      for (const [s, f] of ch) notes.push(N(b, s, f, 0.9));
      b += 1;
    }
  }
  return { title: 'Испанский бой C–F–G–Am', artist: 'Народная · PD', bpm: 110, timeSignature: [4, 4], notes };
}

function bluesShuffle() {
  const notes = [];
  let b = 0;
  const A5 = [2, 0, 3, 2];
  const D5 = [3, 0, 4, 2];
  const E5 = [1, 0, 2, 2];
  const bars = [A5, A5, A5, A5, D5, D5, A5, A5, E5, D5, A5, A5];
  for (const [rs, rf, fs, ff] of bars) {
    const pattern = [[rs, rf, 0.66], [fs, ff, 0.33], [rs, rf, 0.66], [fs, ff, 0.33]];
    for (const [s, f, d] of pattern) { notes.push(N(b, s, f, d * 0.95)); b += d; }
  }
  return { title: 'Блюзовый шаффл (12 тактов)', artist: 'Блюз · оригинал', bpm: 100, timeSignature: [4, 4], notes };
}

function rockRoll() {
  const A5 = [[2, 0], [3, 2]];
  const D5 = [[3, 0], [4, 2]];
  const E5 = [[1, 0], [2, 2]];
  const notes = [];
  let b = 0;
  for (const bar of [A5, A5, D5, D5, A5, A5, E5, E5]) {
    for (let k = 0; k < 8; k++) {
      const [s, f] = bar[k % 2];
      notes.push(N(b, s, f, 0.45));
      b += 0.5;
    }
  }
  return { title: 'Рок-н-ролл на квинтах', artist: 'Рок · оригинал', bpm: 140, timeSignature: [4, 4], notes };
}

export const DEMO_SONGS = [
  openStrings(),
  firstFret(),
  fiveInARow(),
  scaleOneString(),
  chromatic(),
  pentatonic(),
  majorScale(),
  spider(),
  handsSync(),
  fifths(),
  fingerstyle(),
  rockRiff(),
  pentatonic16(),
  odeToJoy(),
  greensleeves(),
  spanishRomance(),
  houseOfRisingSun(),
  laBamba(),
  spanishStrum(),
  bluesShuffle(),
  rockRoll(),
];
