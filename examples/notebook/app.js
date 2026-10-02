import { appId, signIn, signOut, onUserChanged, getStorage } from '../../lib/platform.js';

const $ = id => document.getElementById(id);
let user = null;
let generation = 0;
let unsubscribeNotes;
let notes = [];
let storage;

function notice(message = '') {
  $('notice').textContent = message;
  $('notice').hidden = !message;
}
function report(error) {
  console.error(error);
  notice(error.code === 'auth/popup-blocked' ? 'Your browser blocked the sign-in window. Allow popups and try again.' : error.message || 'Something went wrong. Please try again.');
}
function setEditor(enabled) {
  for (const id of ['note-title', 'note-body', 'save-button']) $(id).disabled = !enabled;
}
function renderNotes() {
  $('note-count').textContent = String(notes.length);
  const container = $('notes');
  container.replaceChildren();
  if (!notes.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('span');
    icon.className = 'empty-icon'; icon.textContent = '✳'; icon.setAttribute('aria-hidden', 'true');
    const title = document.createElement('h3'); title.textContent = 'Good ideas start here.';
    const description = document.createElement('p');
    description.textContent = user ? 'Jot something down. It will be here when you return.' : 'Sign in, jot something down, and come back to it anytime.';
    empty.append(icon, title, description); container.append(empty);
    return;
  }
  for (const { id, data } of notes) {
    const card = document.createElement('article'); card.className = 'note-card';
    const top = document.createElement('div'); top.className = 'note-top';
    const title = document.createElement('h3'); title.textContent = String(data.title ?? 'Untitled');
    const remove = document.createElement('button');
    remove.className = 'delete-note'; remove.type = 'button'; remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete ${data.title ?? 'note'}`);
    remove.addEventListener('click', async () => {
      const currentGeneration = generation;
      remove.disabled = true;
      try { await storage.deleteDocument(`notes/${id}`); }
      catch (error) { if (generation === currentGeneration) { report(error); remove.disabled = false; } }
    });
    top.append(title, remove);
    const body = document.createElement('p'); body.textContent = String(data.body ?? '');
    const timestamp = document.createElement('time');
    const date = new Date(data.createdAt);
    if (!Number.isNaN(date.getTime())) {
      timestamp.dateTime = date.toISOString();
      timestamp.textContent = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    card.append(top, body, timestamp); container.append(card);
  }
}

$('app-identity').textContent = appId.toUpperCase();
$('auth-button').addEventListener('click', async () => {
  $('auth-button').disabled = true;
  notice();
  try { if (user) await signOut(); else await signIn(); }
  catch (error) { if (error.code !== 'auth/popup-closed-by-user') report(error); }
  finally { $('auth-button').disabled = false; }
});
$('note-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!user) return;
  const title = $('note-title').value.trim();
  if (!title) return;
  const currentGeneration = generation;
  setEditor(false); notice();
  $('composer-hint').textContent = 'Saving…';
  try {
    await storage.addDocument('notes', { title, body: $('note-body').value.trim(), createdAt: Date.now() });
    if (generation !== currentGeneration) return;
    $('note-form').reset();
    $('composer-hint').textContent = 'Saved to your notebook.';
  } catch (error) {
    if (generation === currentGeneration) { report(error); $('composer-hint').textContent = 'Could not save. Try again.'; }
  } finally {
    if (generation === currentGeneration) setEditor(!!user);
  }
});

try {
  storage = getStorage();
  $('auth-button').disabled = true;
  onUserChanged(currentUser => {
    generation++;
    unsubscribeNotes?.(); unsubscribeNotes = undefined;
    user = currentUser; notes = [];
    $('note-form').reset();
    notice(); renderNotes(); setEditor(!!user);
    $('auth-button').disabled = false;
    $('auth-button').textContent = user ? 'Sign out' : 'Sign in with Google ↗';
    $('user-name').textContent = user?.displayName || user?.email || '';
    $('composer-hint').textContent = 'A fresh page awaits.';
    $('storage-status').textContent = user ? 'Loading your notebook…' : 'Sign in to keep your notes with you.';
    if (user) {
      const currentGeneration = generation;
      unsubscribeNotes = storage.subscribeCollection('notes', data => {
        if (generation !== currentGeneration) return;
        notes = data;
        renderNotes();
        $('storage-status').textContent = 'Your private notebook is ready.';
      }, error => {
        if (generation !== currentGeneration) return;
        report(error);
        $('storage-status').textContent = 'Your notebook could not be loaded.';
      }, { orderBy: [['createdAt', 'desc']] });
    }
  }, report);
} catch (error) {
  $('auth-button').disabled = true;
  $('storage-status').textContent = 'The shared platform is awaiting its one-time setup.';
  report(error);
}
