/**
 * Only allow in-app relative paths for post-login redirects.
 */
export function safeInternalPath(raw: string | null | undefined, fallback = '/me'): string {
  if (typeof raw !== 'string') {
    return fallback
  }

  const path = raw.trim()
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return fallback
  }

  if (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/forgot-password')) {
    return fallback
  }

  return path
}
