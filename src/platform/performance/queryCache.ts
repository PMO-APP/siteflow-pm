type CacheEntry<T> = { value: T; expiresAt: number; promise?: Promise<T> }

const cache = new Map<string, CacheEntry<unknown>>()

export async function cachedQuery<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = 30_000,
): Promise<T> {
  const now = Date.now()
  const existing = cache.get(key) as CacheEntry<T> | undefined
  if (existing && existing.expiresAt > now) return existing.value
  if (existing?.promise) return existing.promise

  const promise = loader()
  cache.set(key, { value: existing?.value as T, expiresAt: 0, promise })
  try {
    const value = await promise
    cache.set(key, { value, expiresAt: now + ttlMs })
    return value
  } catch (error) {
    cache.delete(key)
    throw error
  }
}

export function invalidateCachedQuery(prefix?: string) {
  if (!prefix) return cache.clear()
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key)
}
