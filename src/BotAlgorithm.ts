import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateIchimoku,
  calculateFibonacciLevels,
  calculateATR,
  calculateAverageVolume,
  calculateADX,
  calculateEMA
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

// Fonction de génération de signaux d'achat/vente
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

  // Extraction et conversion des données
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
    ATR: Record<string, number>
    Volume: Record<string, number>
    ADX: Record<string, number | undefined>
    EMA50: Record<string, number>
    EMA200: Record<string, number>
  } = {
    RSI: {},
    MACD: {},
    BollingerBands: {},
    Ichimoku: {},
    Fibonacci: {},
    ATR: {},
    Volume: {},
    ADX: {},
    EMA50: {},
    EMA200: {}
  }

  for (const tf of timeframes) {
    indicatorResults.RSI[tf] = indicators.RSI.calculate(closes[tf])
    indicatorResults.MACD[tf] = indicators.MACD.calculate(closes[tf])
    indicatorResults.BollingerBands[tf] = indicators.BollingerBands.calculate(closes[tf])
    indicatorResults.Ichimoku[tf] = indicators.Ichimoku.calculate(highs[tf], lows[tf], closes[tf])
    indicatorResults.Fibonacci[tf] = calculateFibonacciLevels(Math.max(...highs[tf].slice(-30)), Math.min(...lows[tf].slice(-30)))
    indicatorResults.ATR[tf] = calculateATR([highs[tf], lows[tf], closes[tf]], 14)
    indicatorResults.Volume[tf] = calculateAverageVolume(dataMultiTimeframe[tf].map(d => ({ volume: parseFloat(d.volume) })), 20)
    indicatorResults.ADX[tf] = calculateADX(closes[tf].map((c, i) => ({ close: c, high: highs[tf][i], low: lows[tf][i] })), 14)
    indicatorResults.EMA50[tf] = calculateEMA(closes[tf], 50).filter((value): value is number => value !== undefined).reverse()[0]
    indicatorResults.EMA200[tf] = calculateEMA(closes[tf], 200).filter((value): value is number => value !== undefined).reverse()[0]
  }

  // Détection de la tendance générale sur 1h avec Ichimoku et EMA
  let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways'
  const ichimoku1h = indicatorResults.Ichimoku['1h']
  const lastPrice1h = closes['1h'][closes['1h'].length - 1]
  const lastSenkouSpanA1h = [...ichimoku1h.senkouSpanA].reverse().find((value): value is number => value !== undefined)
  const lastSenkouSpanB1h = [...ichimoku1h.senkouSpanB].reverse().find((value): value is number => value !== undefined)

  if (lastSenkouSpanA1h === undefined || lastSenkouSpanB1h === undefined) {
    throw new Error('Impossible de déterminer la tendance actuelle')
  }
  if (lastPrice1h > lastSenkouSpanA1h && lastPrice1h > lastSenkouSpanB1h && lastPrice1h > indicatorResults.EMA200['1h']) {
    trend = 'uptrend'
  } else if (lastPrice1h < lastSenkouSpanA1h && lastPrice1h < lastSenkouSpanB1h && lastPrice1h < indicatorResults.EMA200['1h']) {
    trend = 'downtrend'
  }

  // Définition de seuils adaptatifs pour le RSI
  const rsi15m = indicatorResults.RSI['15m']
  const atr15m = indicatorResults.ATR['15m']
  const lastRsi15m = rsi15m[rsi15m.length - 1]
  const rsiOverbought = 70 + (atr15m / lastPrice1h) * 10
  const rsiOversold = 30 - (atr15m / lastPrice1h) * 10

  let buySignal = false
  let sellSignal = false
  let timeframe: string | null = null
  const adx15m = indicatorResults.ADX['15m']
  const lastBBUpper15m = indicatorResults.BollingerBands['15m'].upperBand[closes['15m'].length - 1]

  if (lastRsi15m === undefined || adx15m === undefined || lastBBUpper15m === undefined) {
    throw new Error('Impossible de déterminer le RSI actuel')
  }

  if (trend === 'uptrend' && lastRsi15m < rsiOversold && indicatorResults.Volume['15m'] > indicatorResults.Volume['15m'] * 1.2 && adx15m > 25) {
    buySignal = true
    timeframe = '15m'
  } else if (trend === 'downtrend' && lastRsi15m > rsiOverbought && closes['15m'][closes['15m'].length - 1] > lastBBUpper15m) {
    sellSignal = true
    timeframe = '15m'
  }

  return { buy: buySignal, sell: sellSignal, timeframe, takeProfitPercentage: 1.5 }
}
