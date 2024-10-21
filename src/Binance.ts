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
        const { buy, sell, timeframe } = generateSignals(dataMultiTimeframe)

        const openOrders = await this.client.openOrders({ symbol: pair })
        const hasOpenOrder = openOrders.length > 0

        if (hasOpenOrder) {
          console.log(`Ordre déjà ouvert pour ${pair}, aucune action supplémentaire.`)
          await this.telegram.sendMessageAll(`Ordre déjà ouvert pour ${pair}, aucune action supplémentaire.`)
          continue
        }

        if (buy || sell) {
          const takeProfitPercentage = this.calculateTakeProfitBasedOnTimeframe(timeframe)

          if (buy) {
            await this.placeOrder(pair, OrderSide.BUY, takeProfitPercentage)
          } else if (sell) {
            await this.placeOrder(pair, OrderSide.SELL, takeProfitPercentage)
          }
        } else {
          console.log(`Aucun signal pour ${pair}`)
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de la paire ${pair}:`, error)
      }
    }
  }

  private calculateTakeProfitBasedOnTimeframe (timeframe: string | null): number {
    switch (timeframe) {
      case '1m':
      case '3m':
        return 1.5 // Take profit de 1.5% pour des timeframes courts
      case '5m':
      case '15m':
        return 2.5 // Take profit de 2.5% pour des timeframes intermédiaires
      case '30m':
        return 3.5 // Take profit de 3.5%
      case '1h':
        return 5 // Take profit de 5% pour les timeframes longs
      default:
        return 2 // Valeur par défaut de 2% si aucune information n'est disponible
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

  private async placeOrder (symbol: string, side: OrderSide, takeProfitPercentage: number): Promise<void> {
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

      // 3. Calculer la quantité à acheter avec 50 USDT
      const amountToSpend = 50 // Vous dépensez 50 USDT
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

      if (side === OrderSide.BUY) {
        let sellLimitPrice = (price * (1 + takeProfitPercentage / 100)).toFixed(6)
        sellLimitPrice = (Math.floor(parseFloat(sellLimitPrice) / tickSize) * tickSize).toFixed(6)

        await this.client.order({
          symbol,
          side: OrderSide.SELL,
          quantity,
          price: sellLimitPrice,
          type: OrderType.LIMIT,
          timeInForce: 'GTC'
        })

        console.log(`Ordre limite de vente placé à ${sellLimitPrice} pour ${symbol}`)
        await this.telegram.sendMessageAll(`Ordre limite de vente placé à ${sellLimitPrice} pour ${symbol}`)
      }
    } catch (error) {
      console.error(`Erreur lors du placement d'ordre pour ${symbol}:`, error)
      await this.telegram.sendMessageAll(`Erreur lors du placement de l'ordre pour ${symbol}`)
    }
  }
}
