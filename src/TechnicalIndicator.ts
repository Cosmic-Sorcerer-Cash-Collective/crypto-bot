// Calcul du RSI
export function calculateRSI (closes: number[], period: number): number[] {
  const gains: number[] = []
  const losses: number[] = []
  const rsis: number[] = []

  for (let i = 1; i < closes.length; i++) {
    const difference = closes[i] - closes[i - 1]
    gains.push(Math.max(0, difference))
    losses.push(Math.max(0, -difference))
  }

  let avgGain = average(gains.slice(0, period))
  let avgLoss = average(losses.slice(0, period))

  rsis[period - 1] = 100 - 100 / (1 + avgGain / avgLoss)

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    rsis[i] = 100 - 100 / (1 + avgGain / avgLoss)
  }

  return rsis
}

// Calcul du MACD
export function calculateMACD (
  closes: number[],
  shortPeriod: number,
  longPeriod: number,
  signalPeriod: number
): { macd: number[], signal: number[], histogram: number[] } {
  const shortEMA = calculateEMA(closes, shortPeriod)
  const longEMA = calculateEMA(closes, longPeriod)

  const macd = []
  for (let i = 0; i < longEMA.length; i++) {
    macd.push(shortEMA[i + (longPeriod - shortPeriod)] - longEMA[i])
  }

  const signal = calculateEMA(macd, signalPeriod)
  const histogram = macd.slice(signalPeriod - 1).map((value, index) => value - signal[index])

  return { macd, signal, histogram }
}

// Calcul des Bandes de Bollinger
export function calculateBollingerBands (
  closes: number[],
  period: number,
  stdDevMultiplier: number
): { middleBand: number[], upperBand: number[], lowerBand: number[] } {
  const middleBand = calculateSMA(closes, period)
  const upperBand: number[] = []
  const lowerBand: number[] = []

  for (let i = 0; i < middleBand.length; i++) {
    const slice = closes.slice(i, i + period)
    const stdDev = standardDeviation(slice)
    upperBand.push(middleBand[i] + stdDevMultiplier * stdDev)
    lowerBand.push(middleBand[i] - stdDevMultiplier * stdDev)
  }

  return { middleBand, upperBand, lowerBand }
}

// Calcul de l'Ichimoku Cloud
export function calculateIchimoku (
  highs: number[],
  lows: number[],
  closes: number[]
): {
    tenkanSen: number[]
    kijunSen: number[]
    senkouSpanA: number[]
    senkouSpanB: number[]
    chikouSpan: number[]
  } {
  const tenkanSen = calculateConversionLine(highs, lows, 9)
  const kijunSen = calculateBaseLine(highs, lows, 26)
  const senkouSpanA = tenkanSen.map((value, index) => (value + kijunSen[index]) / 2)
  const senkouSpanB = calculateLeadingSpanB(highs, lows, 52)
  const chikouSpan = closes.slice(0, closes.length - 26)

  return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan }
}

// Calcul des niveaux de Fibonacci
export function calculateFibonacciLevels (high: number, low: number): number[] {
  const diff = high - low
  return [
    high - 0.236 * diff,
    high - 0.382 * diff,
    high - 0.5 * diff,
    high - 0.618 * diff,
    high - 0.786 * diff
  ]
}

// Fonctions utilitaires internes
function average (data: number[]): number {
  return data.reduce((a, b) => a + b, 0) / data.length
}

function calculateEMA (data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const ema: number[] = []

  // Démarrer l'EMA avec la SMA
  ema[0] = average(data.slice(0, period))

  for (let i = period; i < data.length; i++) {
    ema.push(data[i] * k + ema[ema.length - 1] * (1 - k))
  }

  return ema
}

function calculateSMA (data: number[], period: number): number[] {
  const sma: number[] = []
  for (let i = 0; i <= data.length - period; i++) {
    const sum = data.slice(i, i + period).reduce((a, b) => a + b, 0)
    sma.push(sum / period)
  }
  return sma
}

function standardDeviation (data: number[]): number {
  const avg = average(data)
  const squareDiffs = data.map((value) => Math.pow(value - avg, 2))
  const avgSquareDiff = average(squareDiffs)
  return Math.sqrt(avgSquareDiff)
}

function calculateConversionLine (highs: number[], lows: number[], period: number): number[] {
  const conversionLine: number[] = []
  for (let i = 0; i <= highs.length - period; i++) {
    const high = Math.max(...highs.slice(i, i + period))
    const low = Math.min(...lows.slice(i, i + period))
    conversionLine.push((high + low) / 2)
  }
  return conversionLine
}

function calculateBaseLine (highs: number[], lows: number[], period: number): number[] {
  return calculateConversionLine(highs, lows, period)
}

function calculateLeadingSpanB (highs: number[], lows: number[], period: number): number[] {
  const leadingSpanB: number[] = []
  for (let i = 0; i <= highs.length - period; i++) {
    const high = Math.max(...highs.slice(i, i + period))
    const low = Math.min(...lows.slice(i, i + period))
    leadingSpanB.push((high + low) / 2)
  }
  return leadingSpanB
}
