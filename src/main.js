// RiffHero — точка входа: экраны (Главная/Занятия/Профиль), воспроизведение,
// игровой цикл, импорт, каталоги, профиль, мастер, YouTube-аккорды.
// Аудио, тайминг и парсеры не менялись.
import { AudioEngine } from './engine/audio.js';
import { PitchDetector } from './engine/pitch.js';
import { SpectralAnalyzer } from './engine/spectral.js';
import { HighwayRenderer } from './engine/renderer.js';
import { Game } from './engine/game.js';
import { buildSong, midiToName } from './engine/theory.js';
import { parseNative } from './parsers/native.js';
import { parseBytes } from './parsers/index.js';
import { DEMO_SONGS, CATEGORIES } from './songs/demos.js';
import { loadCatalogFromUrl, loadCatalogFromFile, resolveEntry } from './parser-catalog.js';
import { loadProfile, saveProfile, resetProfile, recordSession, streak, accuracyOf, fmtDuration, normalizeProfile } from './profile.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const el = {
  body: document.body,
  songTitle: $('songTitle'), songMeta: $('songMeta'),
  micStatus: $('micStatus'), micText: $('micText'), micLevelBar: $('micLevelBar'),
  btnSound: $('btnSound'), btnMenu: $('btnMenu'), menuPopover: $('menuPopover'),
  menuAutoplay: $('menuAutoplay'), menuAutoplayVal: $('menuAutoplayVal'), menuWizard: $('menuWizard'), menuAbout: $('menuAbout'),
  tabbar: $('tabbar'),
  screenHome: $('screenHome'), screenLibrary: $('screenLibrary'), screenProfile: $('screenProfile'),
  stage: $('stage'), score: $('score'), combo: $('combo'), accuracy: $('accuracy'),
  pitchNote: $('pitchNote'), pitchCents: $('pitchCents'), feedback: $('feedback'),
  heroCard: $('heroCard'), heroSlide: $('heroSlide'),
  heroType: $('heroType'), heroTitle: $('heroTitle'), heroArtist: $('heroArtist'),
  heroBpm: $('heroBpm'), heroDur: $('heroDur'), heroNotes: $('heroNotes'), heroTuning: $('heroTuning'),
  heroBest: $('heroBest'), heroDifficulty: $('heroDifficulty'), tabPreview: $('tabPreview'),
  btnPlaySelected: $('btnPlaySelected'), btnGoLibrary: $('btnGoLibrary'), heroYt: $('heroYt'),
  speedBpm: $('speedBpm'), speedChips: $('speedChips'), speed: $('speed'), speedVal: $('speedVal'), speedRange: $('speedRange'),
  btnSpeedQuick: $('btnSpeedQuick'), speedQuickVal: $('speedQuickVal'), speedPop: $('speedPop'), speedPopBpm: $('speedPopBpm'), speedPopPct: $('speedPopPct'), speedPopRange: $('speedPopRange'),
  tipText: $('tipText'), btnTipApply: $('btnTipApply'),
  themeSeg: $('themeSeg'), layoutSeg: $('layoutSeg'),
  metronome: $('metronome'), countIn: $('countIn'), showFret: $('showFret'), showFinger: $('showFinger'), autoplaySwitch: $('autoplaySwitch'),
  btnSoundHome: $('btnSoundHome'), btnWizardHome: $('btnWizardHome'), homeGitHub: $('homeGitHub'),
  categories: $('categories'),
  dropZone: $('dropZone'), fileInput: $('fileInput'), btnCatalogLink: $('btnCatalogLink'),
  ytUrl: $('ytUrl'), btnYoutube: $('btnYoutube'),
  trackPicker: $('trackPicker'), trackSelect: $('trackSelect'),
  profileName: $('profileName'), profileStats: $('profileStats'), profileErrStrings: $('profileErrStrings'), profileSongs: $('profileSongs'),
  btnProfileReset: $('btnProfileReset'), btnProfileExport: $('btnProfileExport'), profileImport: $('profileImport'),
  advancedOverlay: $('advancedOverlay'), btnAdvancedClose: $('btnAdvancedClose'),
  guideVol: $('guideVol'), guideVolVal: $('guideVolVal'), metroVol: $('metroVol'), metroVolVal: $('metroVolVal'),
  latency: $('latency'), latencyVal: $('latencyVal'), btnAutoLatency: $('btnAutoLatency'), btnVerifyLatency: $('btnVerifyLatency'), latencyVerify: $('latencyVerify'),
  sens: $('sens'), sensVal: $('sensVal'), btnAutoSens: $('btnAutoSens'), btnOpenWizard: $('btnOpenWizard'),
  chordMode: $('chordMode'), sensPreset: $('sensPreset'),
  micSelect: $('micSelect'), outputSelect: $('outputSelect'), btnRefreshDevices: $('btnRefreshDevices'), deviceHint: $('deviceHint'),
  wizardOverlay: $('wizardOverlay'), wizSkip: $('wizSkip'), wizSkip2: $('wizSkip2'), wizPrev: $('wizPrev'), wizNext: $('wizNext'),
  wizPane1: $('wizPane1'), wizPane2: $('wizPane2'), wizPane3: $('wizPane3'),
  wizAllow: $('wizAllow'), wizMicState: $('wizMicState'), wizLevelBar: $('wizLevelBar'), wizLevelHint: $('wizLevelHint'),
  wizTuneNote: $('wizTuneNote'), wizCalibrate: $('wizCalibrate'), wizCalState: $('wizCalState'),
  resultsOverlay: $('resultsOverlay'), btnResultsClose: $('btnResultsClose'), resultsTitle: $('resultsTitle'),
  resultGrid: $('resultGrid'), resultErrors: $('resultErrors'), btnResultsLibrary: $('btnResultsLibrary'), btnAgain: $('btnAgain'), btnPracticeWeak: $('btnPracticeWeak'),
  catalogOverlay: $('catalogOverlay'), btnCatalogClose: $('btnCatalogClose'), catalogUrl: $('catalogUrl'), btnCatalogLoad: $('btnCatalogLoad'), catalogFileInput: $('catalogFileInput'), catalogStatus: $('catalogStatus'),
  youtubeOverlay: $('youtubeOverlay'), btnYoutubeClose: $('btnYoutubeClose'), ytUrl2: $('ytUrl2'), ytPreview: $('ytPreview'), btnYtResolve: $('btnYtResolve'), ytOpenChords: $('ytOpenChords'), ytOpenVideo: $('ytOpenVideo'), btnYtAttach: $('btnYtAttach'), ytStatus: $('ytStatus'),
  btnPlay: $('btnPlay'), btnRestart: $('btnRestart'),
  btnLoopA: $('btnLoopA'), btnLoopB: $('btnLoopB'), btnLoopClear: $('btnLoopClear'),
  btnOrient: $('btnOrient'), btnFinger: $('btnFinger'), loopBadge: $('loopBadge'),
  progressBar: $('progressBar'), loopMarkers: $('loopMarkers'), timeReadout: $('timeReadout'),
  toasts: $('toasts'),
};

const audio = new AudioEngine();
const pitch = new PitchDetector(44100);
const spectral = new SpectralAnalyzer(44100);
const renderer = new HighwayRenderer(el.stage);

const SETTINGS_KEY = 'riffhero.settings.v1';
function loadStoredSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; } }

const state = {
  raw: null, song: null, game: null, detected: null,
  playing: false, paused: false,
  startCtx: 0, startSong: 0, pauseSong: 0,
  rate: 1, latencySec: 0,
  schedulePtr: 0, metroPtr: 0, seeking: false,
  trackIndex: 0,
  layoutPref: localStorage.getItem('riffhero.layout') || 'auto',
  theme: localStorage.getItem('riffhero.theme') || 'dark',
  loopA: null, loopB: null,
  library: { builtin: [], catalog: null },
  items: [],
  selectedId: null,
  profile: loadProfile(),
  practiceBuffer: 0, sessionPractice: 0, lastFrame: 0,
  wizardStep: 1, wizardActive: false,
  lastErrors: null,
  ytAttached: [],
  settings: Object.assign({
    rate: 1, metronome: true, countIn: true, showFret: true, showFinger: true, orientation: 'h',
    guideVol: 70, metroVol: 60, latency: 0, sens: 6, clarity: 0.5,
    chordMode: 'any', sensPreset: 'room', micDeviceId: '', outputDeviceId: '',
    autoplay: false, onboarded: false, recent: [], youtube: {},
  }, loadStoredSettings()),
};
if (!state.settings.youtube) state.settings.youtube = {};

function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch { /* noop */ } }

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------
function toast(text, kind = '', ms = 3600) {
  const icons = { ok: '✓', err: '!' };
  const div = document.createElement('div');
  div.className = 'toast'; div.dataset.kind = kind;
  if (icons[kind]) { const ic = document.createElement('span'); ic.className = 'toast__icon'; ic.textContent = icons[kind]; ic.setAttribute('aria-hidden', 'true'); div.appendChild(ic); }
  const t = document.createElement('span'); t.textContent = text; div.appendChild(t);
  el.toasts.appendChild(div);
  setTimeout(() => div.remove(), ms);
}
function fmtTime(s) { s = Math.max(0, s || 0); const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }
function lowerBound(arr, t, key = 't') { let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid][key] < t) lo = mid + 1; else hi = mid; } return lo; }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
function rmsOf(buf) { let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length); }

