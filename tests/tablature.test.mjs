import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTabColumns } from '../src/engine/tablature.js';
import { buildSong, pitchFor } from '../src/engine/theory.js';
import { parseNative } from '../src/parsers/native.js';
import { DEMO_SONGS, CATEGORIES, SHAPE_FINGERS } from '../src/songs/demos.js';

test('every built-in exercise produces a tablature event for each played note', () => {
  for (const raw of DEMO_SONGS) {
    const song = buildSong(parseNative(raw));
    const columns = buildTabColumns(song);
    assert.ok(columns.length, raw.id);
    const tabNotes = columns.flatMap(c => c.strings.flat()).length;
    assert.equal(tabNotes, song.notes.length, raw.id);
    assert.deepEqual(columns.map(c => c.time), [...new Set(song.notes.map(n => n.t))].sort((a,b)=>a-b), raw.id);
    for (const n of song.notes) assert.equal(pitchFor(song.tuning, n.string, n.fret, song.capo), n.midi, raw.id);
  }
});

test('tablature preserves simultaneous notes, repeated frets and close distinct onsets', () => {
  const song = { stringCount: 4, notes: [
    { t: 0, string: 1, fret: 0, dur: 1 }, { t: 0, string: 4, fret: 2, dur: 0.5 },
    { t: 0.02, string: 1, fret: 2, dur: 0.2 }, { t: 0.02, string: 1, fret: 3, dur: 0.3 },
  ] };
  const columns = buildTabColumns(song);
  assert.deepEqual(columns.map(c => c.time), [0, 0.02]);
  assert.deepEqual(columns[0].strings[0].map(n => n.fret), [0]);
  assert.deepEqual(columns[0].strings[3].map(n => [n.fret,n.dur]), [[2,0.5]]);
  assert.deepEqual(columns[1].strings[0].map(n => n.fret), [2,3]);
});

test('each chord introduction teaches its own strings, fingering and full shape', () => {
  const chords = ['Em','Am','A','E','Dm','D','G','C','B7'];
  const ids = CATEGORIES.find(c => c.key === 'intro').ids;
  assert.equal(ids.length, chords.length);
  for (const chord of chords) {
    const raw = DEMO_SONGS.find(s => s.id === 'intro-' + chord.toLowerCase());
    assert.ok(raw, chord);
    const starts = [...new Set(raw.notes.map(n=>n.beat))];
    const chordBeat = starts.find(t => raw.notes.filter(n=>n.beat===t).length>1);
    const strum = raw.notes.filter(n=>n.beat===chordBeat);
    const singles = raw.notes.filter(n=>n.beat<chordBeat);
    assert.equal(singles.length, strum.length, chord);
    assert.deepEqual(singles.map(n=>[n.string,n.fret,n.finger]), strum.map(n=>[n.string,n.fret,n.finger]), chord);
    for (const n of strum) assert.equal(n.finger,SHAPE_FINGERS[chord][n.string-1],chord);
    assert.equal(starts.filter(t=>raw.notes.filter(n=>n.beat===t).length>1).length,4,chord);
  }
});

test('chord introductions contain the named chord tones', () => {
  const expected = {Em:[4,7,11], Am:[0,4,9], A:[1,4,9], E:[4,8,11], Dm:[2,5,9], D:[2,6,9], G:[2,7,11], C:[0,4,7], B7:[3,6,9,11]};
  for (const [chord, pcs] of Object.entries(expected)) {
    const raw = DEMO_SONGS.find(s => s.id === 'intro-' + chord.toLowerCase());
    const song = buildSong(parseNative(raw));
    const times = [...new Set(song.notes.map(n => n.t))];
    const full = times.map(t=>song.notes.filter(n=>n.t===t)).find(group=>group.length>1);
    assert.deepEqual([...new Set(full.map(n=>n.midi%12))].sort((a,b)=>a-b),pcs,chord);
  }
});

test('fretboard positions retain all onsets, chords and distinct fingerings', async () => {
  const { buildFretboardPositions } = await import('../src/engine/tablature.js');
  const song = { stringCount: 4, notes: [
    {t: 0, string: 1, fret: 0, finger: 0},
    {t: 1, string: 1, fret: 2, finger: 1}, {t: 1, string: 2, fret: 2, finger: 2},
    {t: 2, string: 1, fret: 0, finger: 0},
    {t: 3, string: 1, fret: 2, finger: 2}, {t: 3, string: 2, fret: 2, finger: 3},
  ] };
  const positions = buildFretboardPositions(song);
  assert.equal(positions.length, 3);
  assert.deepEqual(positions[0].times, [0, 2]);
  assert.deepEqual(positions[1].notes.map(n => [n.string,n.fret,n.finger]), [[1,2,1],[2,2,2]]);
  assert.deepEqual(positions[2].notes.map(n => n.finger), [2,3]);
  for (const raw of DEMO_SONGS) {
    const built=buildSong(parseNative(raw));
    const all=buildFretboardPositions(built).flatMap(p=>p.times).sort((a,b)=>a-b);
    assert.deepEqual(all, [...new Set(built.notes.map(n=>n.t))].sort((a,b)=>a-b), raw.id);
  }
});

test('fretboard events preserve playback order and repeated positions', async () => {
  const { buildFretboardEvents } = await import('../src/engine/tablature.js');
  const song = { stringCount: 6, notes: [
    { t: 2, string: 2, fret: 2 }, { t: 0, string: 1, fret: 0 },
    { t: 1, string: 1, fret: 3 }, { t: 2, string: 1, fret: 0 },
    { t: 3, string: 1, fret: 0 },
  ] };
  const events = buildFretboardEvents(song);
  assert.deepEqual(events.map(e => e.time), [0, 1, 2, 3]);
  assert.deepEqual(events.map(e => e.notes.length), [1, 1, 2, 1]);
  assert.equal(events[0].notes[0].fret, events[3].notes[0].fret);
  for (const raw of DEMO_SONGS) {
    const built = buildSong(parseNative(raw));
    assert.deepEqual(buildFretboardEvents(built).map(e => e.time), [...new Set(built.notes.map(n => n.t))].sort((a, b) => a - b), raw.id);
  }
});
