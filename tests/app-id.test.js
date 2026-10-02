import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppId } from '../lib/app-id.js';
import { validateFirebaseConfig } from '../config/firebase-config.js';

test('GitHub Pages subpaths use the repository, including nested routes', () => {
  for (const path of ['/videos/', '/videos/index.html', '/videos/projects/123']) {
    assert.equal(resolveAppId({ hostname: 'harshaxnim.github.io', pathname: path }), 'videos');
  }
  assert.equal(resolveAppId({ hostname: 'harshaxnim.github.io', pathname: '/research-tool/' }), 'research-tool');
});
test('explicit APP_ID takes precedence on Pages and custom domains', () => {
  assert.equal(resolveAppId({ override: 'my-app', hostname: 'harshaxnim.github.io', pathname: '/videos/' }), 'my-app');
  assert.equal(resolveAppId({ override: 'my-app', hostname: 'example.com' }), 'my-app');
});
test('local fallback and account sites are predictable', () => {
  assert.equal(resolveAppId({ hostname: 'localhost', pathname: '/some/route' }), 'local-app');
  assert.equal(resolveAppId({ hostname: '127.0.0.1', localFallback: 'dev-project' }), 'dev-project');
  assert.equal(resolveAppId({ hostname: 'harshaxnim.github.io', pathname: '/' }), 'harshaxnim.github.io');
  assert.equal(resolveAppId({ hostname: 'harshaxnim.github.io', pathname: '/index.html' }), 'harshaxnim.github.io');
});
test('malformed and escaping app IDs are rejected', () => {
  for (const override of ['', '.', '..', 'foo/bar', 'a b', 'a'.repeat(129)]) {
    assert.throws(() => resolveAppId({ override }));
  }
  assert.throws(() => resolveAppId({ hostname: 'harshaxnim.github.io', pathname: '/%2Fescape/' }));
  assert.throws(() => resolveAppId({ hostname: 'harshaxnim.github.io', pathname: '/%ZZ/' }));
  assert.equal(resolveAppId({ hostname: 'harshaxnim.github.io.evil.test', pathname: '/videos/' }), 'local-app');
});
test('unconfigured Firebase cannot silently use fake live credentials', () => {
  assert.throws(() => validateFirebaseConfig(null), /not been configured/);
  assert.throws(() => validateFirebaseConfig({ apiKey: 'YOUR_KEY', authDomain: 'x', projectId: 'x', appId: 'x' }), /placeholder/);
});
