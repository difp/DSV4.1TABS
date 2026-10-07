// Riff Hero — точка входа: UI, воспроизведение, игровой цикл, импорт,
// каталоги песен, профиль и статистика.
import { AudioEngine } from './engine/audio.js';
import { PitchDetector } from './engine/pitch.js';
import { HighwayRenderer } from './engine/renderer.js';
import { Game } from './engine/game.js';
import { buildSong, midiToName } from './engine/theory.js';
import { parseNative } from './parsers/native.js';
import { parseBytes } from './parsers/index.js';
import { DEMO_SONGS } from './songs/demos.js';
import { loadCatalogFromUrl, loadCatalogFromFile, resolveEntry } from './parser-catalog.js';
import { loadProfile, saveProfile, resetProfile, recordSession, streak, accuracyOf, fmtDuration, normalizeProfile } from './profile.js';

const $ = (id) => document.getElementById(id);
const el = {
  songTitle: $('songTitle'), songMeta: $('songMeta'),
  layoutSeg: $('layoutSeg'), btnProfile: $('btnProfile'), btnMic: $('btnMic'),
  btnListen: $('btnListen'), btnLibrary: $('btnLibrary'), btnTheme: $('btnTheme'),
  stage: $('stage'), score: $('score'), combo: $('combo'), accuracy: $('accuracy'),
  pitchNote: $('pitchNote'), pitchCents: $('pitchCents'), micState: $('micState'),
  startOverlay: $('startOverlay'), songList: $('songList'), fileInput: $('fileInput'),
  trackPicker: $('trackPicker'), trackSelect: $('trackSelect'),
  catalogUrl: $('catalogUrl'), btnCatalogLoad: $('btnCatalogLoad'), catalogFileInput: $('catalogFileInput'), catalogStatus: $('catalogStatus'),
  speed: $('speed'), speedVal: $('speedVal'), metronome: $('metronome'),
  countIn: $('countIn'), showFret: $('showFret'), guideVol: $('guideVol'),
  metroVol: $('metroVol'), latency: $('latency'), latencyVal: $('latencyVal'), sens: $('sens'),
  profileOverlay: $('profileOverlay'), profileName: $('profileName'), profileStats: $('profileStats'),
  profileSongs: $('profileSongs'), btnProfileClose: $('btnProfileClose'), btnProfileReset: $('btnProfileReset'),
  btnProfileExport: $('btnProfileExport'), profileImport: $('profileImport'),
  btnLoopA: $('btnLoopA'), btnLoopB: $('btnLoopB'), btnLoopClear: $('btnLoopClear'), loopMarkers: $('loopMarkers'),
  btnStart: $('btnStart'), finishOverlay: $('finishOverlay'), finishTitle: $('finishTitle'),
  resultGrid: $('resultGrid'), btnAgain: $('btnAgain'), btnBack: $('btnBack'),
  btnPlay: $('btnPlay'), btnRestart: $('btnRestart'), progressBar: $('progressBar'),
  timeReadout: $('timeReadout'), toasts: $('toasts'),
};

const audio = new AudioEngine();
const pitch = new PitchDetector(44100);
const renderer = new HighwayRenderer(el.stage);

const state = {
  raw: null,
  song: null,
  game: null,
  detected: null,
  playing: false,
  paused: false,
  startCtx: 0,
  startSong: 0,
  pauseSong: 0,
  rate: 1,
  latencySec: 0,
  schedulePtr: 0,
  metroPtr: 0,
  seeking: false,
  trackIndex: 0,
  layoutPref: localStorage.getItem('riffhero.layout') || 'auto',
  theme: localStorage.getItem('riffhero.theme') || 'dark',
  loopA: null,
  loopB: null,
  library: { builtin: [], catalog: null },
  profile: loadProfile(),
  practiceBuffer: 0,
  sessionPractice: 0,
  lastFrame: 0,
};

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------
function toast(text, kind = '', ms = 3600) {
  const div = document.createElement('div');
  div.className = 'toast ' + kind;
  div.textContent = text;
  el.toasts.appendChild(div);
  setTimeout(() => div.remove(), ms);
}

