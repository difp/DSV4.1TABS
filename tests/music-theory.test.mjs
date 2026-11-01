import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SONGS } from '../src/songs/demos.js';
import { parseNative } from '../src/parsers/native.js';
import { buildSong } from '../src/engine/theory.js';

const raw = id => DEMO_SONGS.find(song => song.id === id);
const pitches = id => buildSong(parseNative(raw(id))).notes.map(n => n.midi);

test('C major exercises use complete diatonic scale steps', () => {
  assert.deepEqual(pitches('scale-one-string').slice(0, 8), [48,50,52,53,55,57,59,60]);
  assert.deepEqual(pitches('c-major-scale').slice(0, 15), [48,50,52,53,55,57,59,60,62,64,65,67,69,71,72]);
});

test('Am arpeggios start on A and contain only A minor chord tones', () => {
  for (const id of ['fingerstyle-am','house-of-rising-sun']) {
    const notes = pitches(id).slice(0, 6);
    assert.equal(notes[0] % 12, 9, id);
    for (const n of notes) assert.ok([9,0,4].includes(n % 12), id);
  }
});

test('Em to B7 arpeggio includes all notes of B7', () => {
  const notes = pitches('spanish-romance').slice(12, 18).map(n => n % 12);
  assert.deepEqual([...new Set(notes)].sort((a,b)=>a-b), [3,6,9,11]);
});

test('twelve bar shuffle contains four quarter beats per bar', () => {
  const notes = raw('blues-shuffle-12').notes;
  assert.equal(notes.length, 96);
  for (let bar = 0; bar < 12; bar++) assert.ok(Math.abs(notes[bar*8].beat - bar*4) < 1e-8);
});

test('Frere Jacques eighth-note phrase uses consecutive eighths', () => {
  assert.deepEqual(raw('frere-jacques').notes.slice(14,20).map(n => n.beat), [16,16.5,17,17.5,18,19]);
});

test('spider exercise uses fretted fingers 1-3-2-4', () => {
  assert.deepEqual(raw('spider-1-3-2-4').notes.slice(0,4).map(n=>n.fret), [1,3,2,4]);
});

test('Am, A and Em chord examples use distinct valid fretting fingers', () => {
  for (const [id, expected] of [['book-em',[0,2,3,0,0,0]], ['book-am-a',[0,2,3,1,0]], ['book-am-a',[0,1,2,3,0]]]) {
    const song=raw(id);
    const beat = id === 'book-em' ? 0 : (expected[1] === 1 ? 4 : 0);
    assert.deepEqual(song.notes.filter(n=>n.beat===beat).map(n=>n.finger), expected);
  }
});

test('unspecified fingers for simultaneous fretted notes are not invented', () => {
  const song=buildSong(parseNative({bpm:120,notes:[{beat:0,string:2,fret:2},{beat:0,string:3,fret:2}]}));
  assert.deepEqual(song.notes.map(n=>n.finger),[-1,-1]);
});

test('Ode to Joy opening ends with dotted rhythm and a half note', () => {
  const ending=raw('ode-to-joy').notes.slice(12);
  assert.deepEqual(ending.map(n=>n.beat),[12,13.5,14]);
  assert.deepEqual(ending.map(n=>n.dur),[1.5,0.5,2]);
});
