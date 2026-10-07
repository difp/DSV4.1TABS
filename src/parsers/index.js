// Единая точка разбора файлов песни по байтам (используется загрузкой файлов и каталогом).
import { parseNative } from './native.js';
import { parseMidiBytes } from './midi.js';
import { parseGuitarPro } from './guitarpro.js';
import { isZip } from './zip.js';

const decoder = new TextDecoder('utf-8');

export async function parseBytes(bytes, name = '') {
  const n = String(name).toLowerCase().split('?')[0].split('#')[0];
  const magic = String.fromCharCode(bytes[0] || 0, bytes[1] || 0, bytes[2] || 0, bytes[3] || 0);

  if (n.endsWith('.json') || magic[0] === '{') return parseNative(decoder.decode(bytes));
  if (n.endsWith('.mid') || n.endsWith('.midi') || magic === 'MThd') return parseMidiBytes(bytes);
  if (n.endsWith('.gp') || n.endsWith('.gpx') || isZip(bytes)) return parseGuitarPro(bytes);
  if (n.endsWith('.gp3') || n.endsWith('.gp4') || n.endsWith('.gp5') || magic.startsWith('FICH')) {
    return parseGuitarPro(bytes);
  }
  throw new Error('Неизвестный формат файла: ' + (name || 'без имени'));
}
