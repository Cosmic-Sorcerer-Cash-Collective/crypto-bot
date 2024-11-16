import {
  calculateFibonacciLevels,
  calculateATR,
  calculateAverageVolume,
  calculateADX,
  calculateEMA,
  calculateOBV
} from './TechnicalIndicator'
import { type IndicatorBollingerBands, type IndicatorIchimoku, type IndicatorMACD, type IndicatorRSI } from './utils/indicatorClass'
import { type BollingerBandsResult, type IchimokuResult, type MACDResult, type dataBinance } from './utils/type'

function calculateAdaptiveTakeProfit (atr: number, adx: number): number {
  let takeProfitPercentage = 3

  if (atr > 1) {
    takeProfitPercentage += atr * 0.5
  } else {
    takeProfitPercentage -= atr * 0.5
  }

  if (adx > 30) {
    takeProfitPercentage += 1
  } else if (adx < 20) {
    takeProfitPercentage -= 1
  }

  return Math.max(1, Math.min(takeProfitPercentage, 10))
}

function getTendency (indicatorResults: Record<string, any>, closes: Record<string, number[]>, timeframes: '1m' | '3m' | '5m' | '15m' | '30m' | '1h'): 'uptrend' | 'downtrend' | 'sideways' {
  let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways'
  const ichimoku = indicatorResults.Ichimoku[timeframes]
  const lastPrice = closes[timeframes][closes[timeframes].length - 1]
  const lastSenkouSpanA = [...ichimoku.senkouSpanA].reverse().find((value): value is number => value !== undefined)
  const lastSenkouSpanB = [...ichimoku.senkouSpanB].reverse().find((value): value is number => value !== undefined)
  const lastOBV = indicatorResults.OBV[timeframes][indicatorResults.OBV[timeframes].length - 1]
  const prevOBV = indicatorResults.OBV[timeframes][indicatorResults.OBV[timeframes].length - 2]

  if (lastSenkouSpanA === undefined || lastSenkouSpanB === undefined) {
    throw new Error('Impossible de déterminer la tendance actuelle')
  }
  if (lastPrice > lastSenkouSpanA && lastPrice > lastSenkouSpanB && lastPrice > indicatorResults.EMA200[timeframes] && lastOBV > prevOBV) {
    trend = 'uptrend'
  } else if (lastPrice < lastSenkouSpanA && lastPrice < lastSenkouSpanB && lastPrice < indicatorResults.EMA200[timeframes] && lastOBV < prevOBV) {
    trend = 'downtrend'
  }
  return trend
}

function getSignal (trend: 'uptrend' | 'downtrend' | 'sideways', dataMultiTimeframe: Record<string, dataBinance[]>, indicatorResults: Record<string, any>, closes: Record<string, number[]>, lastPrice1h: number, timeframes: '1m' | '3m' | '5m' | '15m' | '30m' | '1h'): { buySignal: boolean, sellSignal: boolean } {
  const rsi = indicatorResults.RSI[timeframes]
  const atr = indicatorResults.ATR[timeframes]
  const lastRsi = rsi[rsi.length - 1]
  const rsiOverbought = 70 + (atr / lastPrice1h) * 10
  const rsiOversold = 30 - (atr / lastPrice1h) * 10
  let buySignal = false
  let sellSignal = false
  const adx = indicatorResults.ADX[timeframes]
  const avgVolume = indicatorResults.Volume[timeframes]
  const currentVolume = Number(dataMultiTimeframe[timeframes][dataMultiTimeframe[timeframes].length - 1].volume)
  const lastBBUpper = indicatorResults.BollingerBands[timeframes].upperBand[closes[timeframes].length - 1]
  const lastOBV = indicatorResults.OBV[timeframes][indicatorResults.OBV[timeframes].length - 1]
  const prevOBV = indicatorResults.OBV[timeframes][indicatorResults.OBV[timeframes].length - 2]
  const fibLevels = indicatorResults.Fibonacci[timeframes]
  const lastClose = closes[timeframes][closes[timeframes].length - 1]
  const isNearFibLevel: boolean = fibLevels.some((level: number) => Math.abs((lastClose - level) / level) < 0.01 && lastClose < level)
  const isNearFibResistance: boolean = fibLevels.some((level: number) => Math.abs((lastClose - level) / level) < 0.01 && lastClose > level)

  if (lastRsi === undefined || adx === undefined || lastBBUpper === undefined) {
    throw new Error('Impossible de déterminer le RSI actuel')
  }

  if (trend === 'uptrend') {
    if (rsi < rsiOverbought && currentVolume > avgVolume * 1.2 && adx > 25 && lastOBV > prevOBV && isNearFibLevel) {
      buySignal = true
    } else if (rsi < 40 && currentVolume > avgVolume && adx > 20 && lastOBV > prevOBV) {
      buySignal = true
    }
  } else if (trend === 'downtrend') {
    if (rsi > rsiOversold && close > lastBBUpper && adx > 20 && currentVolume > avgVolume * 1.2 && lastOBV < prevOBV && isNearFibResistance) {
      sellSignal = true
    } else if (rsi > 60 && close > lastBBUpper && adx > 20 && currentVolume > avgVolume && lastOBV < prevOBV) {
      sellSignal = true
    }
  }

  return { buySignal, sellSignal }
}

export function generateSignals (
  dataMultiTimeframe: Record<string, dataBinance[]>,
  indicators: {
    RSI: IndicatorRSI
    MACD: IndicatorMACD
    BollingerBands: IndicatorBollingerBands
    Ichimoku: IndicatorIchimoku
  }
): { buy: boolean, sell: boolean, takeProfitPercentage: number } {
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
    ATR: Record<string, number>
    Volume: Record<string, number>
    ADX: Record<string, number | undefined>
    EMA50: Record<string, number>
    EMA200: Record<string, number>
    OBV: Record<string, number[]>
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
    EMA200: {},
    OBV: {}
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
    indicatorResults.OBV[tf] = calculateOBV(closes[tf], dataMultiTimeframe[tf].map(d => parseFloat(d.volume)))
  }
  const trendLong = getTendency(indicatorResults, closes, '1h')
  const trendShort = getTendency(indicatorResults, closes, '30m')
  const trendVeryShort = getTendency(indicatorResults, closes, '5m')

  const atr15m = indicatorResults.ATR['15m']
  const adx15m = indicatorResults.ADX['15m']

  if (adx15m === undefined) {
    throw new Error('Impossible de déterminer le RSI actuel')
  }

  const trend = trendLong === 'uptrend' && trendShort === 'uptrend' && trendVeryShort === 'uptrend'
    ? 'uptrend'
    : trendLong === 'downtrend' && trendShort === 'downtrend' && trendVeryShort === 'downtrend'
      ? 'downtrend'
      : 'sideways'

  const { buySignal: buySignal15m, sellSignal: sellSignal15m } = getSignal(
    trend,
    dataMultiTimeframe,
    indicatorResults,
    closes,
    closes['15m'][closes['15m'].length - 1],
    '15m'
  )
  const { buySignal: buySignal5m, sellSignal: sellSignal5m } = getSignal(
    trend,
    dataMultiTimeframe,
    indicatorResults,
    closes,
    closes['5m'][closes['5m'].length - 1],
    '5m'
  )

  const buySignal = buySignal15m && buySignal5m
  const sellSignal = sellSignal15m || sellSignal5m

  return { buy: buySignal, sell: sellSignal, takeProfitPercentage: calculateAdaptiveTakeProfit(atr15m, adx15m) }
}
