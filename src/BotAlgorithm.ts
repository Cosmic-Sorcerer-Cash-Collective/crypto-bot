import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateIchimoku,
  calculateFibonacciLevels
} from './TechnicalIndicator'
import { type BollingerBandsResult, type IchimokuResult, type MACDResult, type dataBinance } from './utils/type'

export function generateSignals (
  dataMultiTimeframe: {
    '5m': dataBinance[]
    '15m': dataBinance[]
    '1h': dataBinance[]
    '6h': dataBinance[]
    '1d': dataBinance[]
  }
): { buy: boolean, sell: boolean } {
  const timeframes = ['5m', '15m', '1h', '6h', '1d'] as const

  const closes: Record<string, number[]> = {}
  const highs: Record<string, number[]> = {}
  const lows: Record<string, number[]> = {}

  for (const tf of timeframes) {
    closes[tf] = dataMultiTimeframe[tf].map((d) => parseFloat(d.close))
    highs[tf] = dataMultiTimeframe[tf].map((d) => parseFloat(d.high))
    lows[tf] = dataMultiTimeframe[tf].map((d) => parseFloat(d.low))
  }

  // Typage explicite de l'objet indicators
  const indicators: {
    RSI: Record<string, number[]>
    MACD: Record<string, MACDResult>
    BollingerBands: Record<string, BollingerBandsResult>
    Ichimoku: Record<string, IchimokuResult>
    Fibonacci: Record<string, number[]>
  } = {
    RSI: {},
    MACD: {},
    BollingerBands: {},
    Ichimoku: {},
    Fibonacci: {}
  }

  for (const tf of timeframes) {
    const close = closes[tf]
    const high = highs[tf]
    const low = lows[tf]

    // RSI
    indicators.RSI[tf] = calculateRSI(close, 14)

    // MACD
    indicators.MACD[tf] = calculateMACD(close, 12, 26, 9)

    // Bandes de Bollinger
    indicators.BollingerBands[tf] = calculateBollingerBands(close, 20, 2)

    // Ichimoku Cloud
    indicators.Ichimoku[tf] = calculateIchimoku(high, low, close)

    // Niveaux de Fibonacci
    const recentHigh = Math.max(...high.slice(-20))
    const recentLow = Math.min(...low.slice(-20))
    indicators.Fibonacci[tf] = calculateFibonacciLevels(recentHigh, recentLow)
  }

  // Détermination de la tendance à partir des timeframes supérieurs (1D, 6h)
  let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways'

  // Utiliser MACD et Ichimoku sur 1D pour déterminer la tendance
  const macd1d = indicators.MACD['1d'].macd
  const signal1d = indicators.MACD['1d'].signal
  const lastMacd1d = macd1d[macd1d.length - 1]
  const lastSignal1d = signal1d[signal1d.length - 1]

  if (lastMacd1d > lastSignal1d) {
    trend = 'uptrend'
  } else if (lastMacd1d < lastSignal1d) {
    trend = 'downtrend'
  }

  // Utiliser les timeframes inférieurs pour trouver des points d'entrée/sortie
  const rsi15m = indicators.RSI['15m']
  const lastRsi15m = rsi15m[rsi15m.length - 1]

  const bb15m = indicators.BollingerBands['15m']
  const lastClose15m = closes['15m'][closes['15m'].length - 1]
  const lastUpperBand15m = bb15m.upperBand[bb15m.upperBand.length - 1]
  const lastLowerBand15m = bb15m.lowerBand[bb15m.lowerBand.length - 1]

  let buySignal = false
  let sellSignal = false

  if (trend === 'uptrend') {
    // En tendance haussière, chercher des conditions de survente pour acheter
    if (lastRsi15m < 30 && lastClose15m < lastLowerBand15m) {
      buySignal = true
    }
  } else if (trend === 'downtrend') {
    // En tendance baissière, chercher des conditions de surachat pour vendre
    if (lastRsi15m > 70 && lastClose15m > lastUpperBand15m) {
      sellSignal = true
    }
  }

  // Ajouter les niveaux de Fibonacci pour renforcer les signaux
  const fibLevels15m = indicators.Fibonacci['15m']
  const lastPrice15m = lastClose15m
  const nearFibLevel = fibLevels15m.some(
    (level) => Math.abs((lastPrice15m - level) / level) < 0.005
  )

  if (buySignal && nearFibLevel) {
    buySignal = true
  } else if (sellSignal && nearFibLevel) {
    sellSignal = true
  }

  // Utiliser l'Ichimoku Cloud pour confirmer les signaux
  const ichimoku15m = indicators.Ichimoku['15m']
  const lastTenkan = ichimoku15m.tenkanSen[ichimoku15m.tenkanSen.length - 1]
  const lastKijun = ichimoku15m.kijunSen[ichimoku15m.kijunSen.length - 1]

  if (buySignal && lastTenkan > lastKijun) {
    buySignal = true
    sellSignal = false
  } else if (sellSignal && lastTenkan < lastKijun) {
    sellSignal = true
    buySignal = false
  } else {
    buySignal = false
    sellSignal = false
  }

  return { buy: buySignal, sell: sellSignal }
}
