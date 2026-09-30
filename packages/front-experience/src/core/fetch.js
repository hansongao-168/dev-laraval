import { FrontExperienceError } from './errors.js';

/**
 * @param {import('./types.d.ts').FetchLike} http
 * @param {string} path
 * @param {AbortSignal} [signal]
 */
async function getJson(http, path, signal) {
  let result;
  try {
    result = await http.request(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (e) {
    throw new FrontExperienceError(`network failure for ${path}`, undefined, e);
  }

  if (!result.ok) {
    throw new FrontExperienceError(`HTTP ${result.status} for ${path}`, result.status);
  }

  return result.data;
}

/**
 * @param {import('./types.d.ts').FetchLike} http
 * @param {{ slug: string; channel?: string; at?: string; theme?: string; skin?: string; id?: string|number; q?: string; page?: string|number; query?: Record<string, string|number|undefined|null>; signal?: AbortSignal }} options
 * @returns {Promise<import('./types.d.ts').ResolvedPage>}
 */
export async function fetchPage(http, options) {
  const params = new URLSearchParams();
  if (options.channel) params.set('channel', options.channel);
  if (options.at) params.set('at', options.at);
  if (options.theme) params.set('theme', options.theme);
  if (options.skin) params.set('skin', options.skin);
  if (options.id !== undefined && options.id !== null && `${options.id}` !== '') {
    params.set('id', String(options.id));
  }
  if (options.q !== undefined && options.q !== null && `${options.q}` !== '') {
    params.set('q', String(options.q));
  }
  if (options.page !== undefined && options.page !== null && `${options.page}` !== '') {
    params.set('page', String(options.page));
  }
  if (options.query && typeof options.query === 'object') {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || `${value}` === '') {
        continue;
      }
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  const path = `/api/v1/front-pages/${encodeURIComponent(options.slug)}${qs ? `?${qs}` : ''}`;
  const payload = await getJson(http, path, options.signal);

  if (!payload?.data?.document || !payload?.data?.skin) {
    throw new FrontExperienceError(`malformed page payload for ${path}`);
  }

  return payload.data;
}

/**
 * @param {import('./types.d.ts').FetchLike} http
 * @param {string} code
 * @param {AbortSignal} [signal]
 */
export async function fetchSkin(http, code, signal) {
  const path = `/api/v1/front-templates/skins/${encodeURIComponent(code)}`;
  const payload = await getJson(http, path, signal);
  if (!payload?.data?.code) {
    throw new FrontExperienceError(`malformed skin payload for ${path}`);
  }
  return payload.data;
}

/**
 * @param {import('./types.d.ts').FetchLike} http
 * @param {{ at?: string; channel?: string; signal?: AbortSignal }} [options]
 */
export async function fetchActiveTheme(http, options = {}) {
  const params = new URLSearchParams();
  if (options.at) params.set('at', options.at);
  if (options.channel) params.set('channel', options.channel);
  const qs = params.toString();
  const path = `/api/v1/front-templates/themes/active${qs ? `?${qs}` : ''}`;
  const payload = await getJson(http, path, options.signal);
  return payload?.data ?? null;
}

/**
 * @param {import('./types.d.ts').FetchLike} http
 * @param {{ channel?: string; signal?: AbortSignal }} [options]
 */
export async function fetchBlockTypes(http, options = {}) {
  const params = new URLSearchParams();
  if (options.channel) params.set('channel', options.channel);
  const qs = params.toString();
  const path = `/api/v1/front-shell/block-types${qs ? `?${qs}` : ''}`;
  const payload = await getJson(http, path, options.signal);
  if (!Array.isArray(payload?.data)) {
    throw new FrontExperienceError(`malformed block-types payload for ${path}`);
  }
  return payload.data;
}

/**
 * @param {import('./types.d.ts').FetchLike} http
 * @param {AbortSignal} [signal]
 */
export async function fetchShells(http, signal) {
  const payload = await getJson(http, '/api/v1/front-shell/shells', signal);
  if (!Array.isArray(payload?.data)) {
    throw new FrontExperienceError('malformed shells payload');
  }
  return payload.data;
}

/**
 * @param {import('./types.d.ts').FetchLike} http
 * @param {AbortSignal} [signal]
 * @returns {Promise<import('./types.d.ts').CapabilityInfo[]>}
 */
export async function fetchCapabilities(http, signal) {
  const payload = await getJson(http, '/api/v1/front-shell/capabilities', signal);
  if (!Array.isArray(payload?.data)) {
    throw new FrontExperienceError('malformed capabilities payload');
  }
  return payload.data;
}
