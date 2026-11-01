import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSong, pitchFor } from '../src/engine/theory.js';
import { Game } from '../src/engine/game.js';

const note = (t, midi = 40) => ({ t, dur: 0.3, midi, string: 1, fret: 0 });
const heard = { midi: 40, clarity: 1 };

test('unplayable MIDI pitches do not become misleading fret positions', () => {
  const song = buildSong({ tracks: [{ notes: [note(0, 40), { t: 1, dur: 1, midi: 28 }] }] });
  assert.equal(song.notes.length, 1);
  assert.equal(song.unplayableNotes.length, 1);
  assert.equal(song.unplayableNotes[0].midi, 28);
  assert.equal(song.duration, 2);
  for (const n of song.notes) assert.equal(pitchFor(song.tuning, n.string, n.fret, song.capo), n.midi);
});

test('rewinding removes old results before a new attempt', () => {
  const game = new Game({ notes: [note(0)], duration: 1 });
  game.update(0, heard);
  assert.equal(game.hits, 1);
  game.rewind(0);
  assert.equal(game.hits, 0);
  game.update(0, heard);
  assert.equal(game.hits, 1);
  assert.equal(game.score, 100);
});

test('a repeated section replaces misses and preserves outside results', () => {
  const game = new Game({ notes: [note(0), note(1), note(2)], duration: 3 });
  game.update(0, heard); game.update(1.25, null); game.update(2, heard);
  assert.deepEqual([game.hits, game.misses], [2, 1]);
  game.rewind(1, 2);
  assert.deepEqual([game.hits, game.misses], [2, 0]);
  game.update(1, heard);
  assert.deepEqual([game.hits, game.misses], [3, 0]);
  assert.deepEqual(game.missByString, {});
});

test('forward seek does not count skipped notes as missed', () => {
  const game = new Game({ notes: [note(0), note(1), note(2)], duration: 3 });
  game.rewind(2);
  game.update(2, heard);
  assert.deepEqual([game.hits, game.misses], [1, 0]);
});

 test('combo and score reflect the current sequence, including after rewind', () => {
  const game = new Game({ notes: [note(0), note(1), note(2)], duration: 3 });
  game.update(0, heard);
  assert.equal(game.combo, 1);
  game.update(1, heard);
  assert.equal(game.combo, 2);
  game.rewind(1);
  assert.equal(game.combo, 0);
  game.update(1, heard);
  assert.equal(game.combo, 2);
  assert.equal(game.score, 200);
});
