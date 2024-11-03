import { type MACDResult, type BollingerBandsResult, type IchimokuResult } from './utils/type'

// Calcul du RSI
export function calculateRSI (closes: number[], period: number): Array<number | undefined> {
  const gains: number[] = []
  const losses: number[] = []

  for (let i = 1; i < closes.length; i++) {
    const difference = closes[i] - closes[i - 1]
    if (difference >= 0) {
      gains.push(difference)
      losses.push(0)
    } else {
      gains.push(0)
      losses.push(-difference)
    }
  }

  const rsi: Array<number | undefined> = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(undefined)
    } else {
      const avgGain = average(gains.slice(i - period, i))
      const avgLoss = average(losses.slice(i - period, i))

      if (avgLoss === 0) {
        rsi.push(100)
      } else {
        const rs = avgGain / avgLoss
        rsi.push(100 - 100 / (1 + rs))
      }
    }
  }

  return rsi
}

export function calculateEMA (data: number[], period: number): Array<number | undefined> {
  const ema: Array<number | undefined> = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(undefined)
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0)
      ema.push(sum / period)
    } else {
      const prevEma = ema[i - 1]
      if (prevEma !== undefined) {
        ema.push((data[i] - prevEma) * multiplier + prevEma)
      } else {
        ema.push(undefined)
      }
    }
  }

  return ema
}

export function calculateMACD (
  closes: number[],
  shortPeriod: number,
  longPeriod: number,
  signalPeriod: number
): MACDResult {
  const shortEMA = calculateEMA(closes, shortPeriod)
  const longEMA = calculateEMA(closes, longPeriod)
  const macd: Array<number | undefined> = []

  for (let i = 0; i < closes.length; i++) {
    const shortValue = shortEMA[i]
    const longValue = longEMA[i]
    if (shortValue !== undefined && longValue !== undefined) {
      macd.push(shortValue - longValue)
    } else {
      macd.push(undefined)
    }
  }

  const signal = calculateEMA(
    macd.map((v) => v ?? 0),
    signalPeriod
  ).map((v, i) => (macd[i] !== undefined ? v : undefined))

  const histogram: Array<number | undefined> = []
  for (let i = 0; i < macd.length; i++) {
    const macdValue = macd[i]
    const signalValue = signal[i]
    if (macdValue !== undefined && signalValue !== undefined) {
      histogram.push(macdValue - signalValue)
    } else {
      histogram.push(undefined)
    }
  }

  return { macd, signal, histogram }
}

export function calculateBollingerBands (
  closes: number[],
  period: number,
  stdDevMultiplier: number
): BollingerBandsResult {
  const middleBand = calculateSMA(closes, period)
  const upperBand: Array<number | undefined> = []
  const lowerBand: Array<number | undefined> = []

  for (let i = 0; i < closes.length; i++) {
    const middleValue = middleBand[i]
    if (i < period - 1 || middleValue === undefined) {
      upperBand.push(undefined)
      lowerBand.push(undefined)
    } else {
      const slice = closes.slice(i - period + 1, i + 1)
      const stdDev = standardDeviation(slice)
      upperBand.push(middleValue + stdDevMultiplier * stdDev)
      lowerBand.push(middleValue - stdDevMultiplier * stdDev)
    }
  }

  return { middleBand, upperBand, lowerBand }
}

function average (data: number[]): number {
  return data.reduce((a, b) => a + b, 0) / data.length
}

function calculateSMA (data: number[], period: number): Array<number | undefined> {
  const sma: Array<number | undefined> = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(undefined)
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      sma.push(sum / period)
    }
  }
  return sma
}

function standardDeviation (data: number[]): number {
  const avg = average(data)
  const squareDiffs = data.map((value) => Math.pow(value - avg, 2))
  const avgSquareDiff = average(squareDiffs)
  return Math.sqrt(avgSquareDiff)
}

