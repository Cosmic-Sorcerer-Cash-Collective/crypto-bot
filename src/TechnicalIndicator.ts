import { type dataBinance, type macdIndicator } from './utils/type'

export class TechnicalIndicator {
  calculateMACD (data: dataBinance[], shortPeriod: number = 12, longPeriod: number = 26, signalPeriod: number = 9): macdIndicator {
    const prices = data.map((entry) => parseFloat(entry.close))

    const shortEMA = this.calculateEMA(prices, shortPeriod)
    const longEMA = this.calculateEMA(prices, longPeriod)

    const macdLine = this.calculateMACDLine(shortEMA, longEMA)
    const signalLine = this.calculateSignalLine(macdLine, signalPeriod)
    const histogram = this.calculateHistogram(macdLine, signalLine)

    return {
      macd: macdLine.slice(-1)[0],
      signal: signalLine.slice(-1)[0],
      histogram: histogram.slice(-1)[0]
    }
  }

  private calculateMACDLine (shortEMA: number[], longEMA: number[]): number[] {
    return shortEMA.map((short, index) => short - longEMA[index])
  }

  private calculateSignalLine (macdLine: number[], signalPeriod: number): number[] {
    return this.calculateEMA(macdLine, signalPeriod)
  }

  private calculateHistogram (macdLine: number[], signalLine: number[]): number[] {
    return macdLine.map((macd, index) => macd - signalLine[index])
  }

  calculateRSI (data: dataBinance[], period: number): number {
    const prices = data.map((entry) => parseFloat(entry.close))

    let avgGain = 0
    let avgLoss = 0

    for (let i = 1; i < prices.length; i++) {
      const priceDiff = prices[i] - prices[i - 1]
      if (priceDiff >= 0) {
        avgGain = (avgGain * (period - 1) + priceDiff) / period
        avgLoss = (avgLoss * (period - 1)) / period
      } else {
        avgGain = (avgGain * (period - 1)) / period
        avgLoss = (avgLoss * (period - 1) - priceDiff) / period
      }
    }

    const relativeStrength = avgGain / avgLoss
    const rsi: number = 100 - (100 / (1 + relativeStrength))

    return rsi
  }

  calculateSMA (data: number[], period: number): number[] {
    const smaValues: number[] = []

    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((total, value) => total + value, 0)
      const sma = sum / period
      smaValues.push(sma)
    }

    return smaValues
  }

  calculateEMA (prices: number[], period: number): number[] {
    const k = 2 / (period + 1)
    const emaValues: number[] = []
    let ema = prices[0]
    for (const price of prices) {
      ema = (price * k) + (ema * (1 - k))
      emaValues.push(ema)
    }
    return emaValues
  }
}
