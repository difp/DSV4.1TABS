// Каталог «предложенных» песен: загрузка по файлу или ссылке + разбор.
// Формат каталога:
// {
//   "name": "Название каталога",
//   "songs": [
//     { "title": "...", "artist": "...", "url": "song.gp" },     // загрузится и распарсится по ссылке (относительно каталога)
//     { "title": "...", "song": { ...нативный формат... } }      // песня прямо в каталоге
//   ]
// }
import { parseNative } from './parsers/native.js';
import { parseBytes } from './parsers/index.js';

export function parseCatalog(text) {
  const data = typeof text === 'string' ? JSON.parse(text) : text;
  if (!data || typeof data !== 'object') throw new Error('Каталог должен быть объектом или массивом');
  const isArray = Array.isArray(data);
  const list = isArray ? data : (data.songs || []);
  const name = (!isArray && data.name) || 'Каталог';

  const songs = list.map((e, i) => ({
    title: e.title || e.name || `Песня ${i + 1}`,
    artist: e.artist || '',
    url: e.url || null,
    song: e.song || e.data || null,
    note: e.note || '',
  })).filter(e => e.url || e.song);

  if (!songs.length) throw new Error('В каталоге не найдено песен (нет полей url или song)');
  return { name, songs, baseUrl: null };
}

async function parseCatalogText(text, baseUrl) {
  const cat = parseCatalog(text);
  cat.baseUrl = baseUrl || null;
  return cat;
}

export async function loadCatalogFromUrl(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Не удалось загрузить каталог: HTTP ${res.status}`);
  return parseCatalogText(await res.text(), res.url || url);
}

export async function loadCatalogFromFile(file) {
  return parseCatalogText(await file.text(), null);
}

// Получить готовую «сырую» песню из элемента каталога.
export async function resolveEntry(entry, baseUrl) {
  if (entry.song) {
    const raw = parseNative(entry.song);
    if (entry.title) raw.title = entry.title;
    if (entry.artist) raw.artist = entry.artist;
    return raw;
  }
  if (entry.url) {
    let href = baseUrl ? new URL(entry.url, baseUrl).href : entry.url;
    let res = await fetch(href, { cache: 'no-store' });
    // запасной вариант: относительный путь от самой страницы
    if (!res.ok && baseUrl && !/^https?:/i.test(entry.url)) {
      const alt = entry.url;
      const res2 = await fetch(alt, { cache: 'no-store' });
      if (res2.ok) { res = res2; href = alt; }
    }
    if (!res.ok) throw new Error(`Не удалось скачать песню: HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const raw = await parseBytes(bytes, href);
    if (entry.title) raw.title = entry.title;
    if (entry.artist) raw.artist = entry.artist;
    return raw;
  }
  throw new Error('В элементе каталога нет данных песни');
}
