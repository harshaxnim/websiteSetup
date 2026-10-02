import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAppPage } from '../lib/page-status.js';

test('page checks make an actual GET without credentials and accept only readable HTTP success', async () => {
  let called;
  const result = await checkAppPage('https://example.com/app/', { fetcher: async (url, options) => {
    called = { url, options }; return { status: 200, ok: true, type: 'basic' };
  } });
  assert.equal(called.url, 'https://example.com/app/');
  assert.equal(called.options.method, 'GET');
  assert.equal(called.options.mode, 'cors');
  assert.equal(called.options.credentials, 'omit');
  assert.equal(result.state, 'reachable');
});
test('HTTP failure is distinct from CORS/network/timeout and opaque responses', async () => {
  assert.equal((await checkAppPage('https://example.com/', { fetcher: async () => ({ status: 404, ok: false }) })).state, 'unavailable');
  for (const fetcher of [async () => { throw new TypeError('Failed to fetch'); }, async () => ({ type: 'opaque', status: 0 }), async () => { throw Object.assign(new Error('Timed out'), { name: 'TimeoutError' }); }]) {
    assert.equal((await checkAppPage('https://example.com/', { fetcher })).state, 'unverified');
  }
});
test('invalid and credential-bearing page URLs are rejected before requesting', async () => {
  const fetcher = async () => { throw new Error('Must not make a request'); };
  for (const url of ['javascript:alert(1)', 'https://user:pass@example.com/', 'invalid']) assert.equal((await checkAppPage(url, { fetcher })).state, 'unverified');
});
