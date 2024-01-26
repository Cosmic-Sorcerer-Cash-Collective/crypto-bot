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
    const technicalIndicator = new TechnicalIndicator() // Assurez-vous que la classe TechnicalIndicator est correctement implémentée

    const rsi = technicalIndicator.calculateRSI(data, this.rsiPeriod)

    const lastCandle = data[data.length - 2]
    const currentCandle = data[data.length - 1]
    const isHammer: boolean = technicalIndicator.isHammer(lastCandle, currentCandle)

    let decision: string = 'HOLD'

    if (rsi <= 30 && isHammer) {
      decision = 'BUY'
    } else if (rsi >= 70 && isHammer) {
      decision = 'SELL'
    }

    return { decision, macd: 0 }
  }
}
