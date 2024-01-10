import axios from 'axios'
import { type dataBinance } from './utils/type'

export class Binance {
  private readonly symbol: string
  private readonly interval: string
  private readonly limit: number

  constructor (symbol: string, interval: string, limit: number) {
    this.symbol = symbol
    this.interval = interval
    this.limit = limit
  }

  public async fetchMarketData (): Promise<dataBinance[]> {
    const klinesResponse = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol: this.symbol,
        interval: this.interval,
        limit: this.limit
      }
    })
    return klinesResponse.data.map((kline: any): dataBinance => ({
      date: kline[0],
      open: kline[1],
      high: kline[2],
      low: kline[3],
      close: kline[4],
      volume: kline[5],
      close_time: kline[6],
      quote_volume: kline[7],
      count: kline[8],
      taker_buy_volume: kline[9],
      taker_buy_quote_volume: kline[10],
      ignore: kline[11]
    }))
  }
}
