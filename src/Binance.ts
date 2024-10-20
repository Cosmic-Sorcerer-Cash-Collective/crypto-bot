import Binance, { CandleChartInterval, OrderSide, OrderType } from 'binance-api-node'
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
      '1m': dataBinance[]
      '3m': dataBinance[]
      '5m': dataBinance[]
      '15m': dataBinance[]
      '30m': dataBinance[]
      '1h': dataBinance[]
    }> {
    const intervals: Record<string, CandleChartInterval> = {
      '1m': CandleChartInterval.ONE_MINUTE,
      '3m': CandleChartInterval.THREE_MINUTES,
      '5m': CandleChartInterval.FIVE_MINUTES,
      '15m': CandleChartInterval.FIFTEEN_MINUTES,
      '30m': CandleChartInterval.THIRTY_MINUTES,
      '1h': CandleChartInterval.ONE_HOUR
    }

    const data: Record<string, dataBinance[]> = {}

    for (const [key, interval] of Object.entries(intervals)) {
      const klines = await this.client.candles({ symbol, interval, limit: 100 })
      data[key] = klines as unknown as dataBinance[]
    }

    return data as {
      '1m': dataBinance[]
      '3m': dataBinance[]
      '5m': dataBinance[]
      '15m': dataBinance[]
      '30m': dataBinance[]
      '1h': dataBinance[]
    }
  }

  private async placeOrder (symbol: string, side: OrderSide): Promise<void> {
    try {
      // 1. Récupérer les informations de la paire pour LOT_SIZE et PRICE_FILTER
      const exchangeInfo = await this.client.exchangeInfo()
      const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol)

      if (symbolInfo === undefined) {
        console.error(`Informations pour ${symbol} introuvables.`)
        return
      }

      const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE')
      const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER')

      if (lotSizeFilter === undefined || !('minQty' in lotSizeFilter && 'stepSize' in lotSizeFilter)) {
        console.error(`Filtres LOT_SIZE ou PRICE_FILTER introuvables pour ${symbol}.`)
        return
      }

      if (priceFilter === undefined || !('tickSize' in priceFilter)) {
        console.error(`PRICE_FILTER introuvable ou incomplet pour ${symbol}.`)
        return
      }

      const minQty = parseFloat(lotSizeFilter.minQty)
      const stepSize = parseFloat(lotSizeFilter.stepSize)
      const tickSize = parseFloat(priceFilter.tickSize)

      // 2. Récupérer le dernier prix pour la paire
      const ticker = await this.client.prices({ symbol })
      const price = parseFloat(ticker[symbol])

      if (price === undefined) {
        console.error(`Impossible de récupérer le prix pour ${symbol}`)
        return
      }

      // 3. Calculer la quantité à acheter avec 10 USDT
      const amountToSpend = 20 // Vous dépensez 10 USDT
      let quantity = (amountToSpend / price).toFixed(6)

      // 4. Ajuster la quantité pour respecter les règles de LOT_SIZE
      quantity = (Math.floor(parseFloat(quantity) / stepSize) * stepSize).toFixed(6)

      // Vérifier si la quantité est suffisante (minQty)
      if (parseFloat(quantity) < minQty) {
        console.error(`Quantité trop petite pour ${symbol}. Quantité minimale: ${minQty}, Quantité calculée: ${quantity}`)
        return
      }

      // 5. Placer un ordre de marché pour acheter la quantité calculée
      await this.client.order({
        symbol,
        side,
        quantity,
        type: OrderType.MARKET
      })

      console.log(`Ordre ${side} placé pour ${symbol}, quantité: ${quantity}`)
      await this.telegram.sendMessageAll(`Ordre ${side} placé pour ${symbol}, quantité: ${quantity}`)

      // 6. Si achat, définir le Take Profit et Stop Loss
      if (side === OrderSide.BUY) {
        let takeProfitPrice = (price * 1.02).toFixed(6) // 2% au-dessus du prix d'achat
        let stopLossPrice = (price * 0.98).toFixed(6) // 2% en dessous du prix d'achat

        // 7. Ajuster les prix selon la tickSize
        takeProfitPrice = (Math.floor(parseFloat(takeProfitPrice) / tickSize) * tickSize).toFixed(6)
        stopLossPrice = (Math.floor(parseFloat(stopLossPrice) / tickSize) * tickSize).toFixed(6)

        // 8. Placer des ordres Stop Loss et Take Profit
        await this.client.order({
          symbol,
          side: OrderSide.SELL, // Vendre pour Take Profit et Stop Loss
          quantity,
          price: takeProfitPrice, // Take Profit à 2%
          stopPrice: stopLossPrice, // Stop Loss à 2%
          type: OrderType.STOP_LOSS_LIMIT
        })

        console.log(`Take Profit à ${takeProfitPrice} et Stop Loss à ${stopLossPrice} placés pour ${symbol}`)
        await this.telegram.sendMessageAll(`Take Profit à ${takeProfitPrice} et Stop Loss à ${stopLossPrice} placés pour ${symbol}`)
      }
    } catch (error) {
      console.error(`Erreur lors de la tentative de placement d'ordre pour ${symbol}:`, error)
      await this.telegram.sendMessageAll(`Erreur lors du placement de l'ordre pour ${symbol}`)
    }
  }
}
