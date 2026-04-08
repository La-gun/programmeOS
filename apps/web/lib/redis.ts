import Redis from 'ioredis'

let singleton: Redis | null | undefined

/**
 * Redis is optional for local dev: when `REDIS_URL` is unset, callers should use the in-memory idempotency fallback.
 */
export function getRedis(): Redis | null {
  if (singleton !== undefined) {
    return singleton
  }
  const url = process.env.REDIS_URL?.trim()
  if (!url) {
    singleton = null
    return null
  }
  singleton = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true
  })
  return singleton
}

export async function disconnectRedis(): Promise<void> {
  if (singleton && singleton !== null) {
    await singleton.quit().catch(() => {})
  }
  singleton = undefined
}
