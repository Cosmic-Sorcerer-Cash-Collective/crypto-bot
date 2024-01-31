import { TechnicalIndicator } from './TechnicalIndicator'
import { type typeTradeDecision, type dataBinance, type macdIndicator } from './utils/type'

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
    let decision: string = 'HOLD'

    // Calculate MACD
    const macdData: macdIndicator = technicalIndicator.calculateMACD(data, this.macdShortPeriod, this.macdLongPeriod, this.macdSignalPeriod)

    // MACD buy/sell condition
    const macdBuyCondition = macdData.macd > macdData.signal && macdData.histogram > 0
    const macdSellCondition = macdData.macd < macdData.signal && macdData.histogram < 0

    // RSI condition
    const rsi = technicalIndicator.calculateRSI(data, this.rsiPeriod)
    const rsiBuyCondition = rsi <= 30
    const rsiSellCondition = rsi >= 70

    // Decision logic
    if (macdBuyCondition && rsiBuyCondition) {
      decision = 'BUY'
    } else if (macdSellCondition && rsiSellCondition) {
      decision = 'SELL'
    }

    return { decision }
  }
}
