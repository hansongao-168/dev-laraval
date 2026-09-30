/**
 * @param {string | null | undefined} text
 * @param {string | null | undefined} imageUrl
 * @returns {string}
 */
export function composeShareText(text, imageUrl) {
  const body = typeof text === 'string' ? text : '';
  const image = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  if (!image) {
    return body;
  }
  return body ? `${body}\n${image}` : image;
}

/**
 * @param {string | null | undefined} contentType
 * @param {string} [fallback]
 * @returns {string}
 */
export function fileNameForShareImage(contentType, fallback = 'share.png') {
  const type = typeof contentType === 'string' ? contentType.toLowerCase() : '';
  if (type.includes('jpeg') || type.includes('jpg')) {
    return 'share.jpg';
  }
  if (type.includes('webp')) {
    return 'share.webp';
  }
  if (type.includes('gif')) {
    return 'share.gif';
  }
  if (type.includes('png')) {
    return 'share.png';
  }
  return fallback;
}

/**
 * Build a File for Web Share Level 2 when fetch + File are available.
 *
 * @param {string} imageUrl
 * @param {{ fetch?: typeof fetch; File?: typeof File }} [deps]
 * @returns {Promise<File | null>}
 */
export async function fetchShareImageFile(imageUrl, deps = {}) {
  const url = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  if (!url) {
    return null;
  }

  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const FileImpl = deps.File ?? globalThis.File;
  if (typeof fetchImpl !== 'function' || typeof FileImpl !== 'function') {
    return null;
  }

  try {
    const response = await fetchImpl(url);
    if (!response?.ok) {
      return null;
    }
    const blob = await response.blob();
    const type = blob.type && blob.type !== '' ? blob.type : 'image/png';
    return new FileImpl([blob], fileNameForShareImage(type), { type });
  } catch {
    return null;
  }
}

/**
 * Human-readable status for ShareButton / toast strip.
 *
 * @param {'idle' | 'shared' | 'copied' | 'error'} status
 * @param {{ sharedFile?: boolean }} [meta]
 * @returns {string | null}
 */
export function shareStatusMessage(status, meta = {}) {
  if (status === 'shared') {
    return meta.sharedFile ? '已分享（含图片）' : '已分享';
  }
  if (status === 'copied') {
    return '无法唤起系统分享，链接已复制到剪贴板';
  }
  if (status === 'error') {
    return '分享失败：浏览器不支持分享或复制，请手动复制页面链接';
  }
  return null;
}

/** Default auto-dismiss window for ShareButton toast (ms). 0 = manual only. */
export const DEFAULT_SHARE_TOAST_DWELL_MS = 3200;

/**
 * Clamp toast dwell to [0, 60000]. Invalid values fall back to default.
 *
 * @param {unknown} value
 * @param {number} [fallback]
 * @returns {number}
 */
export function normalizeShareToastDwellMs(
  value,
  fallback = DEFAULT_SHARE_TOAST_DWELL_MS,
) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.min(Math.round(parsed), 60_000);
}

/**
 * Prefer sharing with an image file when the browser supports it.
 *
 * @param {ShareData} payload
 * @param {string | null | undefined} imageUrl
 * @param {{
 *   share?: (data: ShareData) => Promise<void>;
 *   canShare?: (data: ShareData) => boolean;
 *   fetchShareImageFile?: typeof fetchShareImageFile;
 * }} [deps]
 * @returns {Promise<'shared-file' | 'shared-link' | 'unsupported'>}
 */
export async function shareWithOptionalImageFile(payload, imageUrl, deps = {}) {
  const share =
    deps.share ??
    (typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      ? navigator.share.bind(navigator)
      : null);
  const canShare =
    deps.canShare ??
    (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
      ? navigator.canShare.bind(navigator)
      : null);

  if (!share) {
    return 'unsupported';
  }

  const fetchFile = deps.fetchShareImageFile ?? fetchShareImageFile;
  const file = await fetchFile(imageUrl ?? '');
  if (file) {
    const withFiles = { ...payload, files: [file] };
    const filesOnly = { title: payload.title, text: payload.text, files: [file] };
    const candidates = [withFiles, filesOnly];
    for (const candidate of candidates) {
      try {
        if (canShare && !canShare(candidate)) {
          continue;
        }
        await share(candidate);
        return 'shared-file';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
      }
    }
  }

  try {
    if (canShare && !canShare(payload)) {
      return 'unsupported';
    }
    await share(payload);
    return 'shared-link';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    return 'unsupported';
  }
}
