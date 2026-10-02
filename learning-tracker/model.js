export const SCHEMA_VERSION = 1;
export const MAX_ENTRIES = 500;
export function newId() { return crypto.randomUUID(); }
export function seedEntries() {
  return [{ id: 'starter-videos', title: 'Two videos to explore', urls: ['https://youtu.be/b_WJ-HwalwU', 'https://www.youtube.com/watch?v=SHinxAhv1ZE'], notes: '', done: false }];
}
function text(value, label, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`${label} must be ${required ? '1–' : 'at most '}${max} characters.`);
  return value.trim();
}
export function validateEntry(raw, { allowMissingId = false } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Every entry must be an object.');
  const id = raw.id === undefined && allowMissingId ? newId() : text(raw.id, 'Entry ID', 128, true);
  const title = text(raw.title, 'Title', 200, true);
  const notes = text(raw.notes ?? '', 'Notes', 5000);
  const links = raw.urls ?? (raw.url ? [raw.url] : undefined);
  if (!Array.isArray(links) || links.length < 1 || links.length > 10) throw new Error('Each entry needs 1–10 links.');
  const urls = links.map(link => {
    const value = text(link, 'URL', 2048, true);
    let url;
    try { url = new URL(value); } catch { throw new Error('Use a complete URL, starting with https:// or http://.'); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Links must use https:// or http:// without embedded credentials.');
    return url.href;
  });
  if (raw.done !== undefined && typeof raw.done !== 'boolean') throw new Error('Done must be true or false.');
  return { id, title, urls: [...new Set(urls)], notes, done: raw.done ?? false };
}
export function validateEntries(raw, options) {
  if (!Array.isArray(raw) || raw.length > MAX_ENTRIES) throw new Error(`Use a list of at most ${MAX_ENTRIES} entries.`);
  const entries = raw.map(entry => validateEntry(entry, options));
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error('Entry IDs must be unique.');
  if (new TextEncoder().encode(JSON.stringify(entries)).length > 700000) throw new Error('This list is too large. Shorten notes or split the export.');
  return entries;
}
export function parseImport(source) {
  if (new TextEncoder().encode(source).length > 1000000) throw new Error('Import files must be smaller than 1 MB.');
  let data;
  try { data = JSON.parse(source); } catch { throw new Error('This is not a valid JSON file.'); }
  if (!Array.isArray(data) && data?.schemaVersion !== SCHEMA_VERSION) throw new Error('This export version is not supported.');
  return validateEntries(Array.isArray(data) ? data : data.entries, { allowMissingId: true });
}
export function exportData(entries) {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, app: 'Learning Tracker', entries: validateEntries(entries) }, null, 2);
}
export function visibleEntries(entries, query, filter) {
  const term = query.trim().toLocaleLowerCase();
  return entries.filter(entry => (filter === 'all' || (filter === 'done' ? entry.done : !entry.done)) && `${entry.title}\n${entry.urls.join('\n')}\n${entry.notes}`.toLocaleLowerCase().includes(term));
}
// Reorder the visible slots without moving items hidden by search or filters.
export function reorderVisible(entries, ids) {
  const selected = new Map(entries.filter(entry => ids.includes(entry.id)).map(entry => [entry.id, entry]));
  if (selected.size !== ids.length || new Set(ids).size !== ids.length) throw new Error('Invalid reorder.');
  let index = 0;
  return entries.map(entry => selected.has(entry.id) ? selected.get(ids[index++]) : entry);
}
