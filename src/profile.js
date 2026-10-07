// Профиль и статистика. Всё хранится локально в браузере (localStorage).
const KEY = 'riffhero.profile.v1';
const DAY = 86400000;

function dayKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function defaultProfile() {
  return {
    name: '',
    createdAt: Date.now(),
    practiceSec: 0,
    notesHit: 0,
    notesMissed: 0,
    sessions: 0,
    songs: {},
    days: [],
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    return Object.assign(defaultProfile(), JSON.parse(raw));
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* хранилище недоступно */ }
}

// Приводит произвольный объект (например, из импортированного файла) к схеме профиля.
export function normalizeProfile(data) {
  const p = Object.assign(defaultProfile(), data && typeof data === 'object' ? data : {});
  p.songs = (p.songs && typeof p.songs === 'object') ? p.songs : {};
  p.days = Array.isArray(p.days) ? p.days : [];
  p.practiceSec = Number(p.practiceSec) || 0;
  p.notesHit = Number(p.notesHit) || 0;
  p.notesMissed = Number(p.notesMissed) || 0;
  p.sessions = Number(p.sessions) || 0;
  return p;
}

export function resetProfile() {
  const p = defaultProfile();
  saveProfile(p);
  return p;
}

export function recordSession(p, { key, title, score, accuracy, maxCombo, hits, misses }) {
  p.sessions += 1;
  p.notesHit += hits;
  p.notesMissed += misses;
  const s = p.songs[key] || { title, plays: 0, bestScore: 0, bestAccuracy: 0, bestCombo: 0, lastPlayed: 0 };
  s.title = title || s.title;
  s.plays += 1;
  s.bestScore = Math.max(s.bestScore, score);
  s.bestAccuracy = Math.max(s.bestAccuracy, accuracy);
  s.bestCombo = Math.max(s.bestCombo, maxCombo);
  s.lastPlayed = Date.now();
  p.songs[key] = s;
  const today = dayKey(new Date());
  if (!p.days.includes(today)) p.days.push(today);
}

export function streak(p) {
  if (!p.days || !p.days.length) return 0;
  const set = new Set(p.days);
  let cur = new Date();
  if (!set.has(dayKey(cur))) {
    cur = new Date(cur.getTime() - DAY);
    if (!set.has(dayKey(cur))) return 0;
  }
  let count = 0;
  while (set.has(dayKey(cur))) {
    count += 1;
    cur = new Date(cur.getTime() - DAY);
  }
  return count;
}

export function accuracyOf(p) {
  const total = p.notesHit + p.notesMissed;
  return total ? p.notesHit / total : 0;
}

export function fmtDuration(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин`;
  return `${sec} с`;
}
