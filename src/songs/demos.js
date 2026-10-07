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
];
