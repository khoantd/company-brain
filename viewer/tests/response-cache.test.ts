import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTtlCache } from '../server/response-cache'

describe('createTtlCache', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('stores and returns values before TTL', () => {
    const cache = createTtlCache(1_000)
    cache.set('tree', { tree: [] })
    expect(cache.get('tree')).toEqual({ tree: [] })
  })

  it('expires entries after TTL', () => {
    vi.useFakeTimers()
    const cache = createTtlCache(1_000)
    cache.set('overview', { ok: true })
    vi.advanceTimersByTime(1_001)
    expect(cache.get('overview')).toBeUndefined()
  })

  it('invalidates selected keys', () => {
    const cache = createTtlCache(60_000)
    cache.set('tree', 1)
    cache.set('overview', 2)
    cache.invalidate('tree')
    expect(cache.get('tree')).toBeUndefined()
    expect(cache.get('overview')).toBe(2)
  })

  it('clears all keys', () => {
    const cache = createTtlCache(60_000)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
  })
})
