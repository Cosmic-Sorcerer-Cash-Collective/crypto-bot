import { TechnicalIndicator } from './TechnicalIndicator'
import { type typeTradeDecision, type dataBinance } from './utils/type'

export class BotAlgorithm {
  private macdShortPeriod: number
  private macdLongPeriod: number
  private macdSignalPeriod: number
  private rsiPeriod: number
  private readonly lastDecision: string

  constructor (macdShortPeriod: number, macdLongPeriod: number, macdSignalPeriod: number, rsiPeriod: number, lastDecision: string) {
    this.macdShortPeriod = macdShortPeriod
    this.macdLongPeriod = macdLongPeriod
    this.macdSignalPeriod = macdSignalPeriod
    this.rsiPeriod = rsiPeriod
    this.lastDecision = lastDecision
  }

  public setMacdShortPeriod (macdShortPeriod: number): void {
    this.macdShortPeriod = macdShortPeriod
  }

  public setMacdLongPeriod (macdLongPeriod: number): void {
    this.macdLongPeriod = macdLongPeriod
  }

  public setMacdSignalPeriod (macdSignalPeriod: number): void {
    this.macdSignalPeriod = macdSignalPeriod
  }

  public setRsiPeriod (rsiPeriod: number): void {
    this.rsiPeriod = rsiPeriod
  }

  public async tradeDecision (data: dataBinance[]): Promise<typeTradeDecision> {
    const technicalIndicator = new TechnicalIndicator()
    const { histogram, macd } = technicalIndicator.calculateMACD(data, this.macdShortPeriod, this.macdLongPeriod, this.macdSignalPeriod)
    const lastHistogram = technicalIndicator.calculateMACD(data.slice(0, data.length - 1), this.macdShortPeriod, this.macdLongPeriod, this.macdSignalPeriod).histogram
    const rsi = technicalIndicator.calculateRSI(data, this.rsiPeriod)
    const lastRSI = technicalIndicator.calculateRSI(data.slice(0, data.length - 1), this.rsiPeriod)
    let decision: string = 'HOLD'
    const threshold = 0.001
    const price: number = Number(data[data.length - 1].close)
    const lastPrice = Number(data[data.length - 2].close)
    const rsiDivergence = price > lastPrice && rsi < lastRSI
    const smaPeriod = 20
    const sma = technicalIndicator.calculateSMA(data.map((entry) => parseFloat(entry.close)).slice(0, data.length - 1), smaPeriod)
    const aboveSMA = price > sma
    const belowSMA = price < sma

    if (
      (histogram > threshold && lastHistogram < threshold && rsi > 70 && lastRSI < 70 && aboveSMA) ||
        (histogram < -threshold && lastHistogram > -threshold && rsi < 30 && lastRSI > 30 && belowSMA) ||
        rsiDivergence
    ) {
      decision = 'SELL'
    } else if (
      (histogram < -threshold && lastHistogram > -threshold && rsi < 30 && lastRSI > 30 && aboveSMA) ||
        (histogram > threshold && lastHistogram < threshold && rsi > 70 && lastRSI < 70 && belowSMA) ||
        rsiDivergence
    ) {
      decision = 'BUY'
    }

    return { decision, macd }
  }
}
