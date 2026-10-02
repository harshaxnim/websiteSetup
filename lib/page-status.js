// The browser must see an actual HTTP response. Opaque no-cors responses cannot
// establish availability; a CORS/network failure is reported as unverified.
export async function checkAppPage(url, { fetcher = fetch, timeoutMs = 10000 } = {}) {
  let target;
  try { target = new URL(url); }
  catch { return { state: 'unverified', reason: 'Invalid app URL' }; }
  if (target.protocol !== 'https:' || target.username || target.password) return { state: 'unverified', reason: 'Invalid app URL' };
  try {
    const response = await fetcher(target.href, {
      method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-cache',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.type === 'opaque' || response.status === 0) return { state: 'unverified', reason: 'The page does not permit browser verification.' };
    // Cancel the body stream once the HTTP result is known; avoid retaining a
    // complete page body for every card just to check whether it is reachable.
    await response.body?.cancel();
    return response.ok ? { state: 'reachable', status: response.status } : { state: 'unavailable', status: response.status };
  } catch (error) {
    return { state: 'unverified', reason: error.name === 'TimeoutError' ? 'The check timed out.' : 'The browser could not verify this page (network or CORS).' };
  }
}
