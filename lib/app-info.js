import { resolveAppId } from './app-id.js';

export const TEMPLATE_REPOSITORY = 'harshaxnim/websiteSetup';
export const APP_STATUSES = ['planning', 'development', 'live', 'paused', 'archived'];
const REPOSITORY = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/;

export function resolveAppInfo({ repository, override, details = {}, hostname = '', pathname = '/' }) {
  if (!REPOSITORY.test(repository)) throw new Error('Use a valid GitHub owner/repository identity.');
  const [owner, repo] = repository.split('/');
  const appId = resolveAppId({ override, hostname, pathname, localFallback: repo });
  return {
    appId,
    repository,
    name: details.name || repo.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
    description: details.description || '',
    status: details.status || 'development',
    url: details.url || `https://${owner.toLowerCase()}.github.io/${repo.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '' : `${encodeURIComponent(repo)}/`}`,
    repositoryUrl: `https://github.com/${repository}`,
    template: TEMPLATE_REPOSITORY,
  };
}

export function registryId(repository) {
  if (!REPOSITORY.test(repository)) throw new Error('Use a valid GitHub owner/repository identity.');
  return repository.toLowerCase().replace('/', '--');
}

export function validateAppRecord(record) {
  registryId(record.repository);
  if (record.template !== TEMPLATE_REPOSITORY) throw new Error('This directory tracks apps from the shared template.');
  if (!APP_STATUSES.includes(record.status)) throw new Error('Choose a valid app status.');
  if (typeof record.appId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(record.appId)) throw new Error('Invalid application ID.');
  if (typeof record.name !== 'string' || !record.name.trim() || record.name.length > 120) throw new Error('App names must be 1–120 characters.');
  if (typeof record.description !== 'string' || record.description.length > 1000) throw new Error('Descriptions must be at most 1,000 characters.');
  const url = new URL(record.url);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('App links must use HTTPS without embedded credentials.');
  if (record.url.length > 2048 || record.repositoryUrl !== `https://github.com/${record.repository}`) throw new Error('Invalid app or repository URL.');
  return record;
}
