// Встроенные демо-упражнения (нативный формат). Без авторских прав.

function chromatic() {
  const notes = [];
  let beat = 0;
  for (let s = 1; s <= 6; s++) {
    for (const fret of [0, 1, 2, 3]) notes.push({ beat: beat++, string: s, fret, dur: 0.9 });
  }
  for (let s = 6; s >= 1; s--) {
    for (const fret of [3, 2, 1, 0]) notes.push({ beat: beat++, string: s, fret, dur: 0.9 });
  }
  return { title: 'Разминка: хроматика', artist: 'Упражнение', bpm: 90, notes };
}

function pentatonic() {
  const up = [
    [1, 5], [1, 8], [2, 5], [2, 7], [3, 5], [3, 7],
    [4, 5], [4, 7], [5, 5], [5, 8], [6, 5], [6, 8],
  ];
  const notes = [];
  let beat = 0;
  for (let pass = 0; pass < 2; pass++) {
    const seq = pass === 0 ? up : up.slice().reverse();
    for (const [string, fret] of seq) notes.push({ beat: beat++, string, fret, dur: 0.6 });
  }
  return { title: 'Лады: A-минор пентатоника', artist: 'Упражнение', bpm: 100, notes };
}

function rockRiff() {
  const notes = [];
  let beat = 0;
  const riff = [0, 0, 3, 0, 5, 3, 0, 0, 0, 3, 5, 6, 5, 3, 0, 0];
  for (const fret of riff) {
    notes.push({ beat, string: 1, fret, dur: 0.45 });
    beat += 0.5;
  }
  beat = Math.ceil(beat / 4) * 4;
  const chords = [[3, 5], [5, 7], [6, 8], [5, 7], [3, 5], [0, 2]];
  for (const [root, fifth] of chords) {
    notes.push({ beat, string: 1, fret: root, dur: 0.95 });
    notes.push({ beat, string: 2, fret: fifth, dur: 0.95 });
    beat += 1;
  }
  return { title: 'Рифф: квинт-аккорды', artist: 'Упражнение', bpm: 110, notes };
}

export const DEMO_SONGS = [chromatic(), pentatonic(), rockRiff()];