export function calculateIchimoku (
  highs: number[],
  lows: number[],
  closes: number[],
  conversionPeriod = 9,
  basePeriod = 26,
  leadingSpanBPeriod = 52,
  displacement = 26
): IchimokuResult {
  const tenkanSen: Array<number | undefined> = []
  const kijunSen: Array<number | undefined> = []
  const senkouSpanA: Array<number | undefined> = []
  const senkouSpanB: Array<number | undefined> = []
  const chikouSpan: Array<number | undefined> = []

  // Calcul de la Tenkan-sen (ligne de conversion)
  for (let i = 0; i < highs.length; i++) {
    if (i >= conversionPeriod - 1) {
      const high = Math.max(...highs.slice(i - conversionPeriod + 1, i + 1))
      const low = Math.min(...lows.slice(i - conversionPeriod + 1, i + 1))
      tenkanSen.push((high + low) / 2)
    } else {
      tenkanSen.push(undefined)
    }
  }

  // Calcul de la Kijun-sen (ligne de base)
  for (let i = 0; i < highs.length; i++) {
    if (i >= basePeriod - 1) {
      const high = Math.max(...highs.slice(i - basePeriod + 1, i + 1))
      const low = Math.min(...lows.slice(i - basePeriod + 1, i + 1))
      kijunSen.push((high + low) / 2)
    } else {
      kijunSen.push(undefined)
    }
  }

  // Calcul du Senkou Span A (première ligne du nuage)
  for (let i = 0; i < highs.length; i++) {
    if (i >= basePeriod - 1) {
      const tenkanValue = tenkanSen[i]
      const kijunValue = kijunSen[i]
      if (tenkanValue !== undefined && kijunValue !== undefined) {
        senkouSpanA.push((tenkanValue + kijunValue) / 2)
      } else {
        senkouSpanA.push(undefined)
      }
    } else {
      senkouSpanA.push(undefined)
    }
  }

  // Calcul du Senkou Span B (deuxième ligne du nuage)
  for (let i = 0; i < highs.length; i++) {
    if (i >= leadingSpanBPeriod - 1) {
      const high = Math.max(...highs.slice(i - leadingSpanBPeriod + 1, i + 1))
      const low = Math.min(...lows.slice(i - leadingSpanBPeriod + 1, i + 1))
      senkouSpanB.push((high + low) / 2)
    } else {
      senkouSpanB.push(undefined)
    }
  }

  // Calcul du Chikou Span (ligne décalée)
  for (let i = 0; i < closes.length; i++) {
    if (i + displacement < closes.length) {
      chikouSpan.push(closes[i + displacement])
    } else {
      chikouSpan.push(undefined)
    }
  }

  // Décalage des Senkou Span A et B
  const senkouSpanAOffset = senkouSpanA.map((val, index) =>
    index + displacement < highs.length ? val : undefined
  )
  const senkouSpanBOffset = senkouSpanB.map((val, index) =>
    index + displacement < highs.length ? val : undefined
  )

  return {
    tenkanSen,
    kijunSen,
    senkouSpanA: senkouSpanAOffset,
    senkouSpanB: senkouSpanBOffset,
    chikouSpan
  }
}

export function calculateFibonacciLevels (high: number, low: number): number[] {
  const diff = high - low
  return [
    high - 0.236 * diff,
    high - 0.382 * diff,
    high - 0.5 * diff,
    high - 0.618 * diff,
    high - 0.786 * diff,
    low
  ]
}

export function calculateATR (data: number[][], period: number): number {
  const trueRanges: number[] = []

  for (let i = 1; i < data.length; i++) {
    const high = data[i][0]
    const low = data[i][1]
    const prevClose = data[i - 1][2]

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trueRanges.push(tr)
  }

  let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period

  for (let i = period; i < trueRanges.length; i++) {
    atr = ((trueRanges[i] / period) + (atr * (period - 1)) / period)
  }

  return atr
}

export function calculateAverageVolume (data: Array<{ volume: number }>, period: number): number {
  const volumeData = data.slice(-period)
  const totalVolume = volumeData.reduce((sum, item) => sum + item.volume, 0)

  return totalVolume / period
}

export function calculateADX (data: Array<{ high: number, low: number, close: number }>, period: number): number | undefined {
  if (data.length < period) return undefined

  let smoothedPlusDM = 0; let smoothedMinusDM = 0; let smoothedTR = 0
  const dxValues: number[] = []

  for (let i = 1; i < period; i++) {
    const currentHigh = data[i].high
    const currentLow = data[i].low
    const prevHigh = data[i - 1].high
    const prevLow = data[i - 1].low
    const prevClose = data[i - 1].close

    const tr = Math.max(currentHigh - currentLow, Math.abs(currentHigh - prevClose), Math.abs(currentLow - prevClose))
    smoothedTR += tr
    smoothedPlusDM += currentHigh - prevHigh > prevLow - currentLow && currentHigh - prevHigh > 0 ? currentHigh - prevHigh : 0
    smoothedMinusDM += prevLow - currentLow > currentHigh - prevHigh && prevLow - currentLow > 0 ? prevLow - currentLow : 0
  }

  for (let i = period; i < data.length; i++) {
    const currentHigh = data[i].high
    const currentLow = data[i].low
    const prevHigh = data[i - 1].high
    const prevLow = data[i - 1].low
    const prevClose = data[i - 1].close

    const tr = Math.max(currentHigh - currentLow, Math.abs(currentHigh - prevClose), Math.abs(currentLow - prevClose))
    smoothedTR = smoothedTR - (smoothedTR / period) + tr
    const plusDM = currentHigh - prevHigh > prevLow - currentLow && currentHigh - prevHigh > 0 ? currentHigh - prevHigh : 0
    const minusDM = prevLow - currentLow > currentHigh - prevHigh && prevLow - currentLow > 0 ? prevLow - currentLow : 0
    smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + plusDM
    smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + minusDM
    const plusDI = (smoothedPlusDM / smoothedTR) * 100
    const minusDI = (smoothedMinusDM / smoothedTR) * 100
    const dx = Math.abs((plusDI - minusDI) / (plusDI + minusDI)) * 100
    dxValues.push(dx)
  }
  const adx = dxValues.reduce((sum, value) => sum + value, 0) / dxValues.length

  return adx
}
