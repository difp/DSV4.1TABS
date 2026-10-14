// Встроенные упражнения (нативный формат) + структура категорий.
// Стабильный id нужен для мультиязычных названий и статистики профиля.
// Сложность вычисляется автоматически: плотность нот, средний/максимальный лад, аккорды.
//
// Часть упражнений составлена по «Новому самоучителю игры на гитаре» (О. Сладкова):
// разминка и хроматика → укрепление и координация пальцев → аккорды (Em, Am, A, E, Dm, D, G, C, B7)
// → чередования аккордов → последовательности → арпеджио (перебор) → песни.
const N = (beat, string, fret, dur) => ({ beat, string, fret, dur });

// --- Уровень 1 ---
function openStrings() {
  const notes = [];
  let beat = 0;
  for (const s of [1, 2, 3, 4, 5, 6]) { notes.push(N(beat, s, 0, 0.9)); beat += 1; }
  for (const s of [6, 5, 4, 3, 2, 1]) { notes.push(N(beat, s, 0, 0.9)); beat += 1; }
  return { id: 'open-strings', title: 'Открытые струны', artist: 'Упражнение', bpm: 70, notes };
}

function firstFret() {
  const notes = [];
  let beat = 0;
  for (const s of [1, 2, 3, 4, 5, 6]) {
    notes.push(N(beat, s, 0, 0.9)); beat += 1;
    notes.push(N(beat, s, 1, 0.9)); beat += 1;
  }
  return { id: 'first-fret', title: 'Первый лад', artist: 'Упражнение', bpm: 80, notes };
}

// --- Уровень 2 ---
function fiveInARow() {
  const notes = [];
  let beat = 0;
  for (const s of [1, 2, 3]) for (const f of [0, 1, 2, 3, 4]) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { id: 'five-in-a-row', title: 'Пять нот подряд', artist: 'Упражнение', bpm: 90, notes };
}

function scaleOneString() {
  const notes = [];
  let beat = 0;
  for (const f of [3, 5, 7, 8, 10, 12, 10, 8, 7, 5, 3]) { notes.push(N(beat, 2, f, 0.9)); beat += 1; }
  return { id: 'scale-one-string', title: 'Гамма на одной струне', artist: 'Упражнение', bpm: 90, notes };
}

function chromatic() {
  const notes = [];
  let beat = 0;
  for (let s = 1; s <= 6; s++) for (const f of [0, 1, 2, 3]) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  for (let s = 6; s >= 1; s--) for (const f of [3, 2, 1, 0]) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { id: 'chromatic-warmup', title: 'Разминка: хроматика', artist: 'Упражнение', bpm: 90, notes };
}

// --- Уровень 3 ---
function pentatonic() {
  const up = [[1, 5], [1, 8], [2, 5], [2, 7], [3, 5], [3, 7], [4, 5], [4, 7], [5, 5], [5, 8], [6, 5], [6, 8]];
  const notes = [];
  let beat = 0;
  for (const [s, f] of up) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  for (const [s, f] of up.slice().reverse()) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { id: 'a-minor-pentatonic', title: 'Лады: A-минор пентатоника', artist: 'Упражнение', bpm: 100, notes };
}

function majorScale() {
  const up = [[2, 3], [2, 5], [3, 2], [3, 3], [3, 5], [4, 2], [4, 4], [4, 5], [5, 3], [5, 5], [6, 2], [6, 3], [6, 5], [6, 7], [6, 8]];
  const notes = [];
  let beat = 0;
  for (const [s, f] of up) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  for (const [s, f] of up.slice().reverse()) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { id: 'c-major-scale', title: 'Мажорная гамма C', artist: 'Упражнение', bpm: 100, notes };
}

function spider() {
  const notes = [];
  let beat = 0;
  for (const s of [1, 2, 3, 4]) for (const f of [0, 2, 1, 3]) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { id: 'spider-1-3-2-4', title: 'Спуск и подъём 1-3-2-4', artist: 'Упражнение', bpm: 100, notes };
}

