import { FrontNavError } from './errors.js';

/**
 * Fetch a single location's nav tree from the backend.
 *
 * The route is `/api/v1/front-nav` — same prefix as configured on the
 * Laravel side via `front-nav.route_prefix` + the literal `front-nav`.
 *
 * @param {FetchLike} http
 * @param {FetchNavOptions} options
 * @returns {Promise<NavResponse>}
 */
export async function fetchNav(http, options) {
  const params = new URLSearchParams();
  params.set('location', options.location);
  if (options.locale) {
    params.set('locale', options.locale);
  }
  const path = `/api/v1/front-nav?${params.toString()}`;

  let result;
  try {
    result = await http.request(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
  } catch (e) {
    throw new FrontNavError(`fetchNav: network failure for ${path}`, undefined, e);
  }

  if (!result.ok) {
    throw new FrontNavError(
      `fetchNav: HTTP ${result.status} for ${path}`,
      result.status,
    );
  }

  const data = result.data;
  if (!data || !Array.isArray(data.data) || typeof data.meta !== 'object') {
    throw new FrontNavError(`fetchNav: malformed payload for ${path}`);
  }

  return /** @type {NavResponse} */ (data);
}
