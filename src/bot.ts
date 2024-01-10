import { TechnicalIndicator } from './TechnicalIndicator'
import { type dataBinance } from './utils/type'

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

  public async tradeDecision (data: dataBinance[]): Promise<string | null> {
    const technicalIndicator = new TechnicalIndicator()
    const macd = technicalIndicator.calculateMACD(data, this.macdShortPeriod, this.macdLongPeriod, this.macdSignalPeriod)
    const rsi = technicalIndicator.calculateRSI(data, this.rsiPeriod)
    let decision: string | null = null
    const decisionThreshold = 0.0001
    if (macd.histogram > decisionThreshold && macd.histogram > macd.signal && rsi < 70 && this.lastDecision !== 'BUY') {
      decision = 'BUY'
    } else if (macd.histogram < -decisionThreshold && macd.histogram < macd.signal && rsi > 30 && this.lastDecision !== 'SELL') {
      decision = 'SELL'
    } else {
      decision = 'HOLD'
    }
    return decision
  }
}