function fmtTime(s) {
  s = Math.max(0, s || 0);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function lowerBound(arr, t, key = 't') {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid][key] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------------------------------------------------------------------
// Режим отображения (Авто / ПК / Телефон)
// ---------------------------------------------------------------------------
function resolveLayout() {
  if (state.layoutPref === 'desktop' || state.layoutPref === 'phone') return state.layoutPref;
  return window.innerWidth < 820 ? 'phone' : 'desktop';
}

function applyLayout() {
  document.body.dataset.ui = resolveLayout();
  for (const b of el.layoutSeg.querySelectorAll('button')) {
    b.classList.toggle('active', b.dataset.layout === state.layoutPref);
  }
  requestAnimationFrame(() => renderer.resize());
}

function applyTheme() {
  document.body.dataset.theme = state.theme;
  el.btnTheme.classList.toggle('active', state.theme === 'light');
}

// ---------------------------------------------------------------------------
// Библиотека и каталог
// ---------------------------------------------------------------------------
function songRow(title, meta) {
  const b = document.createElement('button');
  b.className = 'song-item';
  const n = document.createElement('span');
  n.className = 'name';
  n.textContent = title;
  const m = document.createElement('span');
  m.className = 'meta';
  m.textContent = meta;
  b.append(n, m);
  return b;
}

function markSelected(btn) {
  for (const node of el.songList.querySelectorAll('.song-item')) node.classList.remove('selected');
  if (btn) btn.classList.add('selected');
}

function renderLibrary() {
  el.songList.innerHTML = '';

  const headBuiltin = document.createElement('div');
  headBuiltin.className = 'list-head';
  headBuiltin.textContent = 'Встроенные';
  el.songList.appendChild(headBuiltin);

  for (const raw of state.library.builtin) {
    const btn = songRow(raw.title, `${raw.tracks[0].notes.length} нот · ${raw.artist || ''}`);
    btn.addEventListener('click', () => { markSelected(btn); loadRaw(raw); closeStart(); });
    el.songList.appendChild(btn);
  }

  if (state.library.catalog) {
    const head = document.createElement('div');
    head.className = 'list-head';
    const nm = document.createElement('span');
    nm.textContent = state.library.catalog.name;
    const clr = document.createElement('button');
    clr.textContent = 'очистить';
    clr.addEventListener('click', () => { state.library.catalog = null; renderLibrary(); el.catalogStatus.textContent = ''; });
    head.append(nm, clr);
    el.songList.appendChild(head);

    for (const entry of state.library.catalog.songs) {
      const meta = entry.artist || entry.url || 'в каталоге';
      const btn = songRow(entry.title, meta);
      btn.addEventListener('click', async () => {
        markSelected(btn);
        btn.classList.add('loading');
        const metaEl = btn.querySelector('.meta');
        const prev = metaEl.textContent;
        metaEl.textContent = 'загрузка…';
        try {
          const raw = await resolveEntry(entry, state.library.catalog.baseUrl);
          loadRaw(raw);
          closeStart();
          toast('Загружено: ' + raw.title, 'ok');
        } catch (e) {
          metaEl.textContent = prev;
          btn.classList.remove('loading');
          toast('Каталог: ' + e.message, 'err', 6000);
        }
      });
      el.songList.appendChild(btn);
    }
  }
}

async function loadCatalogUrl() {
  const url = el.catalogUrl.value.trim();
  if (!url) return;
  el.catalogStatus.textContent = 'загрузка каталога…';
  try {
    const cat = await loadCatalogFromUrl(url);
    state.library.catalog = cat;
    renderLibrary();
    el.catalogStatus.textContent = `Каталог «${cat.name}» — ${cat.songs.length} песен`;
    toast('Каталог загружен', 'ok');
  } catch (e) {
    el.catalogStatus.textContent = '';
    toast('Каталог: ' + e.message, 'err', 6000);
  }
}

async function loadCatalogFile(file) {
  el.catalogStatus.textContent = 'загрузка каталога…';
  try {
    const cat = await loadCatalogFromFile(file);
    state.library.catalog = cat;
    renderLibrary();
    el.catalogStatus.textContent = `Каталог «${cat.name}» — ${cat.songs.length} песен`;
    toast('Каталог загружен', 'ok');
  } catch (e) {
    el.catalogStatus.textContent = '';
    toast('Каталог: ' + e.message, 'err', 6000);
  }
}

// ---------------------------------------------------------------------------
// Загрузка песни
// ---------------------------------------------------------------------------
function loadRaw(raw) {
  state.raw = raw;
  state.trackIndex = pickDefaultTrack(raw);
  state.loopA = null;
  state.loopB = null;
  buildCurrentSong();
  buildTrackPicker();
  updateLoopMarkers();
}

function pickDefaultTrack(raw) {
  const tracks = raw.tracks || [];
  let best = -1, bestCount = -1;
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (t.percussion) continue;
    const c = (t.notes || []).length;
    if (c > bestCount) { bestCount = c; best = i; }
  }
  return best < 0 ? 0 : best;
}

