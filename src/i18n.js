// Internationalization (ru/en). The key is the Russian source string; the translation lives in EN.
// Мультиязычность (ru/en). Ключ — русская строка-источник; перевод хранится в EN.
// For templates use placeholders like {n} and call t('...{n}', { n }).
// Для шаблонов используйте плейсхолдеры {n} и вызывайте t('...{n}', { n }).
const LANG_KEY = 'riffhero.lang';
export const LANGS = ['ru', 'en'];

let lang = 'ru';

export function resolveLang(pref) {
  if (pref === 'ru' || pref === 'en') return pref;
  const nav = (navigator.language || navigator.userLanguage || 'ru').toLowerCase();
  return nav.startsWith('ru') ? 'ru' : 'en';
}
export function getLang() { return lang; }
export function setLang(pref) {
  lang = resolveLang(pref);
  document.documentElement.lang = lang;
  return lang;
}
export function langLabel(pref) {
  const p = pref || 'auto';
  if (p === 'ru') return t('Русский');
  if (p === 'en') return t('English');
  return t('системный');
}

// Translates a source string. For ru returns the source string.
// Перевод строки-источника. Для ru возвращает исходную строку.
export function t(src, params) {
  let out = (lang === 'en' && EN[src]) ? EN[src] : src;
  if (params) for (const k in params) out = out.split('{' + k + '}').join(String(params[k]));
  return out;
}

// -------- Translating static markup --------
// -------- Перевод статической разметки --------
// Store the original (Russian) text/attribute so the language can be switched back and forth.
// Храним исходный (русский) текст/атрибут, чтобы можно было переключать язык туда-обратно.
const origText = new WeakMap();
const origAttr = new WeakMap();
const TR_ATTRS = ['placeholder', 'aria-label', 'title', 'data-tip', 'alt'];
const CYR = /[А-Яа-яЁё]/;

export function applyDom(root = document) {
  for (const el of root.querySelectorAll('*')) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS') continue;
    // Leaf text nodes.
    // листовые текстовые узлы
    if (el.children.length === 0 && el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
      const trimmed = el.textContent.trim();
      let src = origText.get(el);
      if (src === undefined && trimmed && CYR.test(trimmed)) { src = trimmed; origText.set(el, src); }
      if (src !== undefined) {
        const out = t(src);
        if (el.textContent !== out) el.textContent = out;
      }
    }
    for (const attr of TR_ATTRS) {
      if (!el.hasAttribute || !el.hasAttribute(attr)) continue;
      let m = origAttr.get(el);
      if (!m) { m = {}; origAttr.set(el, m); }
      if (m[attr] === undefined) {
        const val = el.getAttribute(attr);
        if (!val || !CYR.test(val)) { m[attr] = null; continue; }
        m[attr] = val;
      }
      if (m[attr] === null) continue;
      const out = t(m[attr]);
      if (el.getAttribute(attr) !== out) el.setAttribute(attr, out);
    }
  }
}

// -------- Built-in exercise and category texts (by stable id) --------
// -------- Тексты встроенных упражнений и категорий (по стабильному id) --------
export function songTitle(id, fallback) {
  return (lang === 'en' && SONG_EN[id] && SONG_EN[id].title) || fallback;
}
export function songArtist(id, fallback) {
  return (lang === 'en' && SONG_EN[id] && SONG_EN[id].artist) || fallback;
}
export function songTip(id, fallback) {
  return (lang === 'en' && SONG_TIP_EN[id]) || fallback || '';
}
export function categoryName(key) {
  return (lang === 'en' && CAT_EN[key]) || CAT_RU[key] || key;
}

const CAT_RU = { warmup: 'Разминка и техника', scales: 'Гаммы и лады', chords: 'Аккорды и ритм', classics: 'Классика и фолк', book: 'Аккорды по самоучителю', mine: 'Свои и каталог' };
const CAT_EN = { warmup: 'Warm-up & technique', scales: 'Scales & modes', chords: 'Chords & rhythm', classics: 'Classical & folk', book: 'Chords from the method', mine: 'Mine & catalog' };

