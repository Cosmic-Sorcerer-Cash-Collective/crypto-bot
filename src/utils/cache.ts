import { cache, CACHE_TTL, type dataBinance } from './type'

export function getCache (symbol: string, interval: string): dataBinance[] | null {
  const cachedEntry = cache[symbol]
  if (cachedEntry !== undefined && cachedEntry.expiry > Date.now()) {
    return cachedEntry.data[interval] ?? null
  }
  return null
}

export function setCache (symbol: string, interval: string, data: dataBinance[]): void {
  if (cache[symbol] === undefined) {
    cache[symbol] = { data: {}, expiry: 0 }
  }
  cache[symbol].data[interval] = data
  cache[symbol].expiry = Date.now() + CACHE_TTL[interval]
}

export function cleanCache (): void {
  const now = Date.now()
  for (const [symbol, entry] of Object.entries(cache)) {
    if (entry.expiry <= now) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete cache[symbol]
    }
  }
}

setInterval(cleanCache, 5 * 60 * 1000)
