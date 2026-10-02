import { createAppPlatform } from '../lib/platform.js';
import { APP_ID, APP_DETAILS } from './config.js';
import { newId, validateEntry, validateEntries, visibleEntries, reorderVisible, exportData, parseImport } from './model.js';
import { TrackerStore } from './store.js';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const appUrl = new URL('./', location.href).href;
const platform = createAppPlatform({ appId: APP_ID, details: { ...APP_DETAILS, url: appUrl, iconUrl: new URL('icon.svg', appUrl).href } });
let query = '', filter = 'all', editingId = null, deletingId = null, imported = [], drag = null;
let toastTimer;
const store = new TrackerStore(platform, render);
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4200);
}
function announce(message) { $('#announcement').textContent = message; }
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function commit(entries, message) {
  try { store.replace(entries); if (message) announce(message); return true; }
  catch (error) { toast(error.message); return false; }
}
function card(entry) {
  const node = element('article', `entry${entry.done ? ' done' : ''}`);
  node.dataset.id = entry.id;
  const check = element('button', 'icon-button check');
  check.dataset.action = 'check';
  check.setAttribute('aria-label', `Mark ${entry.title} ${entry.done ? 'to learn' : 'done'}`);
  check.setAttribute('aria-pressed', String(entry.done));
  check.append(element('span', '', entry.done ? '✓' : ''));
  check.addEventListener('click', () => commit(store.entries.map(item => item.id === entry.id ? { ...item, done: !item.done } : item), `${entry.title} marked ${entry.done ? 'to learn' : 'done'}.`));
  const body = element('div', 'entry-body');
  const title = element('h2', 'entry-title', entry.title);
  body.append(title);
  const links = element('div', 'resource-links');
  entry.urls.forEach((url, index) => {
    const parsed = new URL(url);
    const link = element('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const label = parsed.hostname.replace(/^www\./, '') + parsed.pathname + parsed.search;
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('viewBox', '0 0 16 16'); arrow.setAttribute('width', '14'); arrow.setAttribute('height', '14'); arrow.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M4 12 12 4M4 4h8v8'); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.5');
    arrow.append(path);
    link.append(element('span', '', label), arrow);
    link.setAttribute('aria-label', `Open ${entry.title}${entry.urls.length > 1 ? ` resource ${index + 1}` : ''} (${parsed.hostname})`);
    links.append(link);
  });
  body.append(links);
  if (entry.notes) body.append(element('p', 'notes', entry.notes));
  const actions = element('div', 'entry-actions');
  const edit = element('button', '', 'Edit'); edit.setAttribute('aria-label', `Edit ${entry.title}`);
  edit.dataset.action = 'edit';
  edit.addEventListener('click', () => openEditor(entry));
  const remove = element('button', '', 'Delete'); remove.setAttribute('aria-label', `Delete ${entry.title}`);
  remove.dataset.action = 'delete';
  remove.addEventListener('click', () => {
    deletingId = entry.id;
    $('#delete-description').textContent = entry.title;
    $('#delete-dialog').showModal();
    $('#delete-dialog .secondary').focus();
  });
  actions.append(edit, remove); body.append(actions);
  const grip = element('button', 'icon-button grip', '⠿');
  grip.dataset.action = 'grip';
  grip.setAttribute('aria-label', `Reorder ${entry.title}`);
  grip.setAttribute('title', 'Drag to reorder, or use Up and Down arrow keys');
  grip.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const ids = visibleEntries(store.entries, query, filter).map(item => item.id);
    const from = ids.indexOf(entry.id), to = from + (event.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    commit(reorderVisible(store.entries, ids), `${entry.title} moved to position ${to + 1} of ${ids.length}.`);
    [...$('#entries').children].find(item => item.dataset.id === entry.id)?.querySelector('.grip').focus();
  });
  grip.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !store.ready) return;
    event.preventDefault();
    drag = { id: entry.id, pointer: event.pointerId, y: event.clientY, moved: false, grip, node };
    grip.setPointerCapture(event.pointerId);
    node.classList.add('dragging');
  });
  grip.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (Math.abs(event.clientY - drag.y) > 5) drag.moved = true;
    if (!drag.moved) return;
    const siblings = [...$('#entries').children].filter(item => item !== node);
    const after = siblings.find(item => event.clientY < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2);
    if (node.nextElementSibling !== (after ?? null)) {
      $('#entries').insertBefore(node, after ?? null);
      // Reparenting releases pointer capture, including Safari touch pointers.
      // Recapture after the move so subsequent motion and release reach the grip.
      grip.setPointerCapture(event.pointerId);
    }
    if (event.clientY > innerHeight - 75) window.scrollBy(0, 16);
    else if (event.clientY < 75) window.scrollBy(0, -16);
  });
  function finish(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.pointer) return;
    const moved = drag.moved;
    const ids = [...$('#entries').children].map(item => item.dataset.id);
    drag = null;
    node.classList.remove('dragging');
    if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
    if (!cancelled && moved) commit(reorderVisible(store.entries, ids), `${entry.title} reordered.`);
    else render();
    [...$('#entries').children].find(item => item.dataset.id === entry.id)?.querySelector('.grip').focus({ preventScroll: true });
  }
  grip.addEventListener('pointerup', event => finish(event));
  grip.addEventListener('pointercancel', event => finish(event, true));
  node.append(check, body, grip);
  return node;
}
function render() {
  const focusedId = document.activeElement?.closest('.entry')?.dataset.id;
  const focusedAction = document.activeElement?.dataset.action;
  if (drag) {
    drag.node.classList.remove('dragging');
    if (drag.grip.hasPointerCapture(drag.pointer)) drag.grip.releasePointerCapture(drag.pointer);
    drag = null;
  }
  const shown = visibleEntries(store.entries, query, filter);
  $('#entries').replaceChildren(...shown.map(card));
  $('#save-status').textContent = store.status;
  $('#save-status').dataset.error = String(store.error);
  $('#auth-button').textContent = store.uid ? 'Sign out' : 'Sign in to sync';
  $('#add-button').disabled = !store.ready;
  $('#empty-add').disabled = !store.ready;
  $('#export-button').disabled = !store.ready;
  $('#import-button').disabled = !store.ready;
  $('#entry-count').textContent = `${shown.length} ${shown.length === 1 ? 'entry' : 'entries'}`;
  $('#empty').hidden = shown.length !== 0 || !store.ready;
  const filtered = Boolean(query || filter !== 'all');
  $('#empty-title').textContent = filtered ? 'Nothing here just yet.' : 'Room for something new.';
  $('#empty-description').textContent = query ? 'Try another search, or switch your filter.' : filter === 'done' ? 'Check off an entry when you have finished learning it.' : filter === 'todo' ? 'All caught up. Add your next curiosity.' : 'Add a link you want to come back to.';
  $('#empty-add').hidden = filtered;
  $('#clear-search').hidden = !query;
  $$('.filters button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  if (focusedId && focusedAction) {
    const replacement = [...$('#entries').children].find(node => node.dataset.id === focusedId);
    const button = replacement && [...replacement.querySelectorAll('button')].find(node => node.dataset.action === focusedAction);
    (button ?? $(`.filters button[data-filter="${filter}"]`)).focus({ preventScroll: true });
  }
}
function openEditor(entry = null) {
  if (!store.ready) return;
  editingId = entry?.id ?? null;
  $('#entry-dialog-title').textContent = entry ? 'Make it your own.' : 'A new next step.';
  $('#entry-form').reset();
  $('#entry-title').value = entry?.title ?? '';
  $('#entry-urls').value = entry?.urls.join('\n') ?? '';
  $('#entry-notes').value = entry?.notes ?? '';
  $('#entry-error').textContent = '';
  $('#entry-dialog').showModal();
  $('#entry-title').focus();
}
$('#add-button').addEventListener('click', () => openEditor());
$('#empty-add').addEventListener('click', () => openEditor());
$$('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$('#entry-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const old = store.entries.find(entry => entry.id === editingId);
    const entry = validateEntry({ id: editingId ?? newId(), title: $('#entry-title').value, urls: $('#entry-urls').value.split('\n').map(url => url.trim()).filter(Boolean), notes: $('#entry-notes').value, done: old?.done ?? false });
    const next = editingId ? store.entries.map(item => item.id === editingId ? entry : item) : [...store.entries, entry];
    if (commit(next, `${entry.title} saved.`)) {
      $('#entry-dialog').close();
      $('#add-button').focus({ preventScroll: true });
      toast(editingId ? 'Entry updated.' : 'Added to your next steps.');
    }
  } catch (error) { $('#entry-error').textContent = error.message; }
});
$('#confirm-delete').addEventListener('click', () => {
  if (commit(store.entries.filter(entry => entry.id !== deletingId), 'Entry deleted.')) { $('#delete-dialog').close(); $('#add-button').focus({ preventScroll: true }); toast('Entry deleted.'); }
});
$('#search').addEventListener('input', event => { query = event.target.value; render(); });
$('#clear-search').addEventListener('click', () => { query = ''; $('#search').value = ''; render(); $('#search').focus(); });
$$('.filters button').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; render(); }));
function closeMenu() { $('#tools-menu').hidden = true; $('#menu-toggle').setAttribute('aria-expanded', 'false'); }
$('#menu-toggle').addEventListener('click', () => { const open = $('#tools-menu').hidden; $('#tools-menu').hidden = !open; $('#menu-toggle').setAttribute('aria-expanded', String(open)); });
document.addEventListener('click', event => { if (!event.target.closest('.topbar')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#tools-menu').hidden) { closeMenu(); $('#menu-toggle').focus(); } });
$('#auth-button').addEventListener('click', async () => {
  closeMenu();
  $('#auth-button').disabled = true;
  try { await (store.uid ? platform.signOut() : platform.signIn()); }
  catch { toast('Sign-in is unavailable. You can keep using your device list.'); }
  finally { $('#auth-button').disabled = false; }
});
$('#export-button').addEventListener('click', () => {
  closeMenu();
  const blob = new Blob([exportData(store.entries)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = element('a'); link.href = url; link.download = `learning-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast('Your JSON export is ready.');
});
$('#import-button').addEventListener('click', () => { closeMenu(); $('#import-file').click(); });
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file) return;
  const generation = store.generation;
  try {
    if (file.size > 1000000) throw new Error('Import files must be smaller than 1 MB.');
    imported = parseImport(await file.text());
    if (generation !== store.generation) return;
    $('#import-summary').textContent = `${imported.length} ${imported.length === 1 ? 'entry is' : 'entries are'} ready to import, including ${imported.filter(entry => entry.done).length} marked done.`;
    $('#import-error').textContent = '';
    $('#import-dialog').showModal();
  } catch (error) { toast(error.message); }
});
function finishImport(replace) {
  try {
    // Adding the same export again must not create duplicate IDs.
    const next = replace ? imported : [...store.entries, ...imported.map(entry => ({ ...entry, id: newId() }))];
    validateEntries(next);
    if (commit(next, 'Import complete.')) { $('#import-dialog').close(); query = ''; filter = 'all'; $('#search').value = ''; render(); toast('Your list has been imported.'); }
  } catch (error) { $('#import-error').textContent = error.message; }
}
$('#import-add').addEventListener('click', () => finishImport(false));
$('#import-replace').addEventListener('click', () => finishImport(true));
$('#install-button').addEventListener('click', () => { closeMenu(); $('#install-dialog').showModal(); });
platform.onUserChanged(user => {
  $$('dialog[open]').forEach(dialog => dialog.close());
  editingId = null; deletingId = null; imported = []; query = ''; filter = 'all'; $('#search').value = '';
  store.switchUser(user);
}, () => store.setStatus('Sign-in could not be restored. Reload to try again.', true));
window.addEventListener('online', () => store.reconnect());
window.addEventListener('offline', () => store.setStatus(store.uid ? 'Offline · Changes stay on this device until you reconnect' : 'Offline · Saved on this device'));
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => toast('Offline setup did not finish. Reopen while online to retry.'));
}