const SONG_EN = {
  'open-strings': { title: 'Open strings', artist: 'Exercise' },
  'first-fret': { title: 'First fret', artist: 'Exercise' },
  'five-in-a-row': { title: 'Five in a row', artist: 'Exercise' },
  'scale-one-string': { title: 'Scale on one string', artist: 'Exercise' },
  'chromatic-warmup': { title: 'Warm-up: chromatic', artist: 'Exercise' },
  'a-minor-pentatonic': { title: 'A minor pentatonic', artist: 'Exercise' },
  'c-major-scale': { title: 'C major scale', artist: 'Exercise' },
  'spider-1-3-2-4': { title: 'Spider 1-3-2-4', artist: 'Exercise' },
  'hands-sync': { title: 'Hand synchronization', artist: 'Exercise' },
  'fifths-up': { title: 'Fifths up', artist: 'Exercise' },
  'fingerstyle-am': { title: 'Fingerstyle Am', artist: 'Exercise' },
  'rock-power-riff': { title: 'Riff: power chords', artist: 'Exercise' },
  'pentatonic-16ths': { title: 'Pentatonic 16ths', artist: 'Exercise' },
  'ode-to-joy': { title: 'Ode to Joy', artist: 'Beethoven · PD' },
  'greensleeves': { title: 'Greensleeves', artist: 'Folk · PD' },
  'spanish-romance': { title: 'Spanish Romance (Em arpeggio)', artist: 'Classical · PD' },
  'house-of-rising-sun': { title: 'House of the Rising Sun (arpeggio)', artist: 'Folk · PD' },
  'la-bamba': { title: 'La Bamba', artist: 'Folk · PD' },
  'spanish-strum-cfgam': { title: 'Spanish strum C–F–G–Am', artist: 'Folk · PD' },
  'blues-shuffle-12': { title: 'Blues shuffle (12 bars)', artist: 'Blues · original' },
  'rock-n-roll-fifths': { title: "Rock'n'roll fifths", artist: 'Rock · original' },
  // Chords from the method
  // Аккорды по самоучителю
  'book-em': { title: 'Chord Em — clean strum', artist: 'Method: chords' },
  'book-em-am': { title: 'Em ⇄ Am alternation', artist: 'Method: chords' },
  'book-am-a': { title: 'Am ⇄ A alternation', artist: 'Method: chords' },
  'book-em-e': { title: 'Em ⇄ E alternation', artist: 'Method: chords' },
  'book-dm-d': { title: 'Dm ⇄ D alternation', artist: 'Method: chords' },
  'book-g-c': { title: 'G ⇄ C alternation', artist: 'Method: chords' },
  'book-b7-em': { title: 'B7 ⇄ Em alternation', artist: 'Method: chords' },
  'book-prog-am-dm-e': { title: 'Progression Am–Dm–E–Am', artist: 'Method: chords' },
  'book-prog-c-g-dm-am': { title: 'Progression C–G–Dm–Am', artist: 'Method: chords' },
  'book-prog-em-am-d-g': { title: 'Progression Em–Am–D–G', artist: 'Method: chords' },
  'book-arp-am-dm-e': { title: 'Arpeggio Am–Dm–Am–E', artist: 'Method: chords' },
  'book-arp-g-c': { title: 'Arpeggio G–C–G–C', artist: 'Method: chords' },
  'twinkle-twinkle': { title: 'Twinkle, Twinkle', artist: 'Folk · PD' },
  'mary-lamb': { title: 'Mary Had a Little Lamb', artist: 'Folk · PD' },
  'frere-jacques': { title: 'Frère Jacques', artist: 'Folk · PD' },
  'jingle-bells': { title: 'Jingle Bells', artist: 'Folk · PD' },
  'when-the-saints': { title: 'When the Saints Go Marching In', artist: 'Folk · PD' },
};

