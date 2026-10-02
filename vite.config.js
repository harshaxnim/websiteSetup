import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { resolveAppInfo } from './lib/app-info.js';
import { APP_ID, APP_DETAILS } from './config/app-config.js';

// Relative assets work at both / and GitHub Pages repository subpaths.
function repositoryIdentity() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const match = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!match) throw new Error('Set GITHUB_REPOSITORY=owner/repository for a checkout without a GitHub origin.');
  return match[1];
}
const repository = repositoryIdentity();
const [owner, repo] = repository.split('/');
const manifest = resolveAppInfo({ repository, override: APP_ID, details: APP_DETAILS, hostname: `${owner}.github.io`, pathname: `/${repo}/` });
export default defineConfig({
  base: './',
  define: { __APP_REPOSITORY__: JSON.stringify(repository) },
  build: { rollupOptions: { input: { directory: 'index.html', notebook: 'examples/notebook/index.html' } } },
  plugins: [{
    name: 'app-manifest',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'app-manifest.json', source: JSON.stringify(manifest, null, 2) }); },
  }],
});
