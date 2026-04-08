import { getRedis } from '@/lib/redis'

const DEFAULT_TTL_SEC = 60 * 60 * 24 * 7

const memoryStore = new Map<string, number>()

function memoryClaim(key: string, ttlSec: number): boolean {
  const now = Date.now()
  const exp = memoryStore.get(key)
  if (exp && exp > now) {
    return false
  }
  memoryStore.set(key, now + ttlSec * 1000)
  if (memoryStore.size > 50_000) {
    for (const [k, v] of memoryStore) {
      if (v <= now) memoryStore.delete(k)
    }
  }
  return true
}

/**
 * Returns true if this is the first time we see the key (claim succeeded).
 * False means duplicate delivery — respond 200 and skip side effects.
 */
export async function claimInboundMessageOnce(
  provider: string,
  providerMessageId: string,
  ttlSec: number = DEFAULT_TTL_SEC
): Promise<boolean> {
  const key = `messaging:idempotency:${provider}:${providerMessageId}`
  const redis = getRedis()
  if (redis) {
    try {
      if (redis.status !== 'ready') {
        await redis.connect().catch(() => {})
      }
      const res = await redis.set(key, '1', 'EX', ttlSec, 'NX')
      return res === 'OK'
    } catch {
      return memoryClaim(key, ttlSec)
    }
  }
  return memoryClaim(key, ttlSec)
}