// --- Уровень 4 ---
function handsSync() {
  const notes = [];
  let beat = 0;
  for (const s of [1, 2]) for (const f of [0, 1, 2, 3, 4, 5]) { notes.push(N(beat, s, f, 0.22)); beat += 0.25; }
  for (const s of [3, 4]) for (const f of [0, 1, 2, 3, 4, 5]) { notes.push(N(beat, s, f, 0.22)); beat += 0.25; }
  return { id: 'hands-sync', title: 'Синхронизация рук', artist: 'Упражнение', bpm: 110, notes };
}

function fifths() {
  const notes = [];
  let beat = 0;
  for (const r of [0, 2, 3, 5, 7, 5, 3, 2]) {
    notes.push(N(beat, 1, r, 0.9));
    notes.push(N(beat, 2, r + 2, 0.9));
    beat += 1;
  }
  return { id: 'fifths-up', title: 'Квинты вверх', artist: 'Упражнение', bpm: 100, notes };
}

function fingerstyle() {
  const seq = [[1, 0], [3, 2], [4, 2], [5, 1], [4, 2], [3, 2]];
  const notes = [];
  let beat = 0;
  for (let i = 0; i < 4; i++) for (const [s, f] of seq) { notes.push(N(beat, s, f, 0.45)); beat += 0.5; }
  return { id: 'fingerstyle-am', title: 'Перебор Am', artist: 'Упражнение', bpm: 90, notes };
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
  return { id: 'rock-power-riff', title: 'Рифф: квинт-аккорды', artist: 'Упражнение', bpm: 110, notes };
}

// --- Уровень 5 ---
function pentatonic16() {
  const up = [[1, 5], [1, 8], [2, 5], [2, 7], [3, 5], [3, 7], [4, 5], [4, 7], [5, 5], [5, 8], [6, 5], [6, 8]];
  const notes = [];
  let beat = 0;
  for (const [s, f] of up) { notes.push(N(beat, s, f, 0.22)); beat += 0.25; }
  for (const [s, f] of up.slice().reverse()) { notes.push(N(beat, s, f, 0.22)); beat += 0.25; }
  return { id: 'pentatonic-16ths', title: 'Пентатоника 16-ми', artist: 'Упражнение', bpm: 140, notes };
}

// --- Известные простые произведения (общественное достояние) и паттерны «в стиле» ---
function odeToJoy() {
  const q = [[5, 0], [5, 0], [5, 1], [5, 3], [5, 3], [5, 1], [5, 0], [4, 2], [4, 0], [4, 0], [4, 2], [5, 0], [5, 0], [4, 2], [4, 2]];
  const notes = [];
  q.forEach(([s, f], i) => notes.push(N(i, s, f, i === q.length - 1 ? 2 : 0.95)));
  return { id: 'ode-to-joy', title: 'Ode to Joy', artist: 'Бетховен · PD', bpm: 100, timeSignature: [4, 4], notes };
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
  return { id: 'greensleeves', title: 'Greensleeves', artist: 'Народная · PD', bpm: 110, timeSignature: [3, 4], notes };
}

function spanishRomance() {
  const notes = [];
  let b = 0;
  const em = [[1, 0], [5, 0], [6, 0], [4, 0], [6, 0], [5, 0]];
  const b7 = [[2, 2], [5, 0], [6, 2], [4, 2], [6, 2], [5, 0]];
  for (const bar of [em, em, b7, b7, em, em, b7, b7]) {
    for (const [s, f] of bar) { notes.push(N(b, s, f, 0.45)); b += 0.5; }
  }
  return { id: 'spanish-romance', title: 'Испанский романс (перебор Em)', artist: 'Классика · PD', bpm: 96, timeSignature: [3, 4], notes };
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
  return { id: 'house-of-rising-sun', title: 'Дом восходящего солнца (перебор)', artist: 'Народная · PD', bpm: 100, timeSignature: [3, 4], notes };
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
  return { id: 'la-bamba', title: 'La Bamba', artist: 'Народная · PD', bpm: 120, timeSignature: [4, 4], notes };
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
  return { id: 'spanish-strum-cfgam', title: 'Испанский бой C–F–G–Am', artist: 'Народная · PD', bpm: 110, timeSignature: [4, 4], notes };
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
  return { id: 'blues-shuffle-12', title: 'Блюзовый шаффл (12 тактов)', artist: 'Блюз · оригинал', bpm: 100, timeSignature: [4, 4], notes };
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
  return { id: 'rock-n-roll-fifths', title: 'Рок-н-ролл на квинтах', artist: 'Рок · оригинал', bpm: 140, timeSignature: [4, 4], notes };
}

