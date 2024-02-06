import axios from 'axios'
import { type dataBinance } from './utils/type'
import fs from 'fs'
import csv from 'csv-parser'

export class Binance {
  private readonly symbol: string
  private readonly interval: string
  private readonly limit: number

  constructor (symbol: string, interval: string, limit: number) {
    this.symbol = symbol
    this.interval = interval
    this.limit = limit
  }

  public async fetchMarketDataOffline (filePath: string): Promise<dataBinance[]> {
    return await new Promise<dataBinance[]>((resolve, reject) => {
      const results: dataBinance[] = []
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: dataBinance) => {
          results.push(data)
        })
        .on('end', () => {
          resolve(results)
        })
        .on('error', reject)
    })
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
      open_time: kline[0],
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

  public async fetchPairMarketData (symbol: string, interval: string, limit: number): Promise<dataBinance[]> {
    const klinesResponse = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol,
        interval,
        limit
      }
    })
    return klinesResponse.data.map((kline: any): dataBinance => ({
      open_time: kline[0],
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

  public async fetchMarketExchangeInfo (): Promise<string[]> {
    const exchangeInfoResponse = await axios.get('https://api.binance.com/api/v3/exchangeInfo')
    const filteredSymbols = exchangeInfoResponse.data.symbols.filter(
      (symbol: any) => symbol.quoteAsset === 'USDT'
    )
    return filteredSymbols.map((symbol: any) => symbol.symbol)
  }

  public async fetchPairVolume (symbol: string): Promise<number | null> {
    try {
      const ticker24hrResponse = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
        params: {
          symbol
        }
      })
      return parseFloat(ticker24hrResponse.data.volume as string)
    } catch (error) {
      console.error('Erreur lors de la récupération du volume de la paire sur Binance:', error)
      return null
    }
  }
}
