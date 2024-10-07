import Binance, { CandleChartInterval/*, OrderType */, OrderSide } from 'binance-api-node'
import { type dataBinance } from './utils/type'
import { generateSignals } from './BotAlgorithm'
import { Telegram } from './Telegram'

export class TradingBot {
  private readonly client: ReturnType<typeof Binance>
  private readonly pairs: string[]
  private readonly telegram: Telegram

  constructor (apiKey: string, apiSecret: string, pairs: string[]) {
    this.client = Binance({
      apiKey,
      apiSecret
    })
    this.pairs = pairs
    this.telegram = new Telegram()
    this.telegram.run()
  }

  public async startTrading (): Promise<void> {
    for (const pair of this.pairs) {
      try {
        const dataMultiTimeframe = await this.fetchDataMultiTimeframe(pair)
        const signals = generateSignals(dataMultiTimeframe)
        const { buy, sell } = signals

        if (buy) {
          await this.placeOrder(pair, OrderSide.BUY)
        } else if (sell) {
          await this.placeOrder(pair, OrderSide.SELL)
        } else {
          console.log(`Aucun signal pour ${pair}`)
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de la paire ${pair}:`, error)
      }
    }
  }

  private async fetchDataMultiTimeframe (
    symbol: string
  ): Promise<{
      '5m': dataBinance[]
      '15m': dataBinance[]
      '1h': dataBinance[]
      '6h': dataBinance[]
      '1d': dataBinance[]
    }> {
    const intervals: Record<string, CandleChartInterval> = {
      '5m': CandleChartInterval.FIVE_MINUTES,
      '15m': CandleChartInterval.FIFTEEN_MINUTES,
      '1h': CandleChartInterval.ONE_HOUR,
      '6h': CandleChartInterval.SIX_HOURS,
      '1d': CandleChartInterval.ONE_DAY
    }

    const data: Record<string, dataBinance[]> = {}

    for (const [key, interval] of Object.entries(intervals)) {
      const klines = await this.client.candles({ symbol, interval, limit: 100 })
      data[key] = klines as unknown as dataBinance[]
    }

    return data as {
      '5m': dataBinance[]
      '15m': dataBinance[]
      '1h': dataBinance[]
      '6h': dataBinance[]
      '1d': dataBinance[]
    }
  }

  private async placeOrder (symbol: string, side: OrderSide): Promise<void> {
    // Exemple simplifié de placement d'ordre
    // await this.client.order({
    //   symbol,
    //   side,
    //   quantity: '0.001', // Ajustez selon votre stratégie
    //   type: OrderType.MARKET
    // })
    // console.log(`Ordre ${side} placé pour ${symbol}`)
    await this.telegram.sendMessageAll(`Ordre ${side} placé pour ${symbol}`)
  }
}