// -------- Method tips for lessons (en) --------
// -------- Методические советы к занятиям (en) --------
const SONG_TIP_EN = {
  'open-strings': 'Warm-up: play the open strings evenly and cleanly, with a metronome around 70.',
  'first-fret': 'Alternate the open string and the 1st fret with one finger — warm up the left hand.',
  'five-in-a-row': 'Five notes in a row on three strings: steady picking, follow the metronome.',
  'scale-one-string': 'A scale on a single string builds coordination and finger stretch.',
  'chromatic-warmup': 'Chromatic 0-1-2-3 up and down every string. Start at 70–80 and speed up gradually.',
  'a-minor-pentatonic': 'A minor pentatonic in 1st position — play both up and down.',
  'c-major-scale': 'C major scale — the basic scale; watch your left-hand fingering.',
  'spider-1-3-2-4': 'The “spider” 1-3-2-4 builds left-hand finger independence.',
  'hands-sync': 'Hand synchronization: short notes; play slowly and evenly.',
  'pentatonic-16ths': 'Pentatonic in 16ths — for speed. Start at 90 and add tempo.',
  'fifths-up': 'Fifths are the basis of rock rhythm; mute the unused strings.',
  'fingerstyle-am': 'Fingerstyle Am: the thumb plays the bass, the other fingers pick the strings.',
  'rock-power-riff': 'Power-chord riff: play with an eighth-note feel, accent the strong beats.',
  'ode-to-joy': 'A simple melody: watch the note lengths and clean note changes.',
  'greensleeves': 'In 3/4: keep the melody flowing, without pauses.',
  'spanish-romance': 'Classic arpeggio: bass note plus the other fingers in turn.',
  'house-of-rising-sun': 'Arpeggio in 3/4: bass on the downbeat, even arpeggio.',
  'la-bamba': 'A simple rhythm with fast notes — start slowly.',
  'spanish-strum-cfgam': 'Strum C–F–G–Am: practise changing chords without pauses.',
  'blues-shuffle-12': 'Blues shuffle (12 bars): triplet feel, keep the swing.',
  'rock-n-roll-fifths': "Rock'n'roll fifths: even eighths, light picking hand.",
  'book-em': 'Start with Em — the easiest chord. Strum all strings; the sound must be clean and sustained.',
  'book-em-am': 'Change between Em and Am: move your fingers quickly, without pauses.',
  'book-am-a': 'Am and A differ by one note — swap a single finger.',
  'book-em-e': 'Em and E: middle and ring fingers stay put, the index does the work.',
  'book-dm-d': 'Dm and D: the 6th and 5th strings are silent; start from the 4th string.',
  'book-g-c': 'G and C: four fingers are involved — keep the change clean.',
  'book-b7-em': 'B7 and Em: practise the changes in a loop without stopping.',
  'book-prog-am-dm-e': 'The main chords of A minor. Four strums per chord, then repeat.',
  'book-prog-c-g-dm-am': 'The C–G–Dm–Am sequence: the key is even chord changes.',
  'book-prog-em-am-d-g': 'Em–Am–D–G: many changes — play slowly first, then with confidence.',
  'book-arp-am-dm-e': 'Arpeggio sequence: bass plus the other fingers, evenly.',
  'book-arp-g-c': 'Arpeggio G–C: make sure every string rings.',
  'twinkle-twinkle': 'The easiest melody to start with: watch the note lengths.',
  'mary-lamb': 'A melody with repeats: play evenly, following the metronome.',
  'frere-jacques': 'A short phrase repeats — great for practising rhythm.',
  'jingle-bells': 'A familiar melody: watch the string changes and clean sound.',
  'when-the-saints': 'A melody in C major — a good warm-up for fluency.',
};