// ---------------------------------------------------------------------------
// Аккорды по самоучителю (О. Сладкова): отрабатываем аккорды, переходы,
// последовательности и перебор. Струна 1 = самая низкая (толстая).
// ---------------------------------------------------------------------------
const SHAPES = {
  Em: [0, 2, 2, 0, 0, 0], A: [null, 0, 2, 2, 2, 0], Am: [null, 0, 2, 2, 1, 0],
  E: [0, 2, 2, 1, 0, 0], Dm: [null, null, 0, 2, 3, 1], D: [null, null, 0, 2, 3, 2],
  G: [3, 2, 0, 0, 0, 3], C: [null, 3, 2, 0, 1, 0], B7: [null, 2, 1, 2, 0, 2],
};
function fingersForShape(frets) {
  const uniq = [...new Set(frets.filter((f) => f != null && f > 0))].sort((a, b) => a - b);
  const map = new Map(); uniq.forEach((f, i) => map.set(f, Math.min(4, i + 1)));
  return frets.map((f) => (f == null || f === 0 ? 0 : map.get(f)));
}
function strumChord(notes, name, beat, strums) {
  const shape = SHAPES[name]; if (!shape) return beat;
  const fingers = fingersForShape(shape);
  for (let k = 0; k < strums; k++) {
    for (let i = 0; i < 6; i++) { const fr = shape[i]; if (fr == null) continue; notes.push(N(beat, i + 1, fr, 0.9)); }
    beat += 1;
  }
  return beat;
}
function arpChord(notes, name, beat, beats) {
  const shape = SHAPES[name]; if (!shape) return beat + beats;
  const fingers = fingersForShape(shape);
  const strs = [];
  for (let i = 0; i < 6; i++) if (shape[i] != null) strs.push(i + 1);
  const step = 0.5;
  let k = 0;
  for (let t = 0; t < beats - 1e-9; t += step) {
    const s = strs[k % strs.length];
    notes.push(N(beat + t, s, shape[s - 1], 0.5));
    k++;
  }
  return beat + beats;
}
function strumExercise(id, title, bpm, chords, cycles, strums = 4) {
  const notes = []; let beat = 0;
  for (let c = 0; c < cycles; c++) for (const name of chords) beat = strumChord(notes, name, beat, strums);
  return { id, title, artist: 'По самоучителю', bpm, timeSignature: [4, 4], notes };
}
function arpExercise(id, title, bpm, chords, cycles, beats = 4) {
  const notes = []; let beat = 0;
  for (let c = 0; c < cycles; c++) for (const name of chords) beat = arpChord(notes, name, beat, beats);
  return { id, title, artist: 'По самоучителю', bpm, timeSignature: [4, 4], notes };
}

// Отработка одного аккорда (Em — самый лёгкий), затем чередования пар аккордов.
const bookEm = () => strumExercise('book-em', 'Аккорд Em', 70, ['Em'], 4);
const bookEmAm = () => strumExercise('book-em-am', 'Em ⇄ Am', 70, ['Em', 'Am'], 3);
const bookAmA = () => strumExercise('book-am-a', 'Am ⇄ A', 70, ['Am', 'A'], 3);
const bookEmE = () => strumExercise('book-em-e', 'Em ⇄ E', 70, ['Em', 'E'], 3);
const bookDmD = () => strumExercise('book-dm-d', 'Dm ⇄ D', 70, ['Dm', 'D'], 3);
const bookGC = () => strumExercise('book-g-c', 'G ⇄ C', 70, ['G', 'C'], 3);
const bookB7Em = () => strumExercise('book-b7-em', 'B7 ⇄ Em', 70, ['B7', 'Em'], 3);

