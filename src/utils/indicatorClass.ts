import { calculateBollingerBands, calculateIchimoku, calculateMACD, calculateRSI } from '../TechnicalIndicator'
import { type BollingerBandsResult, type IchimokuResult, type MACDResult } from './type'

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
