// Build tablature from the same timed notes used for playback and scoring.
// Columns represent exact onsets, not a quantized rhythmic grid.
export function buildTabColumns(song) {
  const columns = [];
  const notes = [...(song.notes || [])].sort((a, b) => a.t - b.t || a.string - b.string);
  for (const note of notes) {
    if (!Number.isFinite(note.t) || !Number.isInteger(note.string) || note.string < 1 || note.string > song.stringCount) continue;
    let column = columns[columns.length - 1];
    if (!column || column.time !== note.t) {
      column = { time: note.t, strings: Array.from({ length: song.stringCount }, () => []) };
      columns.push(column);
    }
    column.strings[note.string - 1].push({ fret: note.fret, dur: note.dur, dead: note.dead });
  }
  return columns;
}

// Preserve each onset, including repetitions, for a chronological score.
export function buildFretboardEvents(song) {
  const events = new Map();
  for (const note of song.notes || []) {
    if (!Number.isFinite(note.t) || !Number.isInteger(note.string) || note.string < 1 || note.string > song.stringCount) continue;
    if (!events.has(note.t)) events.set(note.t, []);
    events.get(note.t).push(note);
  }
  return [...events].sort((a, b) => a[0] - b[0]).map(([time, notes]) => ({
    time,
    notes: [...notes].sort((a, b) => a.string - b.string || a.fret - b.fret || (a.finger || 0) - (b.finger || 0)),
  }));
}

// A separate unique-shape index is useful for summaries.
export function buildFretboardPositions(song) {
  const positions = new Map();
  for (const { time, notes } of buildFretboardEvents(song)) {
    const key = JSON.stringify(notes.map(n => [n.string, n.fret, n.finger > 0 ? n.finger : null, !!n.dead]));
    if (!positions.has(key)) positions.set(key, { notes, times: [] });
    positions.get(key).times.push(time);
  }
  return [...positions.values()];
}