// Последовательности (по 4 удара на аккорд, играть по кругу медленно).
const bookProgAmDmE = () => strumExercise('book-prog-am-dm-e', 'Am – Dm – E – Am', 80, ['Am', 'Dm', 'E', 'Am'], 2);
const bookProgCGDA = () => strumExercise('book-prog-c-g-dm-am', 'C – G – Dm – Am', 80, ['C', 'G', 'Dm', 'Am'], 2);
const bookProgEmAmDG = () => strumExercise('book-prog-em-am-d-g', 'Em – Am – D – G', 80, ['Em', 'Am', 'D', 'G'], 2);

// Арпеджио / перебор.
const bookArpAmDmE = () => arpExercise('book-arp-am-dm-e', 'Перебор Am – Dm – Am – E', 76, ['Am', 'Dm', 'Am', 'E'], 2);
const bookArpGC = () => arpExercise('book-arp-g-c', 'Перебор G – C – G – C', 76, ['G', 'C', 'G', 'C'], 2);

// ---------------------------------------------------------------------------
// Простые народные пьесы (public domain) — удобны для первых исполнений.
// Ноты задаются через midi: аппликатура подбирается автоматически.
// ---------------------------------------------------------------------------
const M = (beat, midi, dur) => ({ beat, midi, dur });

function twinkleTwinkle() {
  const notes = [
    M(0, 60, 1), M(1, 60, 1), M(2, 67, 1), M(3, 67, 1), M(4, 69, 1), M(5, 69, 1), M(6, 67, 2),
    M(8, 65, 1), M(9, 65, 1), M(10, 64, 1), M(11, 64, 1), M(12, 62, 1), M(13, 62, 1), M(14, 60, 2),
  ];
  return { id: 'twinkle-twinkle', title: 'Twinkle, Twinkle', artist: 'Народная · PD', bpm: 100, timeSignature: [4, 4], notes };
}
function maryLamb() {
  const notes = [
    M(0, 64, 1), M(1, 62, 1), M(2, 60, 1), M(3, 62, 1), M(4, 64, 1), M(5, 64, 1), M(6, 64, 2),
    M(8, 62, 1), M(9, 62, 1), M(10, 62, 2),
    M(12, 64, 1), M(13, 67, 1), M(14, 67, 2),
    M(16, 64, 1), M(17, 62, 1), M(18, 60, 1), M(19, 62, 1), M(20, 64, 1), M(21, 64, 1), M(22, 64, 1), M(23, 64, 1),
    M(24, 62, 1), M(25, 62, 1), M(26, 64, 1), M(27, 62, 1), M(28, 60, 4),
  ];
  return { id: 'mary-lamb', title: 'Mary Had a Little Lamb', artist: 'Народная · PD', bpm: 100, timeSignature: [4, 4], notes };
}
function frereJacques() {
  const notes = [
    M(0, 60, 1), M(1, 62, 1), M(2, 64, 1), M(3, 60, 1),
    M(4, 60, 1), M(5, 62, 1), M(6, 64, 1), M(7, 60, 1),
    M(8, 64, 1), M(9, 65, 1), M(10, 67, 2),
    M(12, 64, 1), M(13, 65, 1), M(14, 67, 2),
    M(16, 67, 0.5), M(17, 69, 0.5), M(18, 67, 0.5), M(19, 65, 0.5), M(20, 64, 1), M(21, 60, 1),
    M(22, 67, 0.5), M(23, 69, 0.5), M(24, 67, 0.5), M(25, 65, 0.5), M(26, 64, 1), M(27, 60, 1),
    M(28, 60, 1), M(29, 55, 1), M(30, 60, 2),
    M(32, 60, 1), M(33, 55, 1), M(34, 60, 2),
  ];
  return { id: 'frere-jacques', title: 'Frère Jacques', artist: 'Народная · PD', bpm: 96, timeSignature: [4, 4], notes };
}
function jingleBells() {
  const notes = [
    M(0, 64, 1), M(1, 64, 1), M(2, 64, 2),
    M(4, 64, 1), M(5, 64, 1), M(6, 64, 2),
    M(8, 64, 1), M(9, 67, 1), M(10, 60, 1), M(11, 62, 1), M(12, 64, 4),
    M(16, 65, 1), M(17, 65, 1), M(18, 65, 1), M(19, 65, 1), M(20, 65, 1),
    M(21, 64, 1), M(22, 64, 1), M(23, 64, 1), M(24, 64, 1),
    M(25, 62, 1), M(26, 62, 1), M(27, 64, 1), M(28, 62, 1), M(29, 67, 4),
  ];
  return { id: 'jingle-bells', title: 'Jingle Bells', artist: 'Народная · PD', bpm: 120, timeSignature: [4, 4], notes };
}
function whenTheSaints() {
  const notes = [
    M(0, 60, 1), M(1, 64, 1), M(2, 65, 1), M(3, 67, 2),
    M(5, 60, 1), M(6, 64, 1), M(7, 65, 1), M(8, 67, 2),
    M(10, 60, 1), M(11, 64, 1), M(12, 65, 1), M(13, 67, 1), M(14, 64, 1), M(15, 60, 1), M(16, 64, 1), M(17, 62, 3),
    M(20, 64, 1), M(21, 64, 1), M(22, 62, 1), M(23, 60, 1), M(24, 64, 1), M(25, 67, 1), M(26, 67, 1), M(27, 65, 3),
  ];
  return { id: 'when-the-saints', title: 'When the Saints Go Marching In', artist: 'Народная · PD', bpm: 120, timeSignature: [4, 4], notes };
}

