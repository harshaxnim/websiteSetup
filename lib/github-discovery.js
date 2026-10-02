import { resolveAppInfo, isTemplateRepository } from './app-info.js';
import { checkAppPage } from './page-status.js';

async function jsonRequest(fetcher, url, allowMissing = false) {
  const response = await fetcher(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub discovery failed (${response.status}). Try again later or add the app manually.`);
  return response.json();
}

export async function discoverTemplateApps({ owner = 'harshaxnim', fetcher = fetch, onProgress = () => {} } = {}) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(owner)) throw new Error('Invalid GitHub account.');
  const repositories = [];
  for (let page = 1; ; page++) {
    const batch = await jsonRequest(fetcher, `https://api.github.com/users/${owner}/repos?type=owner&per_page=100&page=${page}`);
    repositories.push(...batch);
    if (batch.length < 100) break;
  }
  const apps = [];
  for (const [index, repository] of repositories.entries()) {
    if (isTemplateRepository(repository.full_name) || repository.private || repository.fork) continue;
    onProgress(`Checking ${repository.name} (${index + 1}/${repositories.length})…`);
    const detail = await jsonRequest(fetcher, `https://api.github.com/repos/${repository.full_name}`);
    let inherited = isTemplateRepository(detail.template_repository?.full_name);
    if (!inherited) {
      const marker = await jsonRequest(fetcher, `https://api.github.com/repos/${repository.full_name}/contents/template.json`, true);
      if (marker?.content) {
        try { inherited = isTemplateRepository(JSON.parse(atob(marker.content.replace(/\s/g, ''))).template); }
        catch { inherited = false; }
      }
    }
    if (!inherited) continue;
    const info = resolveAppInfo({
      repository: repository.full_name,
      details: { description: repository.description || '', status: repository.archived ? 'archived' : 'development' },
      hostname: `${owner}.github.io`, pathname: `/${repository.name}/`,
    });
    // Manifests provide branding; an actual page request determines reachability.
    if (repository.has_pages && !repository.archived) {
      try {
        const response = await fetcher(new URL('app-manifest.json', info.url).href);
        if (response.ok) {
          const manifest = await response.json();
          if (isTemplateRepository(manifest.template) && manifest.repository === repository.full_name) {
            Object.assign(info, { name: manifest.name || info.name, description: manifest.description || info.description, appId: manifest.appId || info.appId, url: manifest.url || info.url, iconUrl: manifest.iconUrl || info.iconUrl, themeColor: manifest.themeColor || info.themeColor });
          }
        }
      } catch { /* A missing/unreachable manifest leaves the app in development. */ }
    }
    if (!repository.archived && (await checkAppPage(info.url, { fetcher })).state === 'reachable') info.status = 'live';
    apps.push(info);
  }
  return apps;
}
