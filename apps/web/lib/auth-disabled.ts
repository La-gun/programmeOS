/**
 * Dev-only login bypass flag. Checked in middleware (edge-safe, no DB).
 * Pair with DISABLE_AUTH in .env.local — never set in production.
 */
export function isAuthDisabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false
  }
  const v = process.env.DISABLE_AUTH?.trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}