let wakeLock = null;
async function requestWakeLock() { try { if (!('wakeLock' in navigator) || wakeLock) return; wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch { /* noop */ } }
function releaseWakeLock() { if (wakeLock) { try { wakeLock.release(); } catch { /* noop */ } wakeLock = null; } }

// ---------------------------------------------------------------------------
// Экраны, вкладки и история
// ---------------------------------------------------------------------------
const MODALS = () => [el.advancedOverlay, el.wizardOverlay, el.resultsOverlay, el.catalogOverlay, el.youtubeOverlay];
const MODAL_BY_ID = { advanced: () => el.advancedOverlay, wizard: () => el.wizardOverlay, results: () => el.resultsOverlay, catalog: () => el.catalogOverlay, youtube: () => el.youtubeOverlay };
const SCREENS = ['home', 'library', 'profile', 'game'];

function hideAllModals() { for (const n of MODALS()) n.classList.add('hidden'); }
function visibleModal() { return MODALS().find((o) => !o.classList.contains('hidden')) || null; }
function focusFirst(node) {
  const f = node.querySelector('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
  if (f) setTimeout(() => { try { f.focus(); } catch { /* noop */ } }, 0);
}
function currentView() { return (history.state && history.state.view) || 'home'; }

function showScreen(view) {
  el.screenHome.classList.toggle('hidden', view !== 'home');
  el.screenLibrary.classList.toggle('hidden', view !== 'library');
  el.screenProfile.classList.toggle('hidden', view !== 'profile');
  el.tabbar.classList.remove('hidden');
  for (const b of el.tabbar.querySelectorAll('.tab')) b.classList.toggle('is-active', b.dataset.view === view);
  if (view === 'home') { updateHero(); renderTip(); }
  else if (view === 'library') renderCategories();
  else if (view === 'profile') renderProfile();
  else if (view === 'game') requestAnimationFrame(() => renderer.resize());
}

function renderHistoryState(st) {
  const s = (st && st.view) ? st : { view: 'home' };
  if (state.playing && !state.paused && s.view !== 'game') pause();
  showScreen(s.view);
  hideAllModals();
  if (s.modal) { const n = MODAL_BY_ID[s.modal] && MODAL_BY_ID[s.modal](); if (n) { n.classList.remove('hidden'); focusFirst(n); } }
}
function navTo(entry, replace) { if (replace) history.replaceState(entry, ''); else history.pushState(entry, ''); renderHistoryState(entry); }
function goView(view) { navTo({ view }); }
function openModal(id) { navTo({ view: currentView(), modal: id }); }
function goBack() { history.back(); }

function overlayKeydown(e) {
  if (e.key !== 'Tab') return;
  const ov = visibleModal();
  if (!ov) return;
  const nodes = [...ov.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null || n === document.activeElement);
  if (!nodes.length) return;
  const first = nodes[0], last = nodes[nodes.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function bindModalDismiss(node) { node.addEventListener('mousedown', (e) => { if (e.target === node) goBack(); }); }

// ---------------------------------------------------------------------------
// Тема и раскладка (строго по выбору, без авто)
// ---------------------------------------------------------------------------
function resolveLayout() { if (state.layoutPref === 'desktop' || state.layoutPref === 'phone') return state.layoutPref; return window.innerWidth < 820 ? 'phone' : 'desktop'; }
function applyTheme() {
  document.body.dataset.theme = state.theme;
  for (const b of el.themeSeg.querySelectorAll('button')) b.classList.toggle('active', b.dataset.theme === state.theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', state.theme === 'light' ? '#ededed' : '#0b0b0b');
}
function applyLayout() {
  document.body.dataset.ui = resolveLayout();
  for (const b of el.layoutSeg.querySelectorAll('button')) b.classList.toggle('active', b.dataset.layout === state.layoutPref);
  requestAnimationFrame(() => renderer.resize());
}

// ---------------------------------------------------------------------------
// Настройки
// ---------------------------------------------------------------------------
function setSwitch(node, on) { node.setAttribute('aria-checked', on ? 'true' : 'false'); }
function updateSpeedChips(rate) { const pct = Math.round(rate * 100); for (const c of el.speedChips.querySelectorAll('.chip')) c.setAttribute('aria-pressed', Number(c.dataset.speed) === pct ? 'true' : 'false'); }
function speedBaseBpm() { return (state.song && state.song.bpm) || 120; }

function updateSpeedUi() {
  const base = speedBaseBpm();
  const rate = state.settings.rate;
  const pct = Math.round(rate * 100);
  const bpm = Math.round(base * rate);
  const minBpm = Math.max(20, Math.round(base * 0.25));
  const maxBpm = Math.round(base * 1.5);
  el.speed.min = String(minBpm); el.speed.max = String(maxBpm); el.speed.value = String(bpm);
  el.speedRange.textContent = `${minBpm}–${maxBpm} BPM`;
  el.speedVal.textContent = `${pct}%`;
  el.speedBpm.innerHTML = `${bpm}<span class="speed-big__u">BPM</span>`;
  el.speedQuickVal.textContent = `${pct}%`;
  el.speedPopBpm.textContent = `${bpm} BPM`; el.speedPopPct.textContent = `${pct}%`;
  el.speedPopRange.min = String(minBpm); el.speedPopRange.max = String(maxBpm); el.speedPopRange.value = String(bpm);
  updateSpeedChips(rate);
}
function setBpm(bpm) { setRate(clamp(bpm / speedBaseBpm(), 0.25, 1.5)); }
function toggleOrientation() { state.settings.orientation = state.settings.orientation === 'h' ? 'v' : 'h'; saveSettings(); applySettingsToUi(); }
function toggleFinger() { state.settings.showFinger = !state.settings.showFinger; saveSettings(); applySettingsToUi(); }
function toggleAutoplay() { state.settings.autoplay = !state.settings.autoplay; saveSettings(); applySettingsToUi(); if (state.game) state.game.autoplay = state.settings.autoplay; toast(state.settings.autoplay ? 'Автоигра включена' : 'Автоигра выключена'); }

function applySettingsToUi() {
  const s = state.settings;
  state.rate = s.rate;
  updateSpeedUi();
  setSwitch(el.metronome, s.metronome);
  setSwitch(el.countIn, s.countIn);
  setSwitch(el.showFret, s.showFret);
  setSwitch(el.showFinger, s.showFinger);
  setSwitch(el.autoplaySwitch, s.autoplay);
  el.btnOrient.setAttribute('aria-pressed', s.orientation === 'h' ? 'true' : 'false');
  el.btnFinger.setAttribute('aria-pressed', s.showFinger ? 'true' : 'false');
  el.guideVol.value = String(s.guideVol); el.guideVolVal.textContent = s.guideVol + '%';
  el.metroVol.value = String(s.metroVol); el.metroVolVal.textContent = s.metroVol + '%';
  el.latency.value = String(s.latency); el.latencyVal.textContent = s.latency + ' мс'; state.latencySec = s.latency / 1000;
  el.sens.value = String(s.sens); el.sensVal.textContent = String(s.sens); pitch.rmsGate = s.sens / 1000;
  el.menuAutoplayVal.textContent = s.autoplay ? 'вкл' : 'выкл';
  el.chordMode.value = s.chordMode;
  el.sensPreset.value = s.sensPreset;
  if (state.game) { state.game.autoplay = s.autoplay; state.game.opts.chordMode = s.chordMode; state.game.opts.clarity = s.clarity; }
}

const SENS_PRESETS = { quiet: { sens: 4, clarity: 0.45 }, room: { sens: 6, clarity: 0.5 }, amp: { sens: 12, clarity: 0.35 }, noisy: { sens: 20, clarity: 0.55 } };
function applySensPreset(name) {
  const p = SENS_PRESETS[name]; if (!p) return;
  state.settings.sens = p.sens; state.settings.clarity = p.clarity; state.settings.sensPreset = name;
  pitch.rmsGate = p.sens / 1000; el.sens.value = String(p.sens); el.sensVal.textContent = String(p.sens);
  if (state.game) state.game.opts.clarity = p.clarity; saveSettings();
}

// ---------------------------------------------------------------------------
// Песни, категории, выбор
// ---------------------------------------------------------------------------
function itemId(source, title, artist) { return `${source}:${title}|${artist || ''}`; }
function slug(s) { return String(s || '').trim().toLowerCase(); }

function buildItems() {
  const items = [];
  for (const raw of state.library.builtin) {
    const t = raw.tracks[0];
    items.push({ id: itemId('b', raw.title, raw.artist), source: 'builtin', type: /упражнени/i.test(raw.artist || '') ? 'exercise' : 'song', title: raw.title, artist: raw.artist || '', raw, noteCount: (t.notes || []).length });
  }
  if (state.library.catalog) {
    for (const entry of state.library.catalog.songs) {
      items.push({ id: itemId('c', entry.title, entry.artist), source: 'catalog', type: 'song', title: entry.title, artist: entry.artist || '', raw: null, entry, noteCount: null });
    }
  }
  for (const it of items) if (it.raw) it.difficulty = difficultyForRaw(it.raw);
  state.items = items;
}

function difficultyForRaw(raw) {
  try { return computeDifficulty(buildSong(raw, pickDefaultTrack(raw))); } catch { return 1; }
}
function categoryOf(item) {
  for (const [name, titles] of Object.entries(CATEGORIES)) if (titles.includes(item.title)) return name;
  return 'Свои и каталог';
}
function bestForItem(item) {
  const want = item.title.toLowerCase(); let best = null;
  for (const k of Object.keys(state.profile.songs)) if (k.startsWith(want + '|')) { const s = state.profile.songs[k]; if (best == null || s.bestAccuracy > best) best = s.bestAccuracy; }
  return best;
}
function currentItem() { return state.items.find((i) => i.id === state.selectedId) || null; }

function difficultyDots(d) {
  let html = '<span class="dots">';
  for (let i = 1; i <= 5; i++) html += `<i class="${i <= d ? 'on' : ''}"></i>`;
  return html + '</span>';
}

function renderCategories() {
  el.categories.innerHTML = '';
  const groups = new Map();
  for (const name of Object.keys(CATEGORIES)) groups.set(name, []);
  groups.set('Свои и каталог', []);
  for (const item of state.items) { const g = groups.get(categoryOf(item)); if (g) g.push(item); }

  for (const [name, list] of groups) {
    if (!list.length) continue;
    const sec = document.createElement('section'); sec.className = 'cat';
    const head = document.createElement('div'); head.className = 'cat__head';
    const title = document.createElement('span'); title.className = 'cat__title'; title.textContent = name;
    const nav = document.createElement('div'); nav.className = 'cat__nav';
    const prev = document.createElement('button'); prev.className = 'btn btn--icon btn--sm'; prev.textContent = '‹'; prev.setAttribute('aria-label', 'Назад в категории');
    const next = document.createElement('button'); next.className = 'btn btn--icon btn--sm'; next.textContent = '›'; next.setAttribute('aria-label', 'Вперёд в категории');
    nav.append(prev, next);
    head.append(title, nav);
    const rail = document.createElement('div'); rail.className = 'cat__rail';
    for (const item of list) {
      const card = document.createElement('button');
      card.className = 'exc-card' + (item.id === state.selectedId ? ' is-selected' : '');
      card.dataset.id = item.id;
      const best = bestForItem(item);
      card.innerHTML = `<div class="exc-card__title">${escapeHtml(item.title)}</div>`
        + `<div class="exc-card__meta"><span>${item.raw ? item.noteCount + ' нот' : 'каталог'}</span><span>${item.difficulty ? difficultyDots(item.difficulty) : ''}</span></div>`
        + `<div class="exc-card__meta"><span>${best != null ? Math.round(best * 100) + '%' : ''}</span><span class="muted">${escapeHtml(item.artist || '')}</span></div>`;
      card.addEventListener('click', () => selectItem(item, false));
      card.addEventListener('dblclick', () => selectItem(item, true));
      rail.appendChild(card);
    }
    const step = () => Math.max(120, rail.firstElementChild ? rail.firstElementChild.getBoundingClientRect().width + 12 : 180);
    prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reducedMotion() ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: reducedMotion() ? 'auto' : 'smooth' }));
    sec.append(head, rail);
    el.categories.appendChild(sec);
  }
  // выделенная карточка в поле зрения
  const sel = el.categories.querySelector('.exc-card.is-selected');
  if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

async function selectItem(item, autoplay) {
  if (!item.raw) {
    try {
      item.raw = await resolveEntry(item.entry, state.library.catalog.baseUrl);
      item.noteCount = (item.raw.tracks[pickDefaultTrack(item.raw)].notes || []).length;
      item.artist = item.raw.artist || item.artist;
      item.difficulty = difficultyForRaw(item.raw);
    } catch (e) { toast('Не удалось загрузить: ' + e.message, 'err', 6000); return; }
  }
  state.selectedId = item.id;
  const rec = state.settings.recent.filter((id) => id !== item.id);
  rec.unshift(item.id); state.settings.recent = rec.slice(0, 20); saveSettings();
  loadRaw(item.raw);
  updateHero();
  if (!el.screenLibrary.classList.contains('hidden')) renderCategories();
  if (autoplay) { goView('game'); play(); }
}

function flashHero(delta) {
  const slide = el.heroSlide;
  if (!slide || !slide.animate || reducedMotion()) return;
  slide.getAnimations?.().forEach((a) => a.cancel());
  slide.style.transform = ''; slide.style.opacity = '';
  const dir = delta >= 0 ? 1 : -1;
  slide.animate([{ opacity: 0, transform: `translateX(${30 * dir}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
}
async function stepSelection(delta) {
  if (!state.items.length) return;
  let idx = state.items.findIndex((i) => i.id === state.selectedId);
  if (idx < 0) idx = 0;
  idx = (idx + delta + state.items.length) % state.items.length;
  flashHero(delta);
  await selectItem(state.items[idx], false);
}

// ---------------------------------------------------------------------------
// Главная карточка
// ---------------------------------------------------------------------------
function computeDifficulty(song) {
  const dur = Math.max(1, song.duration || 1);
  const nps = song.notes.length / dur;
  let maxFret = 0, sumFret = 0;
  for (const n of song.notes) { maxFret = Math.max(maxFret, n.fret || 0); sumFret += n.fret || 0; }
  const avgFret = song.notes.length ? sumFret / song.notes.length : 0;
  let chordNotes = 0; const map = new Map();
  for (const n of song.notes) { const k = Math.round(n.t / 0.03); map.set(k, (map.get(k) || 0) + 1); }
  for (const v of map.values()) if (v > 1) chordNotes += v - 1;
  const chordRatio = song.notes.length ? chordNotes / song.notes.length : 0;
  let score = 1;
  score += clamp(nps / 2.8, 0, 3.0);
  score += clamp(avgFret / 12, 0, 0.9);
  score += clamp(maxFret / 22, 0, 0.6);
  score += chordRatio > 0.25 ? 0.8 : chordRatio > 0.1 ? 0.4 : 0;
  return clamp(Math.round(score), 1, 5);
}
function renderDifficulty(d) {
  el.heroDifficulty.innerHTML = '';
  el.heroDifficulty.setAttribute('aria-label', `Сложность ${d} из 5`);
  for (let i = 1; i <= 5; i++) { const dot = document.createElement('i'); if (i <= d) dot.className = 'on'; el.heroDifficulty.appendChild(dot); }
}
function drawTabPreview(song) {
  const c = el.tabPreview; const ctx = c.getContext('2d');
  const rect = c.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(200, Math.floor(rect.width || 320)); const h = Math.max(60, Math.floor(rect.height || 84));
  c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(document.body);
  const line = cs.getPropertyValue('--line').trim() || '#2c2c2c';
  const indigo = cs.getPropertyValue('--indigo').trim() || '#6366f1';
  const text2 = cs.getPropertyValue('--text-2').trim() || '#a3a3a3';
  ctx.clearRect(0, 0, w, h);
  const strings = song.stringCount || 6; const top = 12, bottom = h - 12, gap = (bottom - top) / (strings - 1);
  ctx.strokeStyle = line; ctx.lineWidth = 1;
  for (let s = 1; s <= strings; s++) { const y = top + (s - 1) * gap; ctx.beginPath(); ctx.moveTo(8, y + 0.5); ctx.lineTo(w - 8, y + 0.5); ctx.stroke(); }
  const notes = song.notes.slice(0, 40); const x0 = 16, x1 = w - 16; const step = notes.length > 1 ? (x1 - x0) / (notes.length - 1) : 0;
  ctx.fillStyle = indigo;
  notes.forEach((n, i) => { const x = notes.length > 1 ? x0 + i * step : (x0 + x1) / 2; const y = top + (n.string - 1) * gap; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = text2; ctx.font = '10px ui-monospace, Menlo, monospace';
  ctx.fillText(`+ ещё ${Math.max(0, song.notes.length - notes.length)}`, w - 70, h - 3);
}
function updateHero() {
  const song = state.song; if (!song) return;
  const item = currentItem();
  el.heroType.textContent = item && item.type === 'song' ? 'Песня' : 'Упражнение';
  el.heroTitle.textContent = song.title;
  const sub = song.artist && !/^упражнени/i.test(song.artist) ? song.artist : (song.trackName || '');
  el.heroArtist.textContent = sub;
  el.heroBpm.textContent = String(Math.round(song.bpm));
  el.heroDur.textContent = fmtTime(song.duration);
  el.heroNotes.textContent = String(song.notes.length);
  el.heroTuning.textContent = song.tuning.map((m) => midiToName(m, false)).join(' ');
  const best = item ? bestForItem(item) : null;
  el.heroBest.textContent = best != null ? Math.round(best * 100) + '%' : '—';
  renderDifficulty(computeDifficulty(song));
  drawTabPreview(song);
  const yt = item ? state.settings.youtube[item.id] : '';
  if (yt) { el.heroYt.href = yt; el.heroYt.classList.remove('hidden'); }
  else { el.heroYt.classList.add('hidden'); }
}

// ---------------------------------------------------------------------------
// Совет дня
// ---------------------------------------------------------------------------
function computeTip() {
  const p = state.profile;
  const frets = p.missByFret || {}; const strings = p.missByString || {};
  const topFret = Object.entries(frets).sort((a, b) => b[1] - a[1])[0];
  const topString = Object.entries(strings).sort((a, b) => b[1] - a[1])[0];
  if (!topFret && !topString) return null;
  let target = state.library.builtin[0]; let speed = 75;
  if (topFret) { const fret = Number(topFret[0]); target = fret >= 5 ? state.library.builtin[1] : state.library.builtin[0]; }
  if (topString) { const s = Number(topString[0]); if (s >= 4 && target === state.library.builtin[0]) target = state.library.builtin[1]; }
  speed = Number(topFret && topFret[1] > 20 ? 60 : 75);
  return { raw: target, title: target.title, speed };
}
function renderTip() {
  const tip = computeTip();
  if (!tip) {
    el.tipText.innerHTML = 'Пока нет истории. Начните с упражнения <b>«Разминка: хроматика»</b> на 75% — оно разогревает все струны.';
    el.btnTipApply.dataset.mode = 'beginner'; return;
  }
  const p = state.profile;
  const fret = Object.entries(p.missByFret || {}).sort((a, b) => b[1] - a[1])[0];
  const str = Object.entries(p.missByString || {}).sort((a, b) => b[1] - a[1])[0];
  const parts = [];
  if (fret) parts.push(`лад <b>${fret[0]}</b>`);
  if (str) parts.push(`струна <b>${str[0]}</b>`);
  el.tipText.innerHTML = `Чаще всего промахи по: ${parts.join(', ')}. Предлагаю <b>«${escapeHtml(tip.title)}»</b> на <b>${tip.speed}%</b>.`;
  el.btnTipApply.dataset.mode = 'tip';
}
function applyTip() {
  const mode = el.btnTipApply.dataset.mode;
  const tip = mode === 'tip' ? computeTip() : null;
  const raw = tip ? tip.raw : state.library.builtin[0];
  const speed = tip ? tip.speed : 75;
  const item = state.items.find((i) => i.raw === raw);
  if (item) { state.selectedId = item.id; loadRaw(raw); updateHero(); if (!el.screenLibrary.classList.contains('hidden')) renderCategories(); }
  setRate(speed / 100);
  goView('game');
  toast(`Совет применён: ${raw.title}, ${speed}%`, 'ok');
}

// ---------------------------------------------------------------------------
// Загрузка песни
// ---------------------------------------------------------------------------
function loadRaw(raw) {
  state.raw = raw; state.trackIndex = pickDefaultTrack(raw);
  state.loopA = null; state.loopB = null;
  buildCurrentSong(); buildTrackPicker(); updateLoopMarkers();
}
function pickDefaultTrack(raw) {
  const tracks = raw.tracks || []; let best = -1, bestCount = -1;
  for (let i = 0; i < tracks.length; i++) { const t = tracks[i]; if (t.percussion) continue; const c = (t.notes || []).length; if (c > bestCount) { bestCount = c; best = i; } }
  return best < 0 ? 0 : best;
}
function buildCurrentSong() {
  const song = buildSong(state.raw, state.trackIndex);
  state.song = song;
  state.game = new Game(song);
  state.game.autoplay = state.settings.autoplay;
  resetPlayback(); applySongUi();
}
function applySongUi() {
  const song = state.song;
  el.songTitle.textContent = song.title + (song.artist ? ' — ' + song.artist : '');
  const tuning = song.tuning.map((m) => midiToName(m, false)).join(' ');
  el.songMeta.textContent = `${song.notes.length} нот · ${fmtTime(song.duration)} · ${Math.round(song.bpm)} BPM · ${tuning}${song.trackName ? ' · ' + song.trackName : ''}`;
  el.btnPlay.disabled = false; el.btnRestart.disabled = false;
  el.progressBar.value = 0; el.timeReadout.textContent = `0:00 / ${fmtTime(song.duration)}`;
  updateSpeedUi(); updateLoopMarkers(); updateHud();
}
function buildTrackPicker() {
  const tracks = state.raw.tracks || [];
  const playable = tracks.map((t, i) => ({ t, i })).filter((x) => !x.t.percussion && (x.t.notes || []).length);
  if (playable.length <= 1) { el.trackPicker.classList.add('hidden'); el.trackSelect.innerHTML = ''; return; }
  el.trackPicker.classList.remove('hidden'); el.trackSelect.innerHTML = '';
  for (const { t, i } of playable) { const opt = document.createElement('option'); opt.value = String(i); opt.textContent = `${t.name || 'Дорожка ' + (i + 1)} — ${(t.notes || []).length} нот`; if (i === state.trackIndex) opt.selected = true; el.trackSelect.appendChild(opt); }
}
async function loadFile(file) {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const raw = await parseBytes(bytes, file.name);
    state.library.builtin.unshift(raw);
    buildItems();
    const item = state.items.find((i) => i.raw === raw);
    if (item) { item.difficulty = difficultyForRaw(raw); state.selectedId = item.id; const rec = state.settings.recent.filter((id) => id !== item.id); rec.unshift(item.id); state.settings.recent = rec; saveSettings(); }
    loadRaw(raw);
    goView('game');
    toast(`Открыто: ${raw.title}`, 'ok');
  } catch (e) { console.error(e); toast('Ошибка импорта: ' + e.message, 'err', 6000); }
}
async function loadCatalogUrl() {
  const url = el.catalogUrl.value.trim(); if (!url) return;
  el.catalogStatus.textContent = 'Загрузка…';
  try { const cat = await loadCatalogFromUrl(url); state.library.catalog = cat; buildItems(); renderCategories(); renderTip(); el.catalogStatus.textContent = `Загружено: ${cat.songs.length}`; toast('Каталог загружен', 'ok'); }
  catch (e) { el.catalogStatus.textContent = ''; toast('Каталог: ' + e.message, 'err', 6000); }
}
async function loadCatalogFile(file) {
  el.catalogStatus.textContent = 'Загрузка…';
  try { const cat = await loadCatalogFromFile(file); state.library.catalog = cat; buildItems(); renderCategories(); renderTip(); el.catalogStatus.textContent = `Загружено: ${cat.songs.length}`; toast('Каталог загружен', 'ok'); }
  catch (e) { el.catalogStatus.textContent = ''; toast('Каталог: ' + e.message, 'err', 6000); }
}

// ---------------------------------------------------------------------------
// Профиль
// ---------------------------------------------------------------------------
function renderErrBars(container, obj, labeler) {
  const entries = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  container.innerHTML = '';
  if (!entries.length) { container.innerHTML = '<div class="muted small">Пока нет данных</div>'; return; }
  const max = entries[0][1] || 1;
  for (const [k, v] of entries) {
    const row = document.createElement('div'); row.className = 'errbar';
    row.innerHTML = `<span>${escapeHtml(labeler(k))}</span><span class="errbar__track"><span class="errbar__fill"></span></span><span class="errbar__v">${v}</span>`;
    container.appendChild(row);
    row.querySelector('.errbar__fill').style.width = Math.round((v / max) * 100) + '%';
  }
}
function renderProfile() {
  const p = state.profile;
  el.profileName.value = p.name || '';
  el.profileStats.innerHTML = [['Практика', fmtDuration(p.practiceSec)], ['Точность', Math.round(accuracyOf(p) * 100) + '%'], ['Ноты', String(p.notesHit)], ['Серия', streak(p) + ' дн.'], ['Сессий', String(p.sessions)], ['Песен', String(Object.keys(p.songs).length)]]
    .map(([k, v]) => `<div class="m"><b>${v}</b><span>${k}</span></div>`).join('');
  renderErrBars(el.profileErrStrings, p.missByString, (k) => 'Струна ' + k);
  const rows = Object.values(p.songs).sort((a, b) => b.lastPlayed - a.lastPlayed);
  el.profileSongs.innerHTML = rows.length ? rows.slice(0, 20).map((s) => `<div class="tr"><span>${escapeHtml(s.title)}</span><span class="v">${s.plays}×</span><span class="v">${s.bestScore}</span><span class="v">${Math.round(s.bestAccuracy * 100)}%</span></div>`).join('') : '<div class="muted small">Пока нет сыгранных песен</div>';
}
function flushPractice() { if (state.practiceBuffer <= 0.5) return; state.profile.practiceSec += state.practiceBuffer; state.practiceBuffer = 0; saveProfile(state.profile); if (!el.screenProfile.classList.contains('hidden')) renderProfile(); }
function exportProfile() {
  const blob = new Blob([JSON.stringify(state.profile, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'riff-hero-profile.json'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Профиль выгружен', 'ok');
}
async function importProfile(file) {
  try { state.profile = normalizeProfile(JSON.parse(await file.text())); saveProfile(state.profile); renderProfile(); renderTip(); toast('Профиль загружен', 'ok'); }
  catch (e) { toast('Профиль: ' + e.message, 'err', 6000); }
}

// ---------------------------------------------------------------------------
// A/B повтор
// ---------------------------------------------------------------------------
function loopActive() {
  if (state.loopA == null || state.loopB == null) return false;
  if (state.loopB <= state.loopA + 0.2) return false;
  if (state.song && state.loopB > state.song.duration + 0.05) return false;
  return true;
}
function currentTime() { if (!state.song) return 0; const t = state.playing ? (state.paused ? state.pauseSong : computeSongTime()) : state.startSong; return clamp(t, 0, state.song.duration); }
function setLoopA() { if (!state.song) return; state.loopA = currentTime(); if (state.loopB != null && state.loopB <= state.loopA + 0.2) state.loopB = null; updateLoopMarkers(); toast('Точка A: ' + fmtTime(state.loopA)); }
function setLoopB() { if (!state.song) return; const t = currentTime(); if (state.loopA == null) state.loopA = 0; if (t <= state.loopA + 0.2) { toast('Точка B должна быть позже A', 'err'); return; } state.loopB = t; updateLoopMarkers(); toast(`Зацикливание: ${fmtTime(state.loopA)} – ${fmtTime(state.loopB)}`); }
function clearLoop() { state.loopA = null; state.loopB = null; updateLoopMarkers(); }
function updateLoopMarkers() {
  const dur = (state.song && state.song.duration) || 0;
  const range = el.loopMarkers.querySelector('.range'); const a = el.loopMarkers.querySelector('.lm-a'); const b = el.loopMarkers.querySelector('.lm-b');
  if (!range || !a || !b) return;
  const showA = state.loopA != null && dur > 0; const showB = state.loopB != null && dur > 0;
  a.style.display = showA ? 'block' : 'none'; b.style.display = showB ? 'block' : 'none';
  if (showA) a.style.left = (state.loopA / dur) * 100 + '%';
  if (showB) b.style.left = (state.loopB / dur) * 100 + '%';
  const showR = loopActive() && dur > 0;
  range.style.display = showR ? 'block' : 'none';
  if (showR) { range.style.left = (state.loopA / dur) * 100 + '%'; range.style.width = ((state.loopB - state.loopA) / dur) * 100 + '%'; }
  el.btnLoopA.setAttribute('aria-pressed', showA ? 'true' : 'false'); el.btnLoopB.setAttribute('aria-pressed', showB ? 'true' : 'false');
  el.btnLoopClear.classList.toggle('is-active', showA || showB);
  if (el.loopBadge) el.loopBadge.classList.toggle('hidden', !showR);
}

// ---------------------------------------------------------------------------
// Воспроизведение
// ---------------------------------------------------------------------------
function computeSongTime() { if (!state.playing) return state.startSong; if (state.paused) return state.pauseSong; return state.startSong + (audio.now - state.startCtx) * state.rate; }
function setRate(rate) {
  state.settings.rate = rate; saveSettings(); updateSpeedUi();
  if (state.playing && !state.paused) { const cur = computeSongTime(); state.rate = rate; state.startSong = cur; state.startCtx = audio.now; state.schedulePtr = firstNoteIndex(cur - 0.05); state.metroPtr = firstBeatIndex(cur - 0.05); audio.stopAll(); }
  else state.rate = rate;
}
function resetPlayback() {
  audio.stopAll(); releaseWakeLock(); flushPractice();
  state.playing = false; state.paused = false; state.startSong = 0; state.pauseSong = 0;
  state.schedulePtr = 0; state.metroPtr = 0; state.detected = null; state.sessionPractice = 0;
  if (state.song) state.game.reset();
  updatePlayButton(); updateHud();
}
function firstNoteIndex(t) { return lowerBound(state.song.notes, t); }
function firstBeatIndex(t) { return lowerBound(state.song.grid.beats, t); }
async function play() {
  if (!state.song) return;
  await audio.ensure();
  audio.setGuideVolume(state.settings.guideVol / 100);
  audio.setMetroVolume(state.settings.metroVol / 100);
  if (currentView() !== 'game') goView('game');
  if (state.playing && !state.paused) return;
  if (state.playing && state.paused) { state.paused = false; state.startCtx = audio.now; state.startSong = state.pauseSong; state.schedulePtr = firstNoteIndex(state.startSong - 0.05); state.metroPtr = firstBeatIndex(state.startSong - 0.05); }
  else startFrom(0);
  updatePlayButton();
  if (!audio.micReady && !state.settings.autoplay) toast('Включите микрофон или автоигру, чтобы ноты засчитывались');
}
function startFrom(pos, noCountIn) {
  audio.stopAll(); flushPractice();
  state.playing = true; state.paused = false;
  state.startSong = pos; state.pauseSong = pos;
  state.schedulePtr = firstNoteIndex(pos - 0.05); state.metroPtr = firstBeatIndex(pos - 0.05);
  state.sessionPractice = pos > 0 ? state.sessionPractice : 0;
  state.game.rewind(pos);
  const beat = 60 / (state.song.bpm || 120); let lead = 0;
  if (state.settings.countIn && pos === 0 && !noCountIn) { lead = (4 * beat) / state.rate; const t0 = audio.now + 0.08; for (let k = 0; k < 4; k++) audio.click(t0 + (k * beat) / state.rate, k === 0); }
  state.startCtx = audio.now + lead;
  requestWakeLock();
  updatePlayButton();
}
function pause() { if (!state.playing || state.paused) return; state.pauseSong = computeSongTime(); state.paused = true; audio.stopAll(); flushPractice(); releaseWakeLock(); updatePlayButton(); }
function togglePlay() { if (!state.song) return; if (!state.playing || state.paused) play(); else pause(); }
function restart() { if (!state.song) return; if (!el.resultsOverlay.classList.contains('hidden')) goBack(); clearLoop(); state.game.reset(); startFrom(0); }
function seekBy(delta) { if (!state.song) return; const pos = clamp(currentTime() + delta, 0, state.song.duration); if (state.playing && !state.paused) startFrom(pos, true); else { state.startSong = pos; state.pauseSong = pos; state.game.rewind(pos); updateHud(pos); } }
function scheduleAhead() {
  const song = state.song; const songTime = computeSongTime(); const horizon = songTime + 1.0 * state.rate; const guideVol = state.settings.guideVol / 100;
  while (state.schedulePtr < song.notes.length) {
    const n = song.notes[state.schedulePtr]; if (n.t > horizon) break;
    if (n.t >= state.startSong - 0.001) { const when = state.startCtx + (n.t - state.startSong) / state.rate; if (when > audio.now - 0.05 && guideVol > 0.001) audio.playNote(n.midi, when, Math.max(0.1, n.dur / state.rate), 0.75 * (n.velocity || 0.8)); }
    state.schedulePtr++;
  }
  if (state.settings.metronome) {
    const beats = song.grid.beats;
    while (state.metroPtr < beats.length) { const b = beats[state.metroPtr]; if (b.t > horizon) break; if (b.t >= state.startSong - 0.001) { const when = state.startCtx + (b.t - state.startSong) / state.rate; if (when > audio.now - 0.02) audio.click(when, b.bar); } state.metroPtr++; }
  }
}

// ---------------------------------------------------------------------------
// Игровой цикл
// ---------------------------------------------------------------------------
function frame() { try { frameStep(); } catch (e) { if (!state.frameErrorLogged) { state.frameErrorLogged = true; console.error('Ошибка кадра:', e); } } requestAnimationFrame(frame); }
function frameStep() {
  const nowMs = performance.now();
  const realDt = state.lastFrame ? Math.min(1, (nowMs - state.lastFrame) / 1000) : 0;
  state.lastFrame = nowMs;
  const playingNow = state.playing && !state.paused;
  if (state.playingFlag !== playingNow) {
    state.playingFlag = playingNow;
    document.body.classList.toggle('is-playing', playingNow);
    if (playingNow) { el.tabbar.classList.add('hidden'); el.screenHome.classList.add('hidden'); el.screenLibrary.classList.add('hidden'); el.screenProfile.classList.add('hidden'); }
    else if (currentView() !== 'game') { showScreen(currentView()); }
  }
  let songTime = state.playing ? (state.paused ? state.pauseSong : computeSongTime()) : state.startSong;
  if (state.playing && !state.paused && loopActive() && songTime >= state.loopB) { startFrom(state.loopA, true); songTime = state.loopA; }
  if (state.playing && !state.paused) {
    state.sessionPractice += realDt; state.practiceBuffer += realDt;
    if (state.practiceBuffer > 5) flushPractice();
    if (songTime >= -0.001) scheduleAhead();
    state.game.update(songTime - state.latencySec, state.detected);
    if (state.game.finished || songTime > state.song.duration + 2.5) onFinish();
  }
  let countIn = null;
  if (state.playing && !state.paused && songTime < -0.001) { const beatLen = 60 / (state.song.bpm || 120); countIn = Math.max(1, Math.min(4, Math.ceil((-songTime) / beatLen))); }
  renderer.render({ song: state.song, game: state.game, songTime, pxPerSec: 230, detected: state.detected, showFret: state.settings.showFret, showFinger: state.settings.showFinger, orientation: state.settings.orientation, countIn });
  updateHud(songTime); updateMicStatus(); updateWizardLive();
}
function updateHud(songTime) {
  if (!state.song) return;
  const g = state.game;
  el.score.textContent = String(g.score); el.combo.textContent = String(g.combo);
  el.accuracy.textContent = Math.round(g.accuracy * 100) + '%';
  const dur = state.song.duration || 1; const t = songTime == null ? 0 : songTime;
  if (!state.seeking) { el.progressBar.value = Math.max(0, Math.min(1000, Math.round((t / dur) * 1000))); el.timeReadout.textContent = `${fmtTime(t)} / ${fmtTime(dur)}`; }
  const d = state.detected;
  if (d && Number.isFinite(d.midi) && d.clarity > 0.45) { const cents = Math.round((d.midi - Math.round(d.midi)) * 100); el.pitchNote.firstChild.textContent = midiToName(d.midi) + ' '; el.pitchCents.textContent = (cents > 0 ? '+' : '') + cents + '¢'; }
  else if (audio.micReady) { el.pitchNote.firstChild.textContent = '— '; el.pitchCents.textContent = ''; }
  el.feedback.dataset.state = ''; let fb = '';
  if (audio.micReady && state.song) {
    const jt = t - state.latencySec; const ng = nearestGroup(jt);
    if (ng && Math.abs(ng.t - jt) <= 0.7) {
      fb = 'Ждём: ' + ng.notes.map((n) => `${midiToName(n.midi)} (лад ${n.fret}${n.finger > 0 ? ', палец ' + n.finger : ''})`).join(' · ');
      if (d && Number.isFinite(d.midi) && d.clarity > 0.45) {
        const cents = Math.round((d.midi - Math.round(d.midi)) * 100);
        const ok = (d.heard && ng.notes.some((n) => d.heard.has(Math.round(n.midi)))) || ng.notes.some((n) => Math.abs(n.midi - d.midi) < 0.7);
        fb += ` · слышу: ${midiToName(d.midi)} ${(cents > 0 ? '+' : '') + cents}¢` + (ok ? '' : ' — не та нота');
        el.feedback.dataset.state = ok ? 'ok' : 'warn';
      } else fb += ' · тишина';
    }
  }
  el.feedback.textContent = fb;
  updateLoopMarkers();
}
function nearestGroup(now) {
  const g = state.game; if (!g) return null;
  let best = null, bd = Infinity;
  for (let i = g.pointer; i < g.groups.length; i++) { const grp = g.groups[i]; if (grp.t - now > 0.8) break; if (grp.judged) continue; const dt = Math.abs(grp.t - now); if (dt < bd) { bd = dt; best = grp; } }
  return best;
}
function updateMicStatus() {
  const d = state.detected; const rms = d && Number.isFinite(d.rms) ? d.rms : 0; const gate = pitch.rmsGate || 0.006;
  let stateName = 'off', text = 'Микрофон выключен';
  if (audio.micReady) { if (rms >= gate * 2) { stateName = 'signal'; text = 'Слышу сигнал'; } else { stateName = 'ready'; text = 'Микрофон готов'; } }
  if (el.micStatus.dataset.state !== stateName) { el.micStatus.dataset.state = stateName; el.micText.textContent = text; el.micStatus.setAttribute('aria-label', text + '. ' + (audio.micReady ? 'Выключить микрофон' : 'Включить микрофон')); }
  el.micLevelBar.style.width = clamp((rms / (gate * 8)) * 100, 0, 100) + '%';
  if (state.wizardActive && state.wizardStep === 2) { el.wizLevelBar.style.width = clamp((rms / (gate * 8)) * 100, 0, 100) + '%'; el.wizLevelHint.textContent = rms >= gate * 2 ? 'Сигнал есть' : (rms >= gate ? 'Слабый сигнал' : 'Тишина'); }
  if (state.wizardActive && state.wizardStep === 3) { if (d && Number.isFinite(d.midi) && d.clarity > 0.5) el.wizTuneNote.textContent = midiToName(d.midi); else el.wizTuneNote.textContent = '—'; }
}
function onFinish() {
  if (!state.playing) return;
  const t = computeSongTime();
  state.playing = false; state.paused = false;
  state.startSong = Math.max(0, Math.min(t, state.song.duration)); state.pauseSong = state.startSong;
  audio.stopAll(); releaseWakeLock(); flushPractice();
  const g = state.game; const song = state.song;
  const key = `${song.title}|${song.artist}|${song.trackName}`.toLowerCase();
  state.lastErrors = { byString: { ...g.missByString }, byFret: { ...g.missByFret } };
  recordSession(state.profile, { key, title: song.title + (song.trackName ? ' · ' + song.trackName : ''), score: g.score, accuracy: g.accuracy, maxCombo: g.maxCombo, hits: g.hits, misses: g.misses, missByString: g.missByString, missByFret: g.missByFret });
  saveProfile(state.profile); updatePlayButton(); showResults(); renderTip();
  if (currentView() === 'game') showScreen('game');
}
function showResults() {
  const g = state.game; const acc = Math.round(g.accuracy * 100);
  const grade = acc >= 98 ? 'S' : acc >= 92 ? 'A' : acc >= 82 ? 'B' : acc >= 70 ? 'C' : acc >= 55 ? 'D' : 'E';
  el.resultsTitle.textContent = 'Результат — ' + state.song.title;
  el.resultGrid.innerHTML = [['Оценка', grade], ['Точность', acc + '%'], ['Промахи', String(g.misses)], ['Серия', String(g.maxCombo)], ['Очки', String(g.score)], ['Попадания', String(g.hits)]].map(([k, v]) => `<div class="m"><b>${v}</b><span>${k}</span></div>`).join('');
  const byString = Object.entries(g.missByString).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `струна ${k}×${v}`).join(' · ');
  const byFret = Object.entries(g.missByFret).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `лад ${k}×${v}`).join(' · ');
  const parts = [byString, byFret].filter(Boolean);
  el.resultErrors.textContent = parts.length ? 'Ошибки: ' + parts.join(' · ') : 'Без ошибок';
  el.btnPracticeWeak.disabled = !(g.misses > 0 && parts.length > 0);
  openModal('results');
}
function practiceWeak() {
  const g = state.game;
  const fretEntry = Object.entries(g.missByFret || {}).sort((a, b) => b[1] - a[1])[0];
  const strEntry = Object.entries(g.missByString || {}).sort((a, b) => b[1] - a[1])[0];
  const targetFret = fretEntry ? Number(fretEntry[0]) : null; const targetStr = strEntry ? Number(strEntry[0]) : null;
  let note = state.song.notes.find((n) => (targetFret != null && n.fret === targetFret) || (targetStr != null && n.string === targetStr));
  if (!note) note = state.song.notes[0];
  const a = clamp(note.t - 1.5, 0, state.song.duration); const b = clamp(note.t + 3.0, 0, state.song.duration);
  state.loopA = a; state.loopB = b; setRate(0.75);
  if (!el.resultsOverlay.classList.contains('hidden')) goBack();
  startFrom(a, true); updateLoopMarkers();
  toast(`Отработка: лад ${targetFret != null ? targetFret : '—'}, струна ${targetStr != null ? targetStr : '—'} · 75%`, 'ok', 5000);
}
function updatePlayButton() { el.btnPlay.textContent = (!state.playing || state.paused) ? 'Играть' : 'Пауза'; }

// ---------------------------------------------------------------------------
// Микрофон и устройства
// ---------------------------------------------------------------------------
async function toggleMic() {
  if (audio.micReady) { audio.disableMic(); el.micStatus.dataset.state = 'off'; el.micText.textContent = 'Микрофон выключен'; el.micLevelBar.style.width = '0%'; el.pitchNote.firstChild.textContent = '— '; el.pitchCents.textContent = ''; toast('Микрофон выключен'); return true; }
  try { await audio.enableMic(state.settings.micDeviceId || undefined); pitch.setSampleRate(audio.ctx.sampleRate); el.micStatus.dataset.state = 'ready'; el.micText.textContent = 'Микрофон готов'; toast('Микрофон включён', 'ok'); refreshDevices(); return true; }
  catch (e) { el.micStatus.dataset.state = 'denied'; el.micText.textContent = 'Нет доступа'; toast('Микрофон недоступен: ' + e.message, 'err', 6000); return false; }
}
function fillSelect(sel, items, defaultLabel, value) {
  sel.innerHTML = ''; const def = document.createElement('option'); def.value = ''; def.textContent = defaultLabel; sel.appendChild(def);
  for (const d of items) { const o = document.createElement('option'); o.value = d.id; o.textContent = d.label; sel.appendChild(o); }
  sel.value = value || '';
}
async function refreshDevices() {
  if (!el.micSelect) return;
  let info = { inputs: [], outputs: [], canSelectOutput: false };
  try { info = await audio.listDevices(); } catch { /* noop */ }
  fillSelect(el.micSelect, info.inputs, 'Микрофон по умолчанию', state.settings.micDeviceId);
  if (info.canSelectOutput) { fillSelect(el.outputSelect, info.outputs, 'Вывод по умолчанию', state.settings.outputDeviceId); el.outputSelect.disabled = false; }
  else { el.outputSelect.innerHTML = '<option value="">Не поддерживается браузером</option>'; el.outputSelect.disabled = true; }
  el.deviceHint.textContent = !audio.micReady ? 'Включите микрофон, чтобы увидеть названия устройств.' : '';
}

// ---------------------------------------------------------------------------
// Автокалибровка
// ---------------------------------------------------------------------------
async function measureLatency() {
  await audio.ensure();
  if (!audio.micReady) throw new Error('сначала включите микрофон');
  const prevGain = audio.metro.gain.value; audio.metro.gain.value = 0.85;
  try {
    const t0 = audio.now + 0.4; const gap = 0.7, count = 3;
    for (let k = 0; k < count; k++) audio.click(t0 + k * gap, false);
    const samples = []; const endT = t0 + (count - 1) * gap + 0.5;
    while (audio.now < endT) { const data = audio.getTimeData(); if (data) samples.push({ t: audio.now, rms: rmsOf(data) }); await sleep(8); }
    const offsets = [];
    for (let k = 0; k < count; k++) { const exp = t0 + k * gap; let best = null; for (const s of samples) if (s.t >= exp - 0.02 && s.t <= exp + 0.5) if (!best || s.rms > best.rms) best = s; if (best && best.rms > 0.02) offsets.push(best.t - exp); }
    if (!offsets.length) throw new Error('клики не слышны — проверьте звук и микрофон');
    offsets.sort((a, b) => a - b);
    const median = offsets[Math.floor(offsets.length / 2)]; const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
    const spread = Math.sqrt(offsets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / offsets.length);
    return { offsets: offsets.map((o) => Math.round(o * 1000)), median: clamp(Math.round(median * 1000), -150, 300), spread: Math.round(spread * 1000) };
  } finally { audio.metro.gain.value = prevGain; }
}
async function autoCalibrateLatency() { const r = await measureLatency(); return r.median; }
async function verifyLatency() {
  const r = await measureLatency(); renderLatencyVerify(r);
  state.settings.latency = r.median; state.latencySec = r.median / 1000; saveSettings();
  el.latency.value = String(r.median); el.latencyVal.textContent = r.median + ' мс'; return r;
}
function renderLatencyVerify(r) {
  const maxAbs = Math.max(1, ...r.offsets.map((o) => Math.abs(o)));
  const bars = r.offsets.map((o) => `<span class="verify__bar${o < 0 ? ' neg' : ''}" style="height:${Math.max(8, Math.round((Math.abs(o) / maxAbs) * 40))}px" title="${o} мс"></span>`).join('');
  const verdict = r.spread <= 15 ? 'стабильно' : r.spread <= 30 ? 'средне' : 'нестабильно';
  el.latencyVerify.innerHTML = `<div class="verify__bars">${bars}</div><div class="verify__summary">Клики: ${r.offsets.join(', ')} мс · медиана ${r.median} мс · разброс ±${r.spread} мс (${verdict})</div>`;
}

// ---------------------------------------------------------------------------
// Guided-детекция
// ---------------------------------------------------------------------------
function collectCandidates(now) {
  const g = state.game; if (!g) return [];
  const { early, late } = g.opts; const set = new Set();
  for (let i = g.pointer; i < g.groups.length; i++) { const grp = g.groups[i]; if (grp.t - early > now) break; if (grp.judged) continue; if (now - grp.t > late) continue; for (const n of grp.notes) { if (n.dead) continue; const m = Math.round(n.midi); set.add(m); set.add(m - 12); set.add(m + 12); } if (set.size >= 30) break; }
  return [...set].filter((m) => m >= 24 && m <= 96);
}
function detectionTick() {
  if (!audio.micReady) { state.detected = null; return; }
  const data = audio.getTimeData(); if (!data) return;
  const d = pitch.detect(data) || { freq: 0, midi: NaN, clarity: 0, rms: 0 };
  const now = (state.playing ? (state.paused ? state.pauseSong : computeSongTime()) : state.startSong) - state.latencySec;
  const cand = collectCandidates(now);
  if (cand.length && d.rms >= pitch.rmsGate * 0.6) {
    const res = spectral.analyze(data, cand);
    if (res && res.rms >= pitch.rmsGate * 0.6 && res.max > 0.0008) {
      const thr = Math.max(res.max * 0.45, 0.001); const heard = new Set();
      cand.forEach((m, i) => { if (res.scores[i] >= thr) heard.add(m); });
      if (heard.size) d.heard = heard;
    }
  }
  state.detected = d;
}

// ---------------------------------------------------------------------------
// Мастер
// ---------------------------------------------------------------------------
function renderWizard() {
  const s = state.wizardStep;
  el.wizPane1.classList.toggle('hidden', s !== 1); el.wizPane2.classList.toggle('hidden', s !== 2); el.wizPane3.classList.toggle('hidden', s !== 3);
  document.querySelectorAll('#wizardOverlay .steps i').forEach((d, i) => d.classList.toggle('on', i < s));
  el.wizPrev.disabled = s === 1; el.wizNext.textContent = s === 3 ? 'Готово' : 'Далее';
  el.wizMicState.textContent = audio.micReady ? 'Доступ есть' : '';
}
function openWizard() { state.wizardActive = true; state.wizardStep = 1; renderWizard(); el.wizCalState.textContent = ''; openModal('wizard'); }
function finishWizard() { state.wizardActive = false; state.settings.onboarded = true; saveSettings(); goView('library'); }
async function wizardNext() {
  if (state.wizardStep === 1 && !audio.micReady) { await toggleMic(); state.wizardStep = 2; renderWizard(); return; }
  if (state.wizardStep < 3) { state.wizardStep += 1; renderWizard(); } else finishWizard();
}
function updateWizardLive() { /* экраны мастера обновляются в updateMicStatus */ }

// ---------------------------------------------------------------------------
// YouTube → аккорды
// ---------------------------------------------------------------------------
function youtubeId(url) {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : '';
}
async function resolveYoutube(url) {
  let title = '';
  try { const res = await fetch('https://noembed.com/embed?url=' + encodeURIComponent(url)); if (res.ok) { const j = await res.json(); title = (j && j.title) || ''; } } catch { /* noembed может быть недоступен */ }
  return title;
}
function chordsSearchUrl(q) { return 'https://www.google.com/search?q=' + encodeURIComponent(q + ' аккорды'); }
async function doYoutubeResolve(inputEl) {
  const url = (inputEl.value || '').trim();
  if (!youtubeId(url)) { el.ytPreview.textContent = 'Не похоже на ссылку YouTube.'; return; }
  el.ytPreview.textContent = 'Определяю название…';
  const title = await resolveYoutube(url);
  const query = title || 'гитара';
  el.ytPreview.innerHTML = title ? `Найдено: <b>${escapeHtml(title)}</b>` : 'Название определить не удалось — откроем поиск по ссылке.';
  el.ytOpenChords.href = chordsSearchUrl(title || url);
  el.ytOpenChords.hidden = false;
  el.ytOpenVideo.href = url; el.ytOpenVideo.hidden = false;
  el.btnYtAttach.hidden = false;
  el.btnYtAttach.dataset.url = url;
  el.ytStatus.textContent = '';
  return { url, title, query };
}
function attachYoutube(url) {
  const item = currentItem();
  if (!item) { toast('Сначала выберите занятие', 'err'); return; }
  state.settings.youtube[item.id] = url; saveSettings(); updateHero();
  toast('Ссылка прикреплена к «' + item.title + '»', 'ok');
  goBack();
}

// ---------------------------------------------------------------------------
// События
// ---------------------------------------------------------------------------
function bindEvents() {
  el.btnPlay.addEventListener('click', togglePlay);
  el.btnRestart.addEventListener('click', restart);
  el.btnLoopA.addEventListener('click', setLoopA);
  el.btnLoopB.addEventListener('click', setLoopB);
  el.btnLoopClear.addEventListener('click', clearLoop);
  el.btnAgain.addEventListener('click', restart);
  el.btnPlaySelected.addEventListener('click', play);
  el.btnGoLibrary.addEventListener('click', () => goView('library'));
  el.btnResultsLibrary.addEventListener('click', () => { resetPlayback(); goView('library'); });
  el.btnResultsClose.addEventListener('click', () => goBack());
  el.btnPracticeWeak.addEventListener('click', practiceWeak);

  for (const b of el.tabbar.querySelectorAll('.tab')) b.addEventListener('click', () => goView(b.dataset.view));
  document.querySelector('.brand').addEventListener('click', () => goView('home'));

  el.btnOrient.addEventListener('click', toggleOrientation);
  el.btnFinger.addEventListener('click', toggleFinger);

  // тема и раскладка
  el.themeSeg.addEventListener('click', (e) => { const b = e.target.closest('button[data-theme]'); if (!b) return; state.theme = b.dataset.theme; localStorage.setItem('riffhero.theme', state.theme); applyTheme(); });
  el.layoutSeg.addEventListener('click', (e) => { const b = e.target.closest('button[data-layout]'); if (!b) return; state.layoutPref = b.dataset.layout; localStorage.setItem('riffhero.layout', state.layoutPref); applyLayout(); });

  // тумблеры
  for (const [node, key] of [[el.metronome, 'metronome'], [el.countIn, 'countIn'], [el.showFret, 'showFret'], [el.showFinger, 'showFinger']]) {
    node.addEventListener('click', () => { state.settings[key] = !state.settings[key]; saveSettings(); applySettingsToUi(); });
  }
  el.autoplaySwitch.addEventListener('click', toggleAutoplay);

  // меню
  el.btnMenu.addEventListener('click', () => { const open = el.menuPopover.classList.toggle('hidden') === false; el.btnMenu.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  document.addEventListener('click', (e) => { if (!el.menuPopover.contains(e.target) && !el.btnMenu.contains(e.target)) { el.menuPopover.classList.add('hidden'); el.btnMenu.setAttribute('aria-expanded', 'false'); } });
  el.menuAutoplay.addEventListener('click', () => { el.menuPopover.classList.add('hidden'); toggleAutoplay(); });
  el.menuWizard.addEventListener('click', () => { el.menuPopover.classList.add('hidden'); openWizard(); });
  el.menuAbout.addEventListener('click', () => { el.menuPopover.classList.add('hidden'); goView('home'); });

  // микрофон/звук
  el.micStatus.addEventListener('click', toggleMic);
  el.btnSound.addEventListener('click', () => { refreshDevices(); openModal('advanced'); });
  el.btnSoundHome.addEventListener('click', () => { refreshDevices(); openModal('advanced'); });
  el.btnWizardHome.addEventListener('click', openWizard);
  el.btnAdvancedClose.addEventListener('click', () => goBack());
  el.btnRefreshDevices.addEventListener('click', refreshDevices);
  el.micSelect.addEventListener('change', async () => { state.settings.micDeviceId = el.micSelect.value; saveSettings(); if (audio.micReady) { try { await audio.enableMic(state.settings.micDeviceId || undefined); pitch.setSampleRate(audio.ctx.sampleRate); toast('Микрофон переключён', 'ok'); refreshDevices(); } catch (e) { toast('Не удалось переключить: ' + e.message, 'err', 6000); } } });
  el.outputSelect.addEventListener('change', async () => { state.settings.outputDeviceId = el.outputSelect.value; saveSettings(); try { await audio.setOutputDevice(state.settings.outputDeviceId || ''); toast('Вывод переключён', 'ok'); } catch (e) { toast('Вывод: ' + e.message, 'err', 6000); } });

  // темп
  el.speed.addEventListener('input', () => setBpm(Number(el.speed.value)));
  el.speedChips.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; setRate(Number(b.dataset.speed) / 100); });
  el.speedPopRange.addEventListener('input', () => setBpm(Number(el.speedPopRange.value)));
  el.speedPop.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => setRate(Number(c.dataset.speed) / 100)));
  el.btnSpeedQuick.addEventListener('click', (e) => { e.stopPropagation(); const open = el.speedPop.classList.toggle('hidden') === false; el.btnSpeedQuick.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  document.addEventListener('click', (e) => { if (el.speedPop.classList.contains('hidden')) return; if (!el.speedPop.contains(e.target) && !el.btnSpeedQuick.contains(e.target)) { el.speedPop.classList.add('hidden'); el.btnSpeedQuick.setAttribute('aria-expanded', 'false'); } });

  // совет
  el.btnTipApply.addEventListener('click', applyTip);

  // импорт
  el.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); el.dropZone.classList.add('is-over'); });
  el.dropZone.addEventListener('dragleave', () => el.dropZone.classList.remove('is-over'));
  el.dropZone.addEventListener('drop', (e) => { e.preventDefault(); el.dropZone.classList.remove('is-over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadFile(f); });
  el.fileInput.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) loadFile(f); e.target.value = ''; });
  el.btnCatalogLink.addEventListener('click', () => openModal('catalog'));
  el.btnCatalogClose.addEventListener('click', () => goBack());
  el.btnCatalogLoad.addEventListener('click', loadCatalogUrl);
  el.catalogUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadCatalogUrl(); });
  el.catalogFileInput.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) loadCatalogFile(f); e.target.value = ''; });
  el.trackSelect.addEventListener('change', () => { state.trackIndex = parseInt(el.trackSelect.value, 10) || 0; const wasPlaying = state.playing && !state.paused; buildCurrentSong(); updateHero(); if (wasPlaying) startFrom(0); });

  // YouTube
  el.btnYoutube.addEventListener('click', () => { openModal('youtube'); if (el.ytUrl.value) el.ytUrl2.value = el.ytUrl.value; });
  el.btnYoutubeClose.addEventListener('click', () => goBack());
  el.btnYtResolve.addEventListener('click', () => doYoutubeResolve(el.ytUrl2));
  el.btnYtAttach.addEventListener('click', () => { const url = el.btnYtAttach.dataset.url; if (url) attachYoutube(url); });

  // профиль
  el.profileName.addEventListener('input', () => { state.profile.name = el.profileName.value; saveProfile(state.profile); });
  el.btnProfileReset.addEventListener('click', () => { state.profile = resetProfile(); renderProfile(); renderTip(); toast('Статистика сброшена'); });
  el.btnProfileExport.addEventListener('click', exportProfile);
  el.profileImport.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) importProfile(f); e.target.value = ''; });

  // звук: громкости/задержка/чувствительность
  el.guideVol.addEventListener('input', () => { state.settings.guideVol = Number(el.guideVol.value); el.guideVolVal.textContent = el.guideVol.value + '%'; saveSettings(); audio.setGuideVolume(state.settings.guideVol / 100); });
  el.metroVol.addEventListener('input', () => { state.settings.metroVol = Number(el.metroVol.value); el.metroVolVal.textContent = el.metroVol.value + '%'; saveSettings(); audio.setMetroVolume(state.settings.metroVol / 100); });
  el.latency.addEventListener('input', () => { state.settings.latency = Number(el.latency.value); state.latencySec = state.settings.latency / 1000; el.latencyVal.textContent = el.latency.value + ' мс'; saveSettings(); });
  el.sens.addEventListener('input', () => { state.settings.sens = Number(el.sens.value); pitch.rmsGate = state.settings.sens / 1000; el.sensVal.textContent = el.sens.value; if (state.settings.sensPreset !== 'custom') { state.settings.sensPreset = 'custom'; el.sensPreset.value = 'custom'; } saveSettings(); });
  el.sensPreset.addEventListener('change', () => applySensPreset(el.sensPreset.value));
  el.chordMode.addEventListener('change', () => { state.settings.chordMode = el.chordMode.value; saveSettings(); if (state.game) state.game.opts.chordMode = state.settings.chordMode; toast('Режим аккордов обновлён'); });
  el.btnAutoLatency.addEventListener('click', async () => { el.btnAutoLatency.disabled = true; const p = el.btnAutoLatency.textContent; el.btnAutoLatency.textContent = 'Измеряю…'; try { const ms = await autoCalibrateLatency(); state.settings.latency = ms; state.latencySec = ms / 1000; saveSettings(); el.latency.value = String(ms); el.latencyVal.textContent = ms + ' мс'; toast('Задержка подобрана: ' + ms + ' мс', 'ok'); } catch (e) { toast('Калибровка: ' + e.message, 'err', 6000); } finally { el.btnAutoLatency.disabled = false; el.btnAutoLatency.textContent = p; } });
  el.btnVerifyLatency.addEventListener('click', async () => { el.btnVerifyLatency.disabled = true; const p = el.btnVerifyLatency.textContent; el.btnVerifyLatency.textContent = 'Измеряю…'; try { const r = await verifyLatency(); toast(`Задержка: ${r.median} мс (±${r.spread})`, 'ok'); } catch (e) { el.latencyVerify.innerHTML = `<div class="verify__summary">${escapeHtml(e.message)}</div>`; } finally { el.btnVerifyLatency.disabled = false; el.btnVerifyLatency.textContent = p; } });
  el.btnAutoSens.addEventListener('click', async () => { el.btnAutoSens.disabled = true; const p = el.btnAutoSens.textContent; el.btnAutoSens.textContent = 'Измеряю…'; try { await audio.ensure(); if (!audio.micReady) throw new Error('сначала включите микрофон'); await sleep(1200); let peak = 0; const end = audio.now + 1.2; while (audio.now < end) { const data = audio.getTimeData(); if (data) peak = Math.max(peak, rmsOf(data)); await sleep(10); } const v = clamp(Math.round(clamp(peak * 1.6, 0.002, 0.05) * 1000), 2, 50); state.settings.sens = v; pitch.rmsGate = v / 1000; saveSettings(); el.sens.value = String(v); el.sensVal.textContent = String(v); toast('Чувствительность подобрана', 'ok'); } catch (e) { toast('Калибровка: ' + e.message, 'err', 6000); } finally { el.btnAutoSens.disabled = false; el.btnAutoSens.textContent = p; } });

  // мастер
  el.wizAllow.addEventListener('click', toggleMic);
  el.wizNext.addEventListener('click', wizardNext);
  el.wizPrev.addEventListener('click', () => { if (state.wizardStep > 1) { state.wizardStep -= 1; renderWizard(); } });
  el.wizSkip.addEventListener('click', finishWizard);
  el.wizSkip2.addEventListener('click', finishWizard);
  el.wizCalibrate.addEventListener('click', async () => { el.wizCalibrate.disabled = true; try { const ms = await autoCalibrateLatency(); state.settings.latency = ms; state.latencySec = ms / 1000; saveSettings(); el.latency.value = String(ms); el.latencyVal.textContent = ms + ' мс'; el.wizCalState.textContent = 'Задержка: ' + ms + ' мс'; toast('Задержка подобрана: ' + ms + ' мс', 'ok'); } catch (e) { el.wizCalState.textContent = 'Не получилось: ' + e.message; } finally { el.wizCalibrate.disabled = false; } });
  el.btnOpenWizard.addEventListener('click', openWizard);

  // прогресс
  el.progressBar.addEventListener('input', () => { state.seeking = true; });
  el.progressBar.addEventListener('change', () => { state.seeking = false; if (!state.song) return; const pos = (parseFloat(el.progressBar.value) / 1000) * state.song.duration; if (state.playing && !state.paused) startFrom(pos, true); else { state.startSong = pos; state.pauseSong = pos; state.game.rewind(pos); } });

  // клавиатура
  document.addEventListener('keydown', (e) => {
    const typing = e.target && /input|select|textarea/i.test(e.target.tagName);
    if (e.key === 'Escape') { const ov = visibleModal(); if (ov) { if (ov === el.wizardOverlay) finishWizard(); else goBack(); } return; }
    overlayKeydown(e);
    if (typing) return;
    const inLibrary = currentView() === 'library';
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'KeyR') { e.preventDefault(); restart(); }
    else if (e.code === 'KeyT') { e.preventDefault(); toggleOrientation(); }
    else if (e.code === 'BracketLeft') { e.preventDefault(); setLoopA(); }
    else if (e.code === 'BracketRight') { e.preventDefault(); setLoopB(); }
    else if (e.code === 'Backslash') { e.preventDefault(); clearLoop(); }
    else if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.code === 'Comma') { e.preventDefault(); setRate(clamp(state.settings.rate - 0.05, 0.25, 1.5)); }
    else if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.code === 'Period') { e.preventDefault(); setRate(clamp(state.settings.rate + 0.05, 0.25, 1.5)); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); if (inLibrary) stepSelection(-1); else seekBy(-5); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); if (inLibrary) stepSelection(1); else seekBy(5); }
  });

  window.addEventListener('resize', () => { applyLayout(); if (state.song) drawTabPreview(state.song); });
  window.addEventListener('popstate', (e) => { if (!e.state) { history.pushState({ view: 'home' }, ''); renderHistoryState({ view: 'home' }); return; } renderHistoryState(e.state); });
  window.addEventListener('pagehide', () => { flushPractice(); saveProfile(state.profile); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { flushPractice(); saveProfile(state.profile); } else if (state.playing && !state.paused) requestWakeLock(); });
  for (const node of MODALS()) bindModalDismiss(node);
}

// ---------------------------------------------------------------------------
// Инициализация
// ---------------------------------------------------------------------------
function init() {
  state.library.builtin = DEMO_SONGS.map(parseNative);
  buildItems();
  const first = state.items[0];
  if (first) state.selectedId = first.id;
  renderProfile();
  bindEvents();
  applyTheme();
  applyLayout();
  applySettingsToUi();
  renderer.resize();
  loadRaw(first.raw);
  renderTip();
  updateHero();
  refreshDevices();
  setInterval(detectionTick, 16);
  requestAnimationFrame(frame);

  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') { state.settings.autoplay = true; applySettingsToUi(); }

  history.replaceState({ view: 'home' }, '');
  showScreen('home');
  if (!state.settings.onboarded) openModal('wizard');

  window.__riff = { state, audio, pitch, renderer, play, pause, togglePlay, startFrom, restart, loadRaw, renderProfile, renderCategories, applyLayout, applyTheme, frame, autoCalibrateLatency, goView, selectItem, countInFor: (songTime) => { const beatLen = 60 / (state.song.bpm || 120); return Math.max(1, Math.min(4, Math.ceil((-songTime) / beatLen))); } };
}

init();