function buildCurrentSong() {
  const song = buildSong(state.raw, state.trackIndex);
  state.song = song;
  state.game = new Game(song);
  state.game.autoplay = el.btnListen.classList.contains('active');
  resetPlayback();
  applySongUi();
}

function applySongUi() {
  const song = state.song;
  el.songTitle.textContent = song.title + (song.artist ? ' — ' + song.artist : '');
  const tuning = song.tuning.map(m => midiToName(m, false)).join(' ');
  el.songMeta.textContent = `${song.notes.length} нот · ${fmtTime(song.duration)} · ${Math.round(song.bpm)} BPM · ${tuning}${song.trackName ? ' · ' + song.trackName : ''}`;
  el.btnStart.disabled = false;
  el.btnPlay.disabled = false;
  el.btnRestart.disabled = false;
  el.progressBar.value = 0;
  el.timeReadout.textContent = `0:00 / ${fmtTime(song.duration)}`;
  updateHud();
}

function buildTrackPicker() {
  const tracks = state.raw.tracks || [];
  const playable = tracks.map((t, i) => ({ t, i })).filter(x => !x.t.percussion && (x.t.notes || []).length);
  if (playable.length <= 1) {
    el.trackPicker.classList.add('hidden');
    el.trackSelect.innerHTML = '';
    return;
  }
  el.trackPicker.classList.remove('hidden');
  el.trackSelect.innerHTML = '';
  for (const { t, i } of playable) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${t.name || 'Дорожка ' + (i + 1)} — ${(t.notes || []).length} нот`;
    if (i === state.trackIndex) opt.selected = true;
    el.trackSelect.appendChild(opt);
  }
}

async function loadFile(file) {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const raw = await parseBytes(bytes, file.name);
    loadRaw(raw);
    closeStart();
    toast(`Открыто: ${raw.title} (${raw.tracks.length} дор.)`, 'ok');
  } catch (e) {
    console.error(e);
    toast('Ошибка импорта: ' + e.message, 'err', 6000);
  }
}

// ---------------------------------------------------------------------------
// Профиль и статистика
// ---------------------------------------------------------------------------
function renderProfile() {
  const p = state.profile;
  el.profileName.value = p.name || '';
  el.profileStats.innerHTML = [
    ['Практика', fmtDuration(p.practiceSec)],
    ['Точность', Math.round(accuracyOf(p) * 100) + '%'],
    ['Ноты', String(p.notesHit)],
    ['Серия', streak(p) + ' дн.'],
    ['Сессий', String(p.sessions)],
    ['Песен', String(Object.keys(p.songs).length)],
  ].map(([k, v]) => `<div class="m"><b>${v}</b><span>${k}</span></div>`).join('');

  const rows = Object.values(p.songs).sort((a, b) => b.lastPlayed - a.lastPlayed);
  if (!rows.length) {
    el.profileSongs.innerHTML = '<div class="empty">Пока нет сыгранных песен.</div>';
  } else {
    el.profileSongs.innerHTML = rows.map(s => `
      <div class="row-item">
        <span class="t">${escapeHtml(s.title)}</span>
        <span class="v">${s.plays}×</span>
        <span class="v">${s.bestScore}</span>
        <span class="v">${Math.round(s.bestAccuracy * 100)}%</span>
      </div>`).join('');
  }
}

function flushPractice() {
  if (state.practiceBuffer <= 0.5) return;
  state.profile.practiceSec += state.practiceBuffer;
  state.practiceBuffer = 0;
  saveProfile(state.profile);
  if (!el.profileOverlay.classList.contains('hidden')) renderProfile();
}

function exportProfile() {
  const blob = new Blob([JSON.stringify(state.profile, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'riff-hero-profile.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Профиль выгружен', 'ok');
}

async function importProfile(file) {
  try {
    const data = JSON.parse(await file.text());
    state.profile = normalizeProfile(data);
    saveProfile(state.profile);
    renderProfile();
    toast('Профиль загружен', 'ok');
  } catch (e) {
    toast('Профиль: ' + e.message, 'err', 6000);
  }
}

// ---------------------------------------------------------------------------
// A/B повтор фрагмента
// ---------------------------------------------------------------------------
function loopActive() {
  return state.loopA != null && state.loopB != null && state.loopB > state.loopA + 0.2;
}

function currentTime() {
  if (!state.song) return 0;
  const t = state.playing ? (state.paused ? state.pauseSong : computeSongTime()) : state.startSong;
  return Math.max(0, Math.min(t, state.song.duration));
}

function setLoopA() {
  if (!state.song) return;
  state.loopA = currentTime();
  if (state.loopB != null && state.loopB <= state.loopA + 0.2) state.loopB = null;
  updateLoopMarkers();
  toast('A: ' + fmtTime(state.loopA));
}

function setLoopB() {
  if (!state.song) return;
  const t = currentTime();
  if (state.loopA == null) state.loopA = 0;
  if (t <= state.loopA + 0.2) { toast('Точка B должна быть позже A', 'err'); return; }
  state.loopB = t;
  updateLoopMarkers();
  toast(`A/B: ${fmtTime(state.loopA)} – ${fmtTime(state.loopB)}`);
}

function clearLoop() {
  state.loopA = null;
  state.loopB = null;
  updateLoopMarkers();
}

function updateLoopMarkers() {
  const dur = (state.song && state.song.duration) || 0;
  const range = el.loopMarkers.querySelector('.lm-range');
  const a = el.loopMarkers.querySelector('.lm-a');
  const b = el.loopMarkers.querySelector('.lm-b');
  const showA = state.loopA != null && dur > 0;
  const showB = state.loopB != null && dur > 0;
  a.style.display = showA ? 'block' : 'none';
  b.style.display = showB ? 'block' : 'none';
  if (showA) a.style.left = (state.loopA / dur) * 100 + '%';
  if (showB) b.style.left = (state.loopB / dur) * 100 + '%';
  const showR = loopActive() && dur > 0;
  range.style.display = showR ? 'block' : 'none';
  if (showR) {
    range.style.left = (state.loopA / dur) * 100 + '%';
    range.style.width = ((state.loopB - state.loopA) / dur) * 100 + '%';
  }
}

// ---------------------------------------------------------------------------
// Воспроизведение
// ---------------------------------------------------------------------------
function computeSongTime() {
  if (!state.playing) return state.startSong;
  if (state.paused) return state.pauseSong;
  return state.startSong + (audio.now - state.startCtx) * state.rate;
}

function resetPlayback() {
  audio.stopAll();
  flushPractice();
  state.playing = false;
  state.paused = false;
  state.startSong = 0;
  state.pauseSong = 0;
  state.schedulePtr = 0;
  state.metroPtr = 0;
  state.detected = null;
  state.sessionPractice = 0;
  if (state.song) state.game.reset();
  updatePlayButton();
  updateHud();
}

function firstNoteIndex(t) { return lowerBound(state.song.notes, t); }
function firstBeatIndex(t) { return lowerBound(state.song.grid.beats, t); }

async function play() {
  if (!state.song) return;
  await audio.ensure();
  audio.setGuideVolume(parseFloat(el.guideVol.value));
  audio.setMetroVolume(parseFloat(el.metroVol.value));
  closeStart();
  el.finishOverlay.classList.add('hidden');

  if (state.playing && !state.paused) return;

  if (state.playing && state.paused) {
    state.paused = false;
    state.startCtx = audio.now;
    state.startSong = state.pauseSong;
    state.schedulePtr = firstNoteIndex(state.startSong - 0.05);
    state.metroPtr = firstBeatIndex(state.startSong - 0.05);
  } else {
    startFrom(0);
  }
  updatePlayButton();
  if (!audio.micReady && !state.game.autoplay) {
    toast('Включите микрофон или «Демо», чтобы ноты засчитывались', '', 5000);
  }
}

function startFrom(pos, noCountIn) {
  audio.stopAll();
  flushPractice();
  state.playing = true;
  state.paused = false;
  state.startSong = pos;
  state.pauseSong = pos;
  state.schedulePtr = firstNoteIndex(pos - 0.05);
  state.metroPtr = firstBeatIndex(pos - 0.05);
  state.sessionPractice = pos > 0 ? state.sessionPractice : 0;
  state.game.rewind(pos);

  const beat = 60 / (state.song.bpm || 120);
  let lead = 0;
  if (el.countIn.checked && pos === 0 && !noCountIn) {
    lead = (4 * beat) / state.rate;
    const t0 = audio.now + 0.08;
    for (let k = 0; k < 4; k++) audio.click(t0 + (k * beat) / state.rate, k === 0);
  }
  state.startCtx = audio.now + lead;
  updatePlayButton();
}

function pause() {
  if (!state.playing || state.paused) return;
  state.pauseSong = computeSongTime();
  state.paused = true;
  audio.stopAll();
  flushPractice();
  updatePlayButton();
}

function togglePlay() {
  if (!state.song) return;
  if (!state.playing || state.paused) play();
  else pause();
}

function restart() {
  if (!state.song) return;
  el.finishOverlay.classList.add('hidden');
  state.game.reset();
  startFrom(0);
}

function scheduleAhead() {
  const song = state.song;
  const songTime = computeSongTime();
  const horizon = songTime + 1.0 * state.rate;
  const guideVol = parseFloat(el.guideVol.value);

  while (state.schedulePtr < song.notes.length) {
    const n = song.notes[state.schedulePtr];
    if (n.t > horizon) break;
    if (n.t >= state.startSong - 0.001) {
      const when = state.startCtx + (n.t - state.startSong) / state.rate;
      if (when > audio.now - 0.05 && guideVol > 0.001) {
        audio.playNote(n.midi, when, Math.max(0.1, n.dur / state.rate), 0.75 * (n.velocity || 0.8));
      }
    }
    state.schedulePtr++;
  }

  if (el.metronome.checked) {
    const beats = song.grid.beats;
    while (state.metroPtr < beats.length) {
      const b = beats[state.metroPtr];
      if (b.t > horizon) break;
      if (b.t >= state.startSong - 0.001) {
        const when = state.startCtx + (b.t - state.startSong) / state.rate;
        if (when > audio.now - 0.02) audio.click(when, b.bar);
      }
      state.metroPtr++;
    }
  }
}

// ---------------------------------------------------------------------------
// Игровой цикл
// ---------------------------------------------------------------------------
function frame() {
  const nowMs = performance.now();
  const realDt = state.lastFrame ? Math.min(1, (nowMs - state.lastFrame) / 1000) : 0;
  state.lastFrame = nowMs;

  let songTime = state.playing
    ? (state.paused ? state.pauseSong : computeSongTime())
    : state.startSong;

  // A/B повтор: дошли до B — прыгаем назад к A
  if (state.playing && !state.paused && loopActive() && songTime >= state.loopB) {
    startFrom(state.loopA, true);
    songTime = state.loopA;
  }

  if (state.playing && !state.paused) {
    state.sessionPractice += realDt;
    state.practiceBuffer += realDt;
    if (state.practiceBuffer > 5) flushPractice();

    if (songTime >= -0.001) scheduleAhead();
    const judgeTime = songTime - state.latencySec;
    state.game.update(judgeTime, state.detected);
    if (state.game.finished || songTime > state.song.duration + 2.5) onFinish();
  }

  renderer.render({
    song: state.song,
    game: state.game,
    songTime,
    pxPerSec: 230,
    detected: state.detected,
    showFret: el.showFret.checked,
  });

  updateHud(songTime);
  requestAnimationFrame(frame);
}

function updateHud(songTime) {
  if (!state.song) return;
  const g = state.game;
  el.score.textContent = String(g.score);
  el.combo.textContent = String(g.combo);
  el.accuracy.textContent = Math.round(g.accuracy * 100) + '%';

  const dur = state.song.duration || 1;
  const t = songTime == null ? 0 : songTime;
  if (!state.seeking) {
    el.progressBar.value = Math.max(0, Math.min(1000, Math.round((t / dur) * 1000)));
    el.timeReadout.textContent = `${fmtTime(t)} / ${fmtTime(dur)}`;
  }

  const d = state.detected;
  if (d && Number.isFinite(d.midi) && d.clarity > 0.45) {
    const cents = Math.round((d.midi - Math.round(d.midi)) * 100);
    el.pitchNote.textContent = midiToName(d.midi);
    el.pitchCents.textContent = (cents > 0 ? '+' : '') + cents + '¢';
  } else if (audio.micReady) {
    el.pitchNote.textContent = '—';
    el.pitchCents.textContent = '';
  }

  updateLoopMarkers();
}

function onFinish() {
  if (!state.playing) return;
  const t = computeSongTime();
  state.playing = false;
  state.paused = false;
  state.startSong = Math.max(0, Math.min(t, state.song.duration));
  state.pauseSong = state.startSong;
  audio.stopAll();
  flushPractice();

  const g = state.game;
  const song = state.song;
  const key = `${song.title}|${song.artist}|${song.trackName}`.toLowerCase();
  recordSession(state.profile, {
    key,
    title: song.title + (song.trackName ? ' · ' + song.trackName : ''),
    score: g.score,
    accuracy: g.accuracy,
    maxCombo: g.maxCombo,
    hits: g.hits,
    misses: g.misses,
  });
  saveProfile(state.profile);

  updatePlayButton();
  showResults();
}

function showResults() {
  const g = state.game;
  const acc = Math.round(g.accuracy * 100);
  const grade = acc >= 98 ? 'S' : acc >= 92 ? 'A' : acc >= 82 ? 'B' : acc >= 70 ? 'C' : acc >= 55 ? 'D' : 'E';
  el.finishTitle.textContent = 'Результат';
  el.resultGrid.innerHTML = [
    ['Очки', String(g.score)],
    ['Точность', acc + '%'],
    ['Комбо', String(g.maxCombo)],
    ['Попаданий', String(g.hits)],
    ['Промахов', String(g.misses)],
    ['Оценка', grade],
  ].map(([k, v]) => `<div class="m"><b>${v}</b><span>${k}</span></div>`).join('');
  el.finishOverlay.classList.remove('hidden');
}

function updatePlayButton() {
  el.btnPlay.textContent = (!state.playing || state.paused) ? 'Играть' : 'Пауза';
}

function closeStart() { el.startOverlay.classList.add('hidden'); }
function openLibrary(show) { el.startOverlay.classList.toggle('hidden', !show); }

// ---------------------------------------------------------------------------
// События
// ---------------------------------------------------------------------------
function bindEvents() {
  el.btnPlay.addEventListener('click', togglePlay);
  el.btnRestart.addEventListener('click', restart);
  el.btnStart.addEventListener('click', () => play());
  el.btnAgain.addEventListener('click', restart);
  el.btnBack.addEventListener('click', () => {
    el.finishOverlay.classList.add('hidden');
    resetPlayback();
    openLibrary(true);
  });
  el.btnLibrary.addEventListener('click', () => openLibrary(el.startOverlay.classList.contains('hidden')));

  el.layoutSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-layout]');
    if (!btn) return;
    state.layoutPref = btn.dataset.layout;
    localStorage.setItem('riffhero.layout', state.layoutPref);
    applyLayout();
  });

  el.btnTheme.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('riffhero.theme', state.theme);
    applyTheme();
  });

  el.btnLoopA.addEventListener('click', setLoopA);
  el.btnLoopB.addEventListener('click', setLoopB);
  el.btnLoopClear.addEventListener('click', clearLoop);

  el.btnProfile.addEventListener('click', () => {
    renderProfile();
    el.profileOverlay.classList.remove('hidden');
  });
  el.btnProfileClose.addEventListener('click', () => el.profileOverlay.classList.add('hidden'));
  el.profileName.addEventListener('input', () => {
    state.profile.name = el.profileName.value;
    saveProfile(state.profile);
  });
  el.btnProfileReset.addEventListener('click', () => {
    state.profile = resetProfile();
    renderProfile();
    toast('Статистика сброшена');
  });
  el.btnProfileExport.addEventListener('click', exportProfile);
  el.profileImport.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) importProfile(f);
    e.target.value = '';
  });

  el.btnListen.addEventListener('click', () => {
    const on = !el.btnListen.classList.contains('active');
    el.btnListen.classList.toggle('active', on);
    if (state.game) state.game.autoplay = on;
    toast(on ? 'Демо-режим включён' : 'Демо-режим выключен');
  });

  el.btnMic.addEventListener('click', async () => {
    if (audio.micReady) {
      audio.disableMic();
      el.micState.textContent = 'микрофон выкл';
      el.micState.className = 'pill off';
      el.pitchNote.textContent = '—';
      el.pitchCents.textContent = '';
      return;
    }
    try {
      await audio.enableMic();
      pitch.setSampleRate(audio.ctx.sampleRate);
      el.micState.textContent = 'микрофон вкл';
      el.micState.className = 'pill on';
      toast('Микрофон включён', 'ok');
    } catch (e) {
      toast('Микрофон недоступен: ' + e.message, 'err', 6000);
    }
  });

  el.fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) loadFile(f);
    e.target.value = '';
  });

  el.btnCatalogLoad.addEventListener('click', loadCatalogUrl);
  el.catalogUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadCatalogUrl(); });
  el.catalogFileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) loadCatalogFile(f);
    e.target.value = '';
  });

  el.trackSelect.addEventListener('change', () => {
    state.trackIndex = parseInt(el.trackSelect.value, 10) || 0;
    const wasPlaying = state.playing && !state.paused;
    buildCurrentSong();
    if (wasPlaying) startFrom(0);
  });

  el.speed.addEventListener('input', () => {
    el.speedVal.textContent = parseFloat(el.speed.value).toFixed(2).replace(/0$/, '') + '×';
    const newRate = parseFloat(el.speed.value);
    if (state.playing && !state.paused) {
      const cur = computeSongTime();
      state.rate = newRate;
      state.startSong = cur;
      state.startCtx = audio.now;
      state.schedulePtr = firstNoteIndex(cur - 0.05);
      state.metroPtr = firstBeatIndex(cur - 0.05);
      audio.stopAll();
    } else {
      state.rate = newRate;
    }
  });

  el.latency.addEventListener('input', () => {
    el.latencyVal.textContent = el.latency.value + ' мс';
    state.latencySec = parseFloat(el.latency.value) / 1000;
  });
  el.sens.addEventListener('input', () => { pitch.rmsGate = parseFloat(el.sens.value); });
  el.guideVol.addEventListener('input', () => audio.setGuideVolume(parseFloat(el.guideVol.value)));
  el.metroVol.addEventListener('input', () => audio.setMetroVolume(parseFloat(el.metroVol.value)));

  el.progressBar.addEventListener('input', () => { state.seeking = true; });
  el.progressBar.addEventListener('change', () => {
    state.seeking = false;
    if (!state.song) return;
    const pos = (parseFloat(el.progressBar.value) / 1000) * state.song.duration;
    if (state.playing && !state.paused) startFrom(pos);
    else { state.startSong = pos; state.pauseSong = pos; state.game.rewind(pos); }
  });

  window.addEventListener('keydown', (e) => {
    if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'KeyR') { e.preventDefault(); restart(); }
    else if (e.code === 'BracketLeft') { e.preventDefault(); setLoopA(); }
    else if (e.code === 'BracketRight') { e.preventDefault(); setLoopB(); }
    else if (e.code === 'Backslash') { e.preventDefault(); clearLoop(); }
  });

  window.addEventListener('resize', () => { applyLayout(); renderer.resize(); });
  window.addEventListener('pagehide', () => { flushPractice(); saveProfile(state.profile); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { flushPractice(); saveProfile(state.profile); } });
}

// ---------------------------------------------------------------------------
// Инициализация
// ---------------------------------------------------------------------------
function init() {
  state.library.builtin = DEMO_SONGS.map(parseNative);
  renderLibrary();
  renderProfile();
  bindEvents();
  applyTheme();
  applyLayout();
  renderer.resize();

  loadRaw(state.library.builtin[0]);

  setInterval(() => {
    if (!audio.micReady) return;
    const data = audio.getTimeData();
    if (!data) return;
    state.detected = pitch.detect(data);
  }, 16);

  requestAnimationFrame(frame);

  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') {
    el.btnListen.classList.add('active');
    if (state.game) state.game.autoplay = true;
  }

  window.__riff = { state, audio, pitch, renderer, play, pause, togglePlay, startFrom, restart, loadRaw, renderProfile, applyLayout, applyTheme, frame };
}

init();
