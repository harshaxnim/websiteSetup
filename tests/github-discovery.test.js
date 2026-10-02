import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverTemplateApps } from '../lib/github-discovery.js';

function response(body, status = 200) { return { ok: status >= 200 && status < 300, status, json: async () => body }; }
test('discovery recognizes template ancestry and markers, excludes unrelated repos, and verifies live manifests', async () => {
  const repos = ['websiteSetup', 'videos', 'research-tool', 'unrelated'].map(name => ({ name, full_name: `harshaxnim/${name}`, has_pages: name === 'videos' }));
  const discovered = await discoverTemplateApps({ fetcher: async url => {
    if (url.includes('/users/')) return response(repos);
    if (url === 'https://api.github.com/repos/harshaxnim/videos') return response({ template_repository: { full_name: 'harshaxnim/websiteSetup' } });
    if (url.endsWith('/research-tool/contents/template.json')) return response({ content: btoa(JSON.stringify({ template: 'harshaxnim/websiteSetup' })) });
    if (url.endsWith('/contents/template.json')) return response(null, 404);
    if (url.endsWith('/app-manifest.json')) return response({ template: 'harshaxnim/websiteSetup', repository: 'harshaxnim/videos', appId: 'videos', name: 'Video Library' });
    if (url === 'https://harshaxnim.github.io/research-tool/') return { ok: false, status: 404 };
    return response({});
  } });
  assert.equal(discovered.length, 2);
  assert.equal(discovered[0].name, 'Video Library');
  assert.equal(discovered[0].status, 'live');
  assert.equal(discovered[1].status, 'development');
});
test('discovery follows pagination and propagates permission/rate-limit errors without inventing apps', async () => {
  let pages = 0;
  await discoverTemplateApps({ fetcher: async url => {
    if (url.includes('/users/')) return response(++pages === 1 ? Array.from({ length: 100 }, (_, i) => ({ full_name: `harshaxnim/repo-${i}`, private: true })) : []);
    throw new Error('Unexpected request');
  } });
  assert.equal(pages, 2);
  await assert.rejects(discoverTemplateApps({ fetcher: async () => response({}, 403) }), /GitHub discovery failed/);
});
test('an unreadable app page is not called live even when Pages is enabled', async () => {
  const apps = await discoverTemplateApps({ fetcher: async url => {
    if (url.includes('/users/')) return response([{ name: 'videos', full_name: 'harshaxnim/videos', has_pages: true }]);
    if (url.endsWith('/app-manifest.json')) return response({ template: 'someone/else', repository: 'harshaxnim/videos' });
    if (url === 'https://harshaxnim.github.io/videos/') return { ok: false, status: 404 };
    return response({ template_repository: { full_name: 'harshaxnim/websiteSetup' } });
  } });
  assert.equal(apps[0].status, 'development');
});