const RAW = [
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
  // Аккорды по самоучителю
  bookEm(),
  bookEmAm(),
  bookAmA(),
  bookEmE(),
  bookDmD(),
  bookGC(),
  bookB7Em(),
  bookProgAmDmE(),
  bookProgCGDA(),
  bookProgEmAmDG(),
  bookArpAmDmE(),
  bookArpGC(),
  // Простые народные пьесы
  twinkleTwinkle(),
  maryLamb(),
  frereJacques(),
  jingleBells(),
  whenTheSaints(),
];

// Методические советы (из самоучителя). Показываются под названием занятия.
const TIPS = {
  'open-strings': 'Разминка: играйте открытые струны ровно и чисто, под метроном ~70.',
  'first-fret': 'Чередуйте открытую струну и 1-й лад одним пальцем — готовим левую руку.',
  'five-in-a-row': 'Пять нот подряд на трёх струнах: ровный перебор, слушайте метроном.',
  'scale-one-string': 'Гамма на одной струне развивает координацию и растяжку пальцев.',
  'chromatic-warmup': 'Хроматика 0-1-2-3 по всем струнам вверх и вниз. Начните с 70–80 и постепенно ускоряйтесь.',
  'a-minor-pentatonic': 'Пентатоника ля-минор в 1-й позиции — играйте и вверх, и вниз.',
  'c-major-scale': 'Мажорная гамма C — базовый звукоряд; следите за аппликатурой левой руки.',
  'spider-1-3-2-4': '«Паук» 1-3-2-4 тренирует независимость пальцев левой руки.',
  'hands-sync': 'Синхронизация рук: короткие ноты, играйте медленно и ровно.',
  'pentatonic-16ths': 'Пентатоника шестнадцатыми — на скорость. Начните с 90 и прибавляйте.',
  'fifths-up': 'Квинты — основа рок-аккомпанемента; глушите лишние струны.',
  'fingerstyle-am': 'Перебор Am: большой палец ведёт бас, остальные — по струнам.',
  'rock-power-riff': 'Рифф на квинтах: играйте с ощущением восьмых, акцентируйте сильные доли.',
  'ode-to-joy': 'Простая мелодия: следите за длительностями и чистой сменой нот.',
  'greensleeves': 'Трёхдольный размер: ведите мелодию плавно, без пауз.',
  'spanish-romance': 'Классический перебор: бас + поочерёдно остальные пальцы.',
  'house-of-rising-sun': 'Перебор в 3/4: бас на сильную долю, арпеджио ровно.',
  'la-bamba': 'Простой ритм с быстрыми нотами — начинайте медленно.',
  'spanish-strum-cfgam': 'Бой C–F–G–Am: отрабатывайте смену аккордов без пауз.',
  'blues-shuffle-12': 'Блюзовый шаффл (12 тактов): триольный ритм, чувствуйте качание.',
  'rock-n-roll-fifths': 'Рок-н-ролл на квинтах: ровные восьмые, лёгкая кисть.',
  'book-em': 'Начните с Em — самого простого аккорда. Проведите по всем струнам: звук должен быть чистым и долгим.',
  'book-em-am': 'Чередование Em и Am: быстро переставляйте пальцы, без пауз.',
  'book-am-a': 'Am и A отличаются одной нотой — меняйте один палец.',
  'book-em-e': 'Em и E: средний и безымянный остаются на месте, работает указательный.',
  'book-dm-d': 'Dm и D: 6-я и 5-я струны не звучат; звукоизвлечение начинается с 4-й.',
  'book-g-c': 'G и C: задействованы четыре пальца — следите за чистотой перехода.',
  'book-b7-em': 'B7 и Em: тренируйте переходы по кругу без остановок.',
  'book-prog-am-dm-e': 'Главные аккорды ля-минора. Каждый аккорд — по 4 удара, затем по кругу.',
  'book-prog-c-g-dm-am': 'Последовательность C–G–Dm–Am: главное — равномерность переходов.',
  'book-prog-em-am-d-g': 'Em–Am–D–G: много переходов — сначала медленно, затем увереннее.',
  'book-arp-am-dm-e': 'Перебор последовательности: бас плюс остальные пальцы, ровно.',
  'book-arp-g-c': 'Перебор G–C: следите, чтобы звучали все струны.',
  'twinkle-twinkle': 'Простейшая мелодия для первой пробы: следите за длительностями.',
  'mary-lamb': 'Мелодия с повторами: играйте ровно, слушая метроном.',
  'frere-jacques': 'Короткая фраза повторяется — удобно для тренировки ритма.',
  'jingle-bells': 'Знакомая мелодия: следите за чередованием струн и чистотой звука.',
  'when-the-saints': 'Мелодия в C-мажоре — хорошая разминка для беглости.',
};

