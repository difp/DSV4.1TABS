// Минимальный читатель ZIP (центральный каталог + DecompressionStream).
// Нужен для .gp / .gpx файлов Guitar Pro (внутри лежит score.gpif).

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

function u16(dv, o) { return dv.getUint16(o, true); }
function u32(dv, o) { return dv.getUint32(o, true); }

function findEOCD(dv, bytes) {
  const maxBack = Math.min(bytes.length, 0x10000 + 22);
  for (let i = bytes.length - 22; i >= bytes.length - maxBack && i >= 0; i--) {
    if (u32(dv, i) === SIG_EOCD) return i;
  }
  return -1;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Браузер не поддерживает DecompressionStream — обновите браузер');
  }
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

export function isZip(bytes) {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export async function readZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEOCD(dv, bytes);
  if (eocd < 0) throw new Error('Не найден ZIP-каталог');

  const count = u16(dv, eocd + 10);
  let offset = u32(dv, eocd + 16);

  const decoder = new TextDecoder('utf-8');
  const entries = new Map();

  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || u32(dv, offset) !== SIG_CENTRAL) break;
    const method = u16(dv, offset + 10);
    const compSize = u32(dv, offset + 20);
    const uncompSize = u32(dv, offset + 24);
    const nameLen = u16(dv, offset + 28);
    const extraLen = u16(dv, offset + 30);
    const commentLen = u16(dv, offset + 32);
    const localOffset = u32(dv, offset + 42);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen));

    // локальный заголовок: считаем смещение данных
    if (u32(dv, localOffset) === SIG_LOCAL) {
      const lNameLen = u16(dv, localOffset + 26);
      const lExtraLen = u16(dv, localOffset + 28);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const raw = bytes.subarray(dataStart, dataStart + compSize);
      let data;
      if (method === 0) data = raw.slice();
      else if (method === 8) data = await inflateRaw(raw);
      else { data = null; }
      if (data) entries.set(name, data);
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

export function findEntry(entries, predicate) {
  for (const [name, data] of entries) {
    if (predicate(name)) return { name, data };
  }
  return null;
}
