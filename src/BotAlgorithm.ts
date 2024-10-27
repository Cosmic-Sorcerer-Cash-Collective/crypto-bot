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
    '1m': dataBinance[]
    '3m': dataBinance[]
    '5m': dataBinance[]
    '15m': dataBinance[]
    '30m': dataBinance[]
    '1h': dataBinance[]
  }
): { buy: boolean, sell: boolean, timeframe: string | null, takeProfitPercentage: number } {
  const timeframes = ['1m', '3m', '5m', '15m', '30m', '1h'] as const

  const closes: Record<string, number[]> = {}
  const highs: Record<string, number[]> = {}
  const lows: Record<string, number[]> = {}

  for (const tf of timeframes) {
    closes[tf] = dataMultiTimeframe[tf].map((d) => parseFloat(d.close))
    highs[tf] = dataMultiTimeframe[tf].map((d) => parseFloat(d.high))
    lows[tf] = dataMultiTimeframe[tf].map((d) => parseFloat(d.low))
  }

  const indicators: {
    RSI: Record<string, Array<number | undefined>>
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
    indicators.RSI[tf] = calculateRSI(close, 14)
    indicators.MACD[tf] = calculateMACD(close, 12, 26, 9)
    indicators.BollingerBands[tf] = calculateBollingerBands(close, 20, 2)
    indicators.Ichimoku[tf] = calculateIchimoku(high, low, close)
    const recentHigh = Math.max(...high.slice(-30))
    const recentLow = Math.min(...low.slice(-30))
    indicators.Fibonacci[tf] = calculateFibonacciLevels(recentHigh, recentLow)
  }
  let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways'
  const ichimoku1h = indicators.Ichimoku['1h']
  const lastPrice1h = closes['1h'][closes['1h'].length - 1]
  const lastSenkouSpanA1h = [...ichimoku1h.senkouSpanA].reverse().find((value) => value !== undefined)
  const lastSenkouSpanB1h = [...ichimoku1h.senkouSpanB].reverse().find((value) => value !== undefined)

  if (
    lastPrice1h !== undefined &&
    lastSenkouSpanA1h !== undefined &&
    lastSenkouSpanB1h !== undefined
  ) {
    if (lastPrice1h > lastSenkouSpanA1h && lastPrice1h > lastSenkouSpanB1h) {
      trend = 'uptrend'
    } else if (lastPrice1h < lastSenkouSpanA1h && lastPrice1h < lastSenkouSpanB1h) {
      trend = 'downtrend'
    }
  }

  const rsi15m = indicators.RSI['15m']
  const lastRsi15m = rsi15m[rsi15m.length - 1]
  const bb15m = indicators.BollingerBands['15m']
  const lastClose15m = closes['15m'][closes['15m'].length - 1]
  const lastUpperBand15m = bb15m.upperBand[bb15m.upperBand.length - 1]
  const lastLowerBand15m = bb15m.lowerBand[bb15m.lowerBand.length - 1]
  let buySignal = false
  let sellSignal = false
  let timeframe = null

  if (
    lastRsi15m !== undefined &&
    lastUpperBand15m !== undefined &&
    lastLowerBand15m !== undefined &&
    lastClose15m !== undefined
  ) {
    if (trend === 'uptrend' && lastRsi15m < 30 && lastClose15m < lastLowerBand15m) {
      buySignal = true
      timeframe = '15m'
    } else if (trend === 'downtrend' && lastRsi15m > 70 && lastClose15m > lastUpperBand15m) {
      sellSignal = true
      timeframe = '15m'
    }
  }

  const fibLevels15m = indicators.Fibonacci['15m']
  const lastPrice15m = lastClose15m
  const nearFibLevel = fibLevels15m.some(
    (level) => Math.abs((lastPrice15m - level) / level) < 0.005
  )

  if (lastPrice15m !== undefined) {
    if (buySignal && nearFibLevel) {
      buySignal = true
      sellSignal = false
    } else if (sellSignal && nearFibLevel) {
      sellSignal = true
      buySignal = false
    }
  }

  const ichimoku15m = indicators.Ichimoku['15m']
  const lastTenkan15m = ichimoku15m.tenkanSen[ichimoku15m.tenkanSen.length - 1]
  const lastKijun15m = ichimoku15m.kijunSen[ichimoku15m.kijunSen.length - 1]

  if (
    lastTenkan15m !== undefined &&
  lastKijun15m !== undefined
  ) {
    if (buySignal && lastTenkan15m > lastKijun15m) {
      buySignal = true
      sellSignal = false
    } else if (sellSignal && lastTenkan15m < lastKijun15m) {
      sellSignal = true
      buySignal = false
    } else {
      buySignal = false
      sellSignal = false
    }
  }

  if (timeframe === null) {
    timeframe = '15m'
  }

  const takeProfitPercentage = calculateTakeProfitPercentage(timeframe)
  return { buy: buySignal, sell: sellSignal, timeframe, takeProfitPercentage }
}

function calculateTakeProfitPercentage (timeframe: string | null): number {
  switch (timeframe) {
    case '1m':
    case '3m':
      return 0.8
    case '5m':
    case '15m':
      return 1.5
    case '30m':
    case '1h':
      return 5.0
    default:
      return 2.0
  }
}
