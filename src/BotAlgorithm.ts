import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateIchimoku,
  calculateFibonacciLevels
} from './TechnicalIndicator'
import { type BollingerBandsResult, type IchimokuResult, type MACDResult, type dataBinance } from './utils/type'

export class IndicatorRSI {
  private readonly period: number

  constructor (period: number = 14) {
    this.period = period
  }

  calculate (data: number[]): Array<number | undefined> {
    return calculateRSI(data, this.period)
  }
}

export class IndicatorMACD {
  private readonly fastPeriod: number
  private readonly slowPeriod: number
  private readonly signalPeriod: number

  constructor (fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    this.fastPeriod = fastPeriod
    this.slowPeriod = slowPeriod
    this.signalPeriod = signalPeriod
  }

  calculate (data: number[]): MACDResult {
    return calculateMACD(data, this.fastPeriod, this.slowPeriod, this.signalPeriod)
  }
}

export class IndicatorBollingerBands {
  private readonly period: number
  private readonly stdDev: number

  constructor (period: number = 20, stdDev: number = 2) {
    this.period = period
    this.stdDev = stdDev
  }

  calculate (data: number[]): BollingerBandsResult {
    return calculateBollingerBands(data, this.period, this.stdDev)
  }
}

export class IndicatorIchimoku {
  calculate (high: number[], low: number[], close: number[]): IchimokuResult {
    return calculateIchimoku(high, low, close)
  }
}

// Fonction générique de calcul des signaux pour une paire et un ensemble de données sur plusieurs périodes
export function generateSignals (
  dataMultiTimeframe: Record<string, dataBinance[]>,
  indicators: {
    RSI: IndicatorRSI
    MACD: IndicatorMACD
    BollingerBands: IndicatorBollingerBands
    Ichimoku: IndicatorIchimoku
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

  const indicatorResults: {
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
    indicatorResults.RSI[tf] = indicators.RSI.calculate(closes[tf])
    indicatorResults.MACD[tf] = indicators.MACD.calculate(closes[tf])
    indicatorResults.BollingerBands[tf] = indicators.BollingerBands.calculate(closes[tf])
    indicatorResults.Ichimoku[tf] = indicators.Ichimoku.calculate(highs[tf], lows[tf], closes[tf])
    const recentHigh = Math.max(...highs[tf].slice(-30))
    const recentLow = Math.min(...lows[tf].slice(-30))
    indicatorResults.Fibonacci[tf] = calculateFibonacciLevels(recentHigh, recentLow)
  }

  // Tendance sur le timeframe 1h
  let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways'
  const ichimoku1h = indicatorResults.Ichimoku['1h']
  const lastPrice1h = closes['1h'][closes['1h'].length - 1]
  const lastSenkouSpanA1h = [...ichimoku1h.senkouSpanA].reverse().find((value) => value !== undefined)
  const lastSenkouSpanB1h = [...ichimoku1h.senkouSpanB].reverse().find((value) => value !== undefined)

  if (lastSenkouSpanA1h !== undefined && lastSenkouSpanB1h !== undefined) {
    if (lastPrice1h > lastSenkouSpanA1h && lastPrice1h > lastSenkouSpanB1h) {
      trend = 'uptrend'
    } else if (lastPrice1h < lastSenkouSpanA1h && lastPrice1h < lastSenkouSpanB1h) {
      trend = 'downtrend'
    }
  }

  const rsi15m = indicatorResults.RSI['15m']
  const lastRsi15m = rsi15m[rsi15m.length - 1]
  const bb15m = indicatorResults.BollingerBands['15m']
  const lastClose15m = closes['15m'][closes['15m'].length - 1]
  const lastUpperBand15m = bb15m.upperBand[bb15m.upperBand.length - 1]
  const lastLowerBand15m = bb15m.lowerBand[bb15m.lowerBand.length - 1]

  let buySignal = false
  let sellSignal = false
  let timeframe: string | null = null

  if (lastRsi15m !== undefined && lastUpperBand15m !== undefined && lastLowerBand15m !== undefined) {
    if (trend === 'uptrend' && lastRsi15m < 30 && lastClose15m < lastLowerBand15m) {
      buySignal = true
      timeframe = '15m'
    } else if (trend === 'downtrend' && lastRsi15m > 70 && lastClose15m > lastUpperBand15m) {
      sellSignal = true
      timeframe = '15m'
    }
  }

  const fibLevels15m = indicatorResults.Fibonacci['15m']
  const nearFibLevel = fibLevels15m.some(
    (level) => Math.abs((lastClose15m - level) / level) < 0.005
  )

  if (nearFibLevel) {
    if (buySignal) {
      sellSignal = false
    } else if (sellSignal) {
      buySignal = false
    }
  }

  const ichimoku15m = indicatorResults.Ichimoku['15m']
  const lastTenkan15m = ichimoku15m.tenkanSen[ichimoku15m.tenkanSen.length - 1]
  const lastKijun15m = ichimoku15m.kijunSen[ichimoku15m.kijunSen.length - 1]

  if (lastTenkan15m !== undefined && lastKijun15m !== undefined) {
    if (lastTenkan15m > lastKijun15m) {
      buySignal = true
      sellSignal = false
    } else if (lastTenkan15m < lastKijun15m) {
      sellSignal = true
      buySignal = false
    }
  }

  if (timeframe === null) {
    timeframe = '15m'
  }

  const takeProfitPercentage = calculateDynamicTakeProfit(timeframe)
  return { buy: buySignal, sell: sellSignal, timeframe, takeProfitPercentage }
}

// Fonction pour définir le take profit en fonction de la période
function calculateDynamicTakeProfit (timeframe: string | null): number {
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
