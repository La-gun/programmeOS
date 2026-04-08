/**
 * Base URL for links shown to end users (e.g. QR codes). Prefer NEXT_PUBLIC_APP_URL when
 * NEXTAUTH_URL is localhost (phones cannot reach your PC's "localhost").
 */
export function getPublicAppOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) {
    return stripTrailingSlash(explicit)
  }
  const nextAuth = process.env.NEXTAUTH_URL?.trim()
  if (nextAuth) {
    return stripTrailingSlash(nextAuth)
  }
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const host = stripTrailingSlash(vercel).replace(/^https?:\/\//i, '')
    return `https://${host}`
  }
  return null
}

export function buildAppEntryUrl(path: string): string | null {
  const origin = getPublicAppOrigin()
  if (!origin) {
    return null
  }
  const p = path.startsWith('/') ? path : `/${path}`
  return `${origin}${p}`
}

export function originLooksLikeLocalhost(origin: string): boolean {
  try {
    const u = new URL(origin)
    const h = u.hostname.toLowerCase()
    return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')
  } catch {
    return false
  }
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '')
}
