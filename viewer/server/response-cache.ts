export type TtlCache = {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  invalidate(...keys: string[]): void
  clear(): void
}

type CacheEntry = {
  value: unknown
  expiresAt: number
}

/** Process-local TTL cache (helps warm Vercel instances; no shared Redis). */
export function createTtlCache(ttlMs = 45_000): TtlCache {
  const map = new Map<string, CacheEntry>()

  return {
    get<T>(key: string): T | undefined {
      const entry = map.get(key)
      if (!entry) return undefined
      if (Date.now() >= entry.expiresAt) {
        map.delete(key)
        return undefined
      }
      return entry.value as T
    },
    set<T>(key: string, value: T): void {
      map.set(key, { value, expiresAt: Date.now() + ttlMs })
    },
    invalidate(...keys: string[]): void {
      for (const key of keys) map.delete(key)
    },
    clear(): void {
      map.clear()
    },
  }
}
