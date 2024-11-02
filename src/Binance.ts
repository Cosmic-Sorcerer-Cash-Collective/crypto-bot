import Binance, { CandleChartInterval, OrderSide, OrderType } from 'binance-api-node'
import { type dataBinance } from './utils/type'
import { generateSignals, IndicatorBollingerBands, IndicatorIchimoku, IndicatorMACD, IndicatorRSI } from './BotAlgorithm'
import { Telegram } from './Telegram'

export class TradingBot {
  private readonly client: ReturnType<typeof Binance>
  private readonly pairs: string[]
  private readonly telegram: Telegram
  private readonly indicators: {
    RSI: IndicatorRSI
    MACD: IndicatorMACD
    BollingerBands: IndicatorBollingerBands
    Ichimoku: IndicatorIchimoku
  }

  constructor (apiKey: string, apiSecret: string, pairs: string[]) {
    this.client = Binance({
      apiKey,
      apiSecret
    })
    this.pairs = pairs
    this.telegram = new Telegram()
    this.telegram.run()
    this.indicators = {
      RSI: new IndicatorRSI(),
      MACD: new IndicatorMACD(),
      BollingerBands: new IndicatorBollingerBands(),
      Ichimoku: new IndicatorIchimoku()
    }
  }

  public async startTrading (): Promise<void> {
    for (const pair of this.pairs) {
      try {
        const dataMultiTimeframe = await this.fetchDataMultiTimeframe(pair)
        const { buy, sell, takeProfitPercentage } = generateSignals(dataMultiTimeframe, this.indicators)
        const openOrders = await this.client.openOrders({ symbol: pair })
        const hasOpenOrder = openOrders.length > 0

        if (hasOpenOrder) {
          console.log(`Ordre déjà ouvert pour ${pair}, aucune action supplémentaire.`)
          continue
        }
        if (buy || sell) {
          if (buy) {
            await this.placeOrder(pair, OrderSide.BUY, takeProfitPercentage)
          } else if (sell) {
            await this.placeOrder(pair, OrderSide.SELL, takeProfitPercentage)
          }
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
      const klines = await this.client.candles({ symbol, interval, limit: 250 })
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

      // 3. Vérification du solde
      const accountInfo = await this.client.accountInfo()
      const assetBalance = accountInfo.balances.find(b => b.asset === (side === OrderSide.BUY ? 'USDT' : symbol.replace('USDT', '')))
      const amountToSpend = parseFloat(process.env.AMOUNT_TO_SPEND ?? '10')
      let quantity = (amountToSpend / price).toFixed(6)
      quantity = (Math.floor(parseFloat(quantity) / stepSize) * stepSize).toFixed(6)

      if (assetBalance === undefined || parseFloat(assetBalance.free) < (side === OrderSide.BUY ? amountToSpend : parseFloat(quantity))) {
        console.error(`Balance insuffisante pour ${symbol}. Disponible: ${assetBalance?.free}`)
        return
      }

      quantity = (amountToSpend / price).toFixed(6)
      quantity = (Math.floor(parseFloat(quantity) / stepSize) * stepSize).toFixed(6)

      if (parseFloat(quantity) < minQty) {
        console.error(`Quantité trop petite pour ${symbol}. Quantité minimale: ${minQty}, Quantité calculée: ${quantity}`)
        return
      }

      this.client.order({
        symbol,
        side,
        quantity,
        type: OrderType.MARKET
      }).catch(console.error)

      console.log(`Ordre ${side} placé pour ${symbol}, quantité: ${quantity}`)
      this.telegram.sendMessageAll(`Ordre ${side} placé pour ${symbol}, quantité: ${quantity}`).catch(console.error)

      if (side === OrderSide.BUY) {
        let sellLimitPrice = (price * (1 + takeProfitPercentage / 100)).toFixed(6)
        sellLimitPrice = (Math.floor(parseFloat(sellLimitPrice) / tickSize) * tickSize).toFixed(6)

        this.client.order({
          symbol,
          side: OrderSide.SELL,
          quantity,
          price: sellLimitPrice,
          type: OrderType.LIMIT,
          timeInForce: 'GTC'
        }).catch(console.error)

        console.log(`Ordre limite de vente placé à ${sellLimitPrice} pour ${symbol}`)
        this.telegram.sendMessageAll(`Ordre limite de vente placé à ${sellLimitPrice} pour ${symbol}`).catch(console.error)
      }
    } catch (error) {
      console.error(`Erreur lors du placement d'ordre pour ${symbol}:`, error)
      this.telegram.sendMessageAll(`Erreur lors du placement de l'ordre pour ${symbol}`).catch(console.error)
    }
  }
}
