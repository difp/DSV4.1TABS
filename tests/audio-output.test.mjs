import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/engine/audio.js';

class FakeNode {
  constructor() { this.gain = { value: 1 }; }
  connect() {}
  disconnect() {}
}
class FakeAudioContext {
  constructor() { this.destination = new FakeNode(); this.state = 'running'; this.sampleRate = 48000; }
  createGain() { return new FakeNode(); }
  createMediaStreamSource() { return new FakeNode(); }
  createAnalyser() { return new FakeNode(); }
}

test('speaker mode mutes guide only while the microphone is active', async () => {
  globalThis.window = { AudioContext: FakeAudioContext };
  const requests = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: {
    getUserMedia: async constraints => { requests.push(constraints); return { getTracks: () => [{ stop() {} }] }; },
  } } });
  const audio = new AudioEngine();
  audio.setGuideVolume(0.45);
  await audio.ensure();
  assert.equal(audio.guide.gain.value, 0.45);
  audio.setMetroVolume(0.6);
  await audio.enableMic();
  assert.equal(audio.guide.gain.value, 0);
  assert.equal(audio.metro.gain.value, 0.6);
  assert.equal(audio.guideMutedForMic, true);
  assert.equal(requests[0].audio.echoCancellation, false);
  audio.setGuideVolume(0.8);
  assert.equal(audio.guide.gain.value, 0);
  audio.setOutputMode('headphones');
  assert.equal(audio.guide.gain.value, 0.8);
  await audio.enableMic();
  assert.equal(requests[1].audio.echoCancellation, false);
  assert.equal(audio.guide.gain.value, 0.8);
  audio.setOutputMode('speakers');
  assert.equal(audio.guide.gain.value, 0);
  audio.disableMic();
  assert.equal(audio.guide.gain.value, 0.8);
});
