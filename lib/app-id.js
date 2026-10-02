const VALID_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

export function validateAppId(value) {
  if (typeof value !== 'string' || !VALID_ID.test(value) || value === '.' || value === '..') {
    throw new Error('APP_ID must be 1–128 letters, digits, dots, underscores, or hyphens, starting with a letter or digit.');
  }
  return value;
}

export function resolveAppId({ override, hostname = '', pathname = '/', localFallback = 'local-app' } = {}) {
  if (override !== undefined && override !== null) return validateAppId(override);
  const segments = pathname.split('/').filter(Boolean);
  if (hostname.toLowerCase().endsWith('.github.io')) {
    if (segments.length && segments[0] !== 'index.html') {
      let first;
      try { first = decodeURIComponent(segments[0]); }
      catch { throw new Error('The GitHub Pages path contains invalid URL encoding.'); }
      return validateAppId(first);
    }
    // Account sites have no repository path: the host is a stable namespace.
    return validateAppId(hostname.toLowerCase());
  }
  return validateAppId(localFallback);
}