export const DEMO_SONGS = RAW.map((s) => { s.tip = TIPS[s.id] || ''; return s; });

// Категории по стабильным id (названия локализуются через i18n).
export const CATEGORIES = [
  { key: 'warmup', ids: ['open-strings', 'first-fret', 'five-in-a-row', 'scale-one-string', 'chromatic-warmup'] },
  { key: 'scales', ids: ['a-minor-pentatonic', 'c-major-scale', 'spider-1-3-2-4', 'hands-sync', 'pentatonic-16ths'] },
  { key: 'book', ids: ['book-em', 'book-em-am', 'book-am-a', 'book-em-e', 'book-dm-d', 'book-g-c', 'book-b7-em'] },
  { key: 'chords', ids: ['fifths-up', 'fingerstyle-am', 'rock-power-riff', 'spanish-strum-cfgam', 'book-prog-am-dm-e', 'book-prog-c-g-dm-am', 'book-prog-em-am-d-g', 'book-arp-am-dm-e', 'book-arp-g-c', 'blues-shuffle-12'] },
  { key: 'classics', ids: ['ode-to-joy', 'greensleeves', 'spanish-romance', 'house-of-rising-sun', 'la-bamba', 'rock-n-roll-fifths', 'twinkle-twinkle', 'mary-lamb', 'frere-jacques', 'jingle-bells', 'when-the-saints'] },
];
