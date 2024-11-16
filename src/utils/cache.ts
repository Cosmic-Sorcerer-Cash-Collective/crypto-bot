import redis from '../config/redis'
import { CACHE_TTL, type dataBinance } from './type'

export async function getCache (symbol: string, interval: string): Promise<dataBinance[] | null> {
  const key = `${symbol}:${interval}`
  try {
    const cachedData = await redis.get(key)
    if (cachedData === null) {
      return null
    }
    try {
      return JSON.parse(cachedData as string) as dataBinance[]
    } catch (parseError) {
      console.error(`Erreur de parsing JSON pour ${key}:`, parseError)
      return null
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération du cache pour ${key}:`, error)
    return null
  }
}

export async function setCache (symbol: string, interval: string, data: dataBinance[]): Promise<void> {
  const key = `${symbol}:${interval}`
  const ttl = CACHE_TTL[interval] ?? 3600
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl)
  } catch (error) {
    console.error(`Erreur lors de l'enregistrement dans le cache pour ${key}:`, error)
  }
}
