import { signIn, signOut, onUserChanged, getCurrentUser } from '../../lib/platform.js';
const $ = id => document.getElementById(id);
$('secret-settings').href = `https://github.com/${__APP_REPOSITORY__}/settings/secrets/actions`;
onUserChanged(user => {
  $('account').textContent = user ? `Publishing account: ${user.email || user.displayName || 'Signed in'}` : 'Sign in with the account that should own your app entries.';
  $('copy').disabled = !user;
  $('connect').textContent = user ? 'Sign out' : 'Sign in with Google';
});
$('connect').addEventListener('click', async () => {
  $('connect').disabled = true;
  try { if (getCurrentUser()) await signOut(); else await signIn(); }
  catch { $('notice').textContent = 'Sign-in did not finish. Allow the popup and try again.'; }
  finally { $('connect').disabled = false; }
});
$('copy').addEventListener('click', async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('Sign in first.');
    await navigator.clipboard.writeText(user.refreshToken);
    $('notice').textContent = 'Credential copied. Paste it only into the FIREBASE_REFRESH_TOKEN Actions secret.';
  } catch { $('notice').textContent = 'Could not copy the credential. Check sign-in and clipboard permission, then retry.'; }
});
