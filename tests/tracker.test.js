import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedEntries, validateEntry, parseImport, exportData, visibleEntries, reorderVisible } from '../learning-tracker/model.js';
const entry = (id, done = false) => ({ id, title: id, urls: ['https://example.com/'], notes: '', done });
test('starter entry preserves both video URLs and JSON preserves notes, done, IDs, and order', () => {
  const entries = [...seedEntries(), { ...entry('second', true), notes: '<script>plain text</script>\nA question' }];
  assert.equal(entries.length, 2);
  assert.equal(entries[0].urls.length, 2);
  assert.deepEqual(parseImport(exportData(entries)), entries);
  assert.equal(parseImport('[{"title":"Legacy entry","url":"https://example.com"}]')[0].urls[0], 'https://example.com/');
});
test('unsafe or malformed imports fail before mutation', () => {
  for (const bad of ['null', '{}', '{', '{"schemaVersion":2,"entries":[]}', JSON.stringify([entry('x'), entry('x')]), JSON.stringify([{ ...entry('x'), urls: ['javascript:alert(1)'] }]), JSON.stringify([{ ...entry('x'), urls: ['https://user:password@example.com/'] }]), JSON.stringify([{ ...entry('x'), done: 'false' }]), JSON.stringify([{ ...entry('x'), title: ' ' }])]) assert.throws(() => parseImport(bad));
  assert.throws(() => validateEntry({ ...entry('x'), notes: 'a'.repeat(5001) }));
});
test('search includes notes and links; filtered reorder preserves hidden item positions', () => {
  const entries = [entry('a'), entry('hidden', true), { ...entry('b'), notes: 'Spaced repetition' }, entry('c')];
  assert.deepEqual(visibleEntries(entries, 'REPETITION', 'todo').map(e => e.id), ['b']);
  assert.equal(visibleEntries(entries, 'example.com', 'done').length, 1);
  assert.deepEqual(reorderVisible(entries, ['c', 'a', 'b']).map(e => e.id), ['c', 'hidden', 'a', 'b']);
  assert.throws(() => reorderVisible(entries, ['a', 'a']));
});
