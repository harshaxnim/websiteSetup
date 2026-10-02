import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppInfo, validateAppRecord } from '../lib/app-info.js';

test('repository metadata resolves zero-config app identity and links', () => {
  const info = resolveAppInfo({ repository: 'harshaxnim/research-tool', hostname: 'harshaxnim.github.io', pathname: '/research-tool/' });
  assert.equal(info.appId, 'research-tool');
  assert.equal(info.name, 'Research Tool');
  assert.equal(info.url, 'https://harshaxnim.github.io/research-tool/');
  assert.equal(info.repositoryUrl, 'https://github.com/harshaxnim/research-tool');
  assert.equal(info.iconUrl, 'https://harshaxnim.github.io/research-tool/icon.svg');
  assert.equal(info.themeColor, '#b97053');
  assert.equal(validateAppRecord(info), info);
});
test('explicit identity and presentation override defaults', () => {
  const info = resolveAppInfo({ repository: 'harshaxnim/new-name', override: 'stable-id', details: { name: 'Notes', description: 'My notes', status: 'planning' } });
  assert.equal(info.appId, 'stable-id');
  assert.equal(info.name, 'Notes');
  assert.equal(info.status, 'planning');
});
test('directory records reject unsafe URLs, invalid status, and mismatched repository URLs', () => {
  const info = resolveAppInfo({ repository: 'harshaxnim/videos' });
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://name:password@example.com']) assert.throws(() => validateAppRecord({ ...info, url }));
  assert.throws(() => validateAppRecord({ ...info, status: 'invented' }));
  assert.throws(() => validateAppRecord({ ...info, repositoryUrl: 'https://github.com/other/repo' }));
  assert.throws(() => validateAppRecord({ ...info, template: 'other/template' }));
  assert.throws(() => validateAppRecord({ ...info, appId: '../escape' }));
  assert.throws(() => validateAppRecord({ ...info, themeColor: 'red; display:none' }));
  assert.throws(() => validateAppRecord({ ...info, iconUrl: 'javascript:alert(1)' }));
});