// -------- UI dictionary (ru source → en) --------
// -------- Словарь интерфейса (ru источник → en) --------
const EN = {
  // Top bar / navigation
  // Шапка / навигация
  'Микрофон выключен': 'Microphone off',
  'Микрофон готов': 'Microphone ready',
  'Слышу сигнал': 'Signal detected',
  'Нет доступа': 'No access',
  'Микрофон выключен. Включить микрофон': 'Microphone off. Turn on microphone',
  'Микрофон готов. Выключить микрофон': 'Microphone ready. Turn off microphone',
  'Слышу сигнал. Выключить микрофон': 'Signal detected. Turn off microphone',
  'Нет доступа. Включить микрофон': 'No access. Turn on microphone',
  'Звук': 'Sound',
  'Ещё': 'More',
  'Дополнительно': 'More',
  'Мастер настройки': 'Setup wizard',
  'Справка и клавиши': 'Help & shortcuts',
  'О проекте': 'About',
  'Тема': 'Theme',
  'Язык': 'Language',
  'светлая': 'light',
  'тёмная': 'dark',
  'системная': 'system',
  'Русский': 'Russian',
  'English': 'English',
  'Главная': 'Home',
  'Занятия': 'Lessons',
  'Профиль': 'Profile',
  'Разделы': 'Sections',
  'Песня не выбрана': 'No song selected',

  // Home
  // Главная
  'Упражнение': 'Exercise',
  'Песня': 'Song',
  'BPM': 'BPM',
  'Длительность': 'Duration',
  'Нот': 'Notes',
  'Строй': 'Tuning',
  'Лучшая точность': 'Best accuracy',
  'Сложность': 'Difficulty',
  'Сложность {d} из 5': 'Difficulty {d} of 5',
  'Видео': 'Video',
  'Аккорды': 'Chords',
  'Выбрать занятие': 'Choose a lesson',
  'Играть': 'Play',
  'Пауза': 'Pause',
  'Сначала': 'Restart',
  'Выход': 'Exit',
  'Выйти к занятиям': 'Exit to lessons',
  'Повтор': 'Loop',
  'Темп': 'Tempo',
  'Совет на сегодня': 'Tip of the day',
  'Применить': 'Apply',
  'Игра': 'Playback',
  'Метроном': 'Metronome',
  'Отсчёт': 'Count-in',
  'Номера ладов': 'Fret numbers',
  'Пальцы левой руки': 'Left-hand fingers',
  'Автоигра': 'Autoplay',
  'О проекте': 'About',
  'RiffHero — лёгкий тренажёр в духе Rocksmith. Собран «вайбкодингом»: короткими итерациями в паре с ИИ, без сборки и зависимостей.':
    'RiffHero is a lightweight Rocksmith-style trainer. Built by “vibe coding”: short iterations together with AI, no build step or dependencies.',
  '0 зависимостей': '0 dependencies',
  'GitHub': 'GitHub',
  'Звук и устройства': 'Sound & devices',
  'Предпросмотр интерфейса': 'Interface preview',
  'Авто': 'Auto',
  'ПК': 'Desktop',
  'Телефон': 'Phone',
  'Классика и фольклор — общественное достояние, рок- и блюз-паттерны — оригинальные.':
    'Classical and folk pieces are public domain; rock and blues patterns are original.',
  'Продолжить': 'Continue',
  'Смахните карточку или нажмите ‹ ›, чтобы выбрать занятие': 'Swipe the card or tap ‹ › to choose a lesson',
  'Выбор занятия': 'Lesson picker',
  'Предыдущее занятие': 'Previous lesson',
  'Следующее занятие': 'Next lesson',
  'Занятие {i} из {total}: {title}': 'Lesson {i} of {total}: {title}',
  'Играть: {title}': 'Play: {title}',

  // Lessons
  // Занятия
  'Поиск по названию или исполнителю': 'Search by title or artist',
  'Поиск занятий': 'Search lessons',
  'Сортировка': 'Sort',
  'По категориям': 'By category',
  'По сложности': 'By difficulty',
  'По названию': 'By title',
  'Недавно игранные': 'Recently played',
  'Фильтр по сложности': 'Difficulty filter',
  'Любая сложность': 'Any difficulty',
  'Сложность 1': 'Difficulty 1',
  'Сложность 2': 'Difficulty 2',
  'Сложность 3': 'Difficulty 3',
  'Сложность 4': 'Difficulty 4',
  'Сложность 5': 'Difficulty 5',
  'Ничего не найдено — измените запрос или фильтр.': 'Nothing found — change the query or filter.',
  'Результаты · {n}': 'Results · {n}',
  'Добавить файл': 'Add a file',
  'Перетащите .gp .gpx .mid .json': 'Drop .gp .gpx .mid .json',
  'Открыть файл песни': 'Open a song file',
  'Добавить каталог по ссылке': 'Add a catalog by link',
  'Аккорды по ссылке из YouTube': 'Chords from a YouTube link',
  'Вставьте ссылку — определим название видео и откроем поиск аккордов в интернете.':
    'Paste a link — we will detect the video title and open a web search for chords.',
  'Ссылка на YouTube': 'YouTube link',
  'Найти аккорды': 'Find chords',
  'Дорожка': 'Track',
  'Назад в категории': 'Back in category',
  'Вперёд в категории': 'Forward in category',
  '{n} нот': '{n} notes',
  'каталог': 'catalog',

  // Profile
  // Профиль
  'Имя': 'Name',
  'Имя игрока': 'Player name',
  'Практика': 'Practice',
  'Точность': 'Accuracy',
  'Ноты': 'Notes',
  'Серия': 'Streak',
  'Сессий': 'Sessions',
  'Песен': 'Songs',
  '{n} дн.': '{n} d',
  'Ошибки по струнам': 'Misses by string',
  'Ошибки по ладам': 'Misses by fret',
  'Практика по дням': 'Practice by day',
  'Дней с практикой: {n}': 'Days with practice: {n}',
  'Пока нет данных': 'No data yet',
  'Пока нет сыгранных песен': 'No songs played yet',
  'Песни': 'Songs',
  'Повтор A–B': 'Loop A–B',
  '{h} ч {m} мин': '{h} h {m} min',
  '{m} мин': '{m} min',
  '{n} с': '{n} s',
  'Сбросить': 'Reset',
  'Точно сбросить?': 'Reset for sure?',
  'Экспорт': 'Export',
  'Импорт': 'Import',
  'Импортировать профиль из файла': 'Import profile from file',
  'Струна {n}': 'String {n}',
  'Лад {n}': 'Fret {n}',
  'без имени': 'unnamed',

  // Playbar / A–B
  // Плейбар / A–B
  'Зацикливание A–B': 'A–B loop',
  'Отметить точку A зацикливания': 'Set loop point A',
  'Отметить точку B зацикливания': 'Set loop point B',
  'Сбросить зацикливание': 'Clear loop',
  'Точка A': 'Point A',
  'Точка B': 'Point B',
  'Сбросить A–B': 'Clear A–B',
  'Позиция воспроизведения': 'Playback position',
  'Изменить темп': 'Change tempo',
  'Темп, ударов в минуту': 'Tempo, beats per minute',
  'Точка A: {time}': 'Point A: {time}',
  'Зацикливание: {a} – {b}': 'Loop: {a} – {b}',
  'Точка B должна быть позже A': 'Point B must be after A',
  'Просмотр аккордов и нот': 'Chords & notes viewer',
  'Вид: табы или падающие ноты': 'View: tab or falling notes',
  'Показать аппликатуру': 'Show fingering',
  'Просмотр': 'Viewer',
  'Вид': 'View',
  'Аппликатура': 'Fingering',

  // Sound & devices
  // Звук и устройства
  'Микрофон и звук': 'Microphone & sound',
  'Устройства': 'Devices',
  'Микрофон': 'Microphone',
  'Вывод (наушники)': 'Output (headphones)',
  'Вывод': 'Output',
  'Обновить список': 'Refresh list',
  'Закрыть': 'Close',
  'Задержка и чувствительность': 'Latency & sensitivity',
  'Громкость табулатуры': 'Tab volume',
  'Громкость метронома': 'Metronome volume',
  'Задержка звука': 'Audio latency',
  'Подобрать': 'Auto-detect',
  'Проверить': 'Test',
  'Чувствительность': 'Sensitivity',
  'Подобрать автоматически': 'Auto-detect',
  'Пресет чувствительности': 'Sensitivity preset',
  'Тихий микрофон': 'Quiet mic',
  'Комната': 'Room',
  'Усилитель или интерфейс': 'Amp or interface',
  'Шумно': 'Noisy',
  'Вручную': 'Manual',
  'Режим распознавания аккордов': 'Chord recognition mode',
  'Любая нота аккорда': 'Any note of the chord',
  'Только корневая нота': 'Root note only',
  'Все ноты аккорда': 'All notes of the chord',
  'Включите микрофон, чтобы увидеть названия устройств.': 'Turn on the microphone to see device names.',
  'Не поддерживается браузером': 'Not supported by the browser',
  'Выбор вывода не поддерживается браузером': 'Output selection is not supported by the browser',
  'Микрофон по умолчанию': 'Default microphone',
  'Вывод по умолчанию': 'Default output',
  'Вывод переключён': 'Output switched',
  'Микрофон переключён': 'Microphone switched',
  'Микрофон включён': 'Microphone on',
  'Микрофон недоступен: ': 'Microphone unavailable: ',
  'Микрофон недоступен: нет navigator.mediaDevices (нужен https или localhost)':
    'Microphone unavailable: no navigator.mediaDevices (needs https or localhost)',
  'Включите микрофон или автоигру, чтобы ноты засчитывались': 'Turn on the microphone or autoplay so notes are counted',
  'сначала включите микрофон': 'turn on the microphone first',
  'Не удалось переключить: ': 'Could not switch: ',
  'Калибровка: ': 'Calibration: ',
  '{n} мс': '{n} ms',
  'мс': 'ms',

  // Setup wizard
  // Мастер
  'Настройка': 'Setup',
  'Доступ к микрофону': 'Microphone access',
  'Разрешите доступ, чтобы приложение слышало гитару и засчитывало ноты.':
    'Allow access so the app can hear your guitar and count notes.',
  'Разрешить доступ': 'Allow access',
  'Доступ есть': 'Access granted',
  'Индикатор уровня': 'Level meter',
  'Сыграйте что-нибудь — полоса должна реагировать.': 'Play something — the bar should react.',
  'Тишина': 'Silence',
  'Слабый сигнал': 'Weak signal',
  'Сигнал есть': 'Signal present',
  'Строй и задержка': 'Tuning & latency',
  'Сыграйте открытую струну — увидим ноту и отклонение. Затем подберите задержку звука.':
    'Play an open string — we will show the note and its deviation. Then detect the audio latency.',
  'Сыграйте одну струну': 'Play one string',
  'в строю': 'in tune',
  'выше': 'sharp',
  'ниже': 'flat',
  'Подобрать задержку автоматически': 'Auto-detect latency',
  'Назад': 'Back',
  'Далее': 'Next',
  'Готово': 'Done',
  'Пропустить': 'Skip',
  'Пропустить мастер': 'Skip the wizard',
  'Задержка подобрана: {n} мс': 'Latency set: {n} ms',
  'Задержка: {n} мс': 'Latency: {n} ms',
  'Задержка: {n} мс (±{spread})': 'Latency: {n} ms (±{spread})',
  'клики не слышны — проверьте звук и микрофон': 'clicks not heard — check the sound and microphone',
  'Не получилось: ': 'Failed: ',

  // Playback / HUD
  // Игра / HUD
  'Очки': 'Score',
  'Серия': 'Streak',
  'Ждём: {list}': 'Waiting: {list}',
  '{note} (лад {fret})': '{note} (fret {fret})',
  '{note} (лад {fret}, палец {finger})': '{note} (fret {fret}, finger {finger})',
  ' · слышу: {note} {cents}': ' · hearing: {note} {cents}',
  ' — не та нота': ' — wrong note',
  ' · тишина': ' · silence',
  '{cents}¢ · {word}': '{cents}¢ · {word}',
  'Включить микрофон': 'Turn on microphone',
  'Выключить микрофон': 'Turn off microphone',
  'ИДЕАЛЬНО': 'PERFECT',
  'ХОРОШО': 'GOOD',
  'ОК': 'OK',
  'ПРОМАХ': 'MISS',

  // Results
  // Результаты
  'Результат': 'Result',
  'Результат — {title}': 'Result — {title}',
  'Оценка': 'Grade',
  'Промахи': 'Misses',
  'Попадания': 'Hits',
  'Без ошибок': 'No mistakes',
  'Ошибки: {list}': 'Mistakes: {list}',
  'струна {k}×{v}': 'string {k}×{v}',
  'лад {k}×{v}': 'fret {k}×{v}',
  'струна {k}': 'string {k}',
  'лад {k}': 'fret {k}',
  'К занятиям': 'To lessons',
  'Повторить': 'Again',
  'Отработать слабое место': 'Practice the weak spot',
  'Отработка: {label} · 75%': 'Practice: {label} · 75%',
  'лад {fret}, струна {string}': 'fret {fret}, string {string}',
  'Первый результат по этому упражнению': 'First result for this lesson',
  'Новый рекорд! Раньше было {prev}%': 'New record! Previously {prev}%',
  'Повтор лучшего результата · {prev}%': 'Matched your best · {prev}%',
  'Лучший результат: {prev}%': 'Your best: {prev}%',

  // Viewer
  // Просмотр
  'Просмотр аккордов и нот': 'Chords & notes',
  'Нет выбранной песни.': 'No song selected.',
  'В этом упражнении нет аккордов — откройте вкладку «Ноты» или играйте по трассе.':
    'This lesson has no chords — open the “Notes” tab or play along the track.',
  'Время': 'Time',
  'Стр.': 'Str.',
  'Лад': 'Fret',
  'Палец': 'Finger',
  'Нота': 'Note',
  'Показаны первые {shown} из {total}': 'Showing first {shown} of {total}',
  'Всего нот: {n}': 'Total notes: {n}',
  'Всего нот: {n}': 'Total notes: {n}',

  // YouTube
  'Аккорды по ссылке': 'Chords from a link',
  'Вставьте ссылку и нажмите «Определить».': 'Paste a link and press “Detect”.',
  'Определить': 'Detect',
  'Открыть аккорды': 'Open chords',
  'Открыть видео': 'Open video',
  'Прикрепить к песне': 'Attach to song',
  'Определяю название…': 'Detecting the title…',
  'Не похоже на ссылку YouTube.': 'This does not look like a YouTube link.',
  'Найдено: {title}': 'Found: {title}',
  'Название определить не удалось — откроем поиск по ссылке.': 'Could not detect the title — we will search by link.',
  'Аккорды подберите сами и введите ниже — приложение соберёт из них упражнение.':
    'Pick the chords yourself and enter them below — the app will build a lesson from them.',
  'Аккорды песни (через пробел)': 'Song chords (space-separated)',
  'Аккорды': 'Chords',
  'Создать упражнение': 'Create lesson',
  'Введите аккорды, например: Am F C G': 'Enter chords, for example: Am F C G',
  'Упражнение создано: {title}': 'Lesson created: {title}',
  'Готово: {list}': 'Done: {list}',
  'Упражнение по песне': 'Lesson from a song',
  'По ссылке': 'From link',

  // Categories and utility
  // Категории и служебные
  'Каталог по ссылке': 'Catalog by link',
  'Ссылка на JSON-каталог': 'JSON catalog link',
  'Загрузить': 'Load',
  'Каталог из файла': 'Catalog from a file',
  'Загрузить каталог из файла': 'Load catalog from a file',
  'Загрузка…': 'Loading…',
  'Загружено: {n}': 'Loaded: {n}',
  'Каталог загружен': 'Catalog loaded',
  'Каталог: ': 'Catalog: ',
  'Название каталога': 'Catalog name',
  'Каталог': 'Catalog',

  // Help
  // Справка
  'Справка': 'Help',
  'Клавиатура': 'Keyboard',
  'Панель воспроизведения': 'Playback bar',
  'Играть / Пауза': 'Play / Pause',
  'Сначала': 'Restart',
  'Выбор занятия в списках · перемотка на 5 c в игре': 'Choose a lesson in lists · seek 5 s in the game',
  'Медленнее / быстрее на 5%': 'Slower / faster by 5%',
  'Отметить точку A / B': 'Set loop point A / B',
  'Сбросить зацикливание A–B': 'Clear the A–B loop',
  'Вид: табы / падающие ноты': 'View: tab / falling notes',
  'Эта справка': 'This help',
  'Закрыть окно · выйти из занятия': 'Close dialog · leave the lesson',
  'Аккорды и ноты выбранного упражнения': 'Chords and notes of the selected lesson',
  'Переключить табы и падающие ноты': 'Switch between tab and falling notes',
  'Показывать номера пальцев левой руки': 'Show left-hand finger numbers',
  'Зациклить фрагмент между точками A и B': 'Loop a fragment between points A and B',
  'Скорость воспроизведения, 25–150%': 'Playback speed, 25–150%',
  'Прервать занятие и вернуться к списку упражнений': 'Leave the lesson and return to the list',
  'Панель воспроизведения': 'Playback bar',
  'Выход': 'Exit',

  // Misc notifications
  // Разные уведомления
  'Статистика сброшена': 'Statistics reset',
  'Профиль выгружен': 'Profile exported',
  'Профиль загружен': 'Profile imported',
  'Профиль: ': 'Profile: ',
  'Режим аккордов обновлён': 'Chord mode updated',
  'Автоигра включена': 'Autoplay on',
  'Автоигра выключена': 'Autoplay off',
  'Чувствительность подобрана': 'Sensitivity set',
  'Открыто: {title}': 'Opened: {title}',
  'Совет применён: {title}, {speed}%': 'Tip applied: {title}, {speed}%',
  'Сначала выберите занятие': 'Choose a lesson first',
  'Ссылка прикреплена к «{title}»': 'Link attached to “{title}”',
  'Пока нет истории. Начните с упражнения <b>«Разминка: хроматика»</b> на 75% — оно разогревает все струны.':
    'No history yet. Start with <b>“Warm-up: chromatic”</b> at 75% — it warms up every string.',
  'Чаще всего промахи по: {parts}. Предлагаю <b>«{title}»</b> на <b>{speed}%</b>.':
    'Most misses on: {parts}. Try <b>“{title}”</b> at <b>{speed}%</b>.',
  'лад <b>{n}</b>': 'fret <b>{n}</b>',
  'струна <b>{n}</b>': 'string <b>{n}</b>',
  'Ошибка импорта: ': 'Import error: ',
  'Ошибка кадра:': 'Frame error:',
  'Не удалось загрузить: ': 'Failed to load: ',
  'Пока нет данных': 'No data yet',

  // Misc formats (parser/device errors)
  // Разные форматы (ошибки парсеров/устройств)
  'Нота не распознана: ': 'Note not recognized: ',
  'Неверный формат строя': 'Invalid tuning format',
  'Пустой JSON песни': 'Empty song JSON',
  'Без названия': 'Untitled',
  'Песня': 'Song',
  'Гитара': 'Guitar',
  'Дорожка {n}': 'Track {n}',
  'Песня {n}': 'Song {n}',
  'Микрофон {n}': 'Microphone {n}',
  'Устройство вывода {n}': 'Output device {n}',
  'Bass': 'Bass',
  'Бас EADG': 'Bass EADG',
  'Eb (полутон вниз)': 'Eb (half step down)',
  'Трек {n}': 'Track {n}',
  'Канал {n}': 'Channel {n}',
  'Web Audio API не поддерживается браузером': 'Web Audio API is not supported by the browser',
  'Это не MIDI-файл (отсутствует заголовок MThd)': 'This is not a MIDI file (missing MThd header)',
  'В MIDI-файле не найдено нот (fmt={format}, trk={ntrks}, raw={rawNotes})': 'No notes found in the MIDI file (fmt={format}, trk={ntrks}, raw={rawNotes})',
  'В файле не найдено нот для гитары': 'No guitar notes found in the file',
  'Неизвестный формат файла: ': 'Unknown file format: ',
  'Неизвестный контейнер Guitar Pro (ожидался .gp/.gpx — ZIP с score.gpif)': 'Unknown Guitar Pro container (expected .gp/.gpx — a ZIP with score.gpif)',
  'Форматы Guitar Pro 3/4/5 (.gp3/.gp4/.gp5) не поддерживаются. Экспортируйте трек в .gp/.gpx или MIDI.':
    'Guitar Pro 3/4/5 (.gp3/.gp4/.gp5) are not supported. Export the track to .gp/.gpx or MIDI.',
  'Внутри файла не найден score.gpif': 'score.gpif not found inside the file',
  'Корневой узел не GPIF': 'Root node is not GPIF',
  'Ошибка разбора score.gpif (XML)': 'score.gpif (XML) parse error',
  'Каталог должен быть объектом или массивом': 'The catalog must be an object or an array',
  'В каталоге не найдено песен (нет полей url или song)': 'No songs found in the catalog (no url or song fields)',
  'В элементе каталога нет данных песни': 'The catalog entry has no song data',
  'Не удалось загрузить каталог: HTTP {status}': 'Could not load the catalog: HTTP {status}',
  'Не удалось скачать песню: HTTP {status}': 'Could not download the song: HTTP {status}',

  // Additions
  // Дополнения
  'Измеряю…': 'Measuring…',
  'Вывод: ': 'Output: ',
  'системный': 'system',
  '+ ещё {n}': '+ {n} more',
  'стабильно': 'stable',
  'средне': 'medium',
  'нестабильно': 'unstable',
  'Клики: {clicks} мс · медиана {median} мс · разброс ±{spread} мс ({verdict})': 'Clicks: {clicks} ms · median {median} ms · spread ±{spread} ms ({verdict})',
  'Показаны первые {shown} из {total}': 'Showing first {shown} of {total}',
  'Всего нот: {n}': 'Total notes: {n}',
  'Дней с практикой: {n}': 'Days with practice: {n}',
  'Лад {n}': 'Fret {n}',
  'Струна {n}': 'String {n}',
  'Задержка подобрана: {n} мс': 'Latency set: {n} ms',
  'Задержка: {n} мс': 'Latency: {n} ms',
  'Задержка: {n} мс (±{spread})': 'Latency: {n} ms (±{spread})',
};
