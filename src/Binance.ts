import Binance, { CandleChartInterval, OrderSide, OrderType } from 'binance-api-node'
import { type dataBinance } from './utils/type'
import { generateSignals } from './BotAlgorithm'
import { Telegram } from './Telegram'
import { IndicatorBollingerBands, IndicatorIchimoku, IndicatorMACD, IndicatorRSI } from './utils/indicatorClass'

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
      const symbolInfo = await this.getSymbolInfo(symbol)
      if (symbolInfo === null) return

      const { minQty, stepSize, tickSize } = symbolInfo

      const price = await this.getLastPrice(symbol)
      if (price === undefined) return

      const quantity = this.calculateQuantity(price, stepSize, side, symbol, minQty)
      if (quantity === null) return

      if (side === OrderSide.BUY) {
        await this.executeMarketOrder(symbol, side, quantity)
        await this.placeOCOOrder(symbol, quantity, price, takeProfitPercentage, tickSize)
      } else {
        await this.handleSellOrder(symbol, quantity, price)
      }
    } catch (error) {
      console.error(`Erreur lors du placement d'ordre pour ${symbol}:`, error)
      this.telegram.sendMessageAll(`Erreur lors du placement de l'ordre pour ${symbol}`).catch(console.error)
    }
  }

  private async handleSellOrder (symbol: string, quantity: string, currentPrice: number): Promise<void> {
    const openOrders = await this.client.openOrders({ symbol })
    const ocoOrders = openOrders.filter(order =>
      order.type === 'STOP_LOSS_LIMIT' || order.type === 'TAKE_PROFIT_LIMIT'
    )

    if (ocoOrders.length > 0) {
      const entryPrice = await this.getEntryPrice(symbol)
      if (entryPrice === undefined) {
        console.error(`Impossible de récupérer le prix d'entrée pour ${symbol}`)
        return
      }

      const potentialProfit = this.calculateProfit(entryPrice, currentPrice)
      const minProfitPercentage = 1

      if (potentialProfit >= minProfitPercentage) {
        for (const order of ocoOrders) {
          await this.client.cancelOrder({ symbol, orderId: order.orderId })
          console.log(`Ordre ${order.type} annulé pour ${symbol} (ID: ${order.orderId})`)
        }
        await this.executeMarketOrder(symbol, OrderSide.SELL, quantity)
      } else {
        console.log(`Profit potentiel insuffisant pour vendre ${symbol}. Profit actuel : ${potentialProfit}%`)
      }
    } else {
      await this.executeMarketOrder(symbol, OrderSide.SELL, quantity)
    }
  }

  private async getEntryPrice (symbol: string): Promise<number | undefined> {
    const trades = await this.client.myTrades({ symbol })
    const lastBuyTrade = trades.reverse().find(trade => trade.isBuyer)

    if (lastBuyTrade !== undefined) {
      return parseFloat(lastBuyTrade.price)
    }

    return undefined
  }

  private calculateProfit (entryPrice: number, currentPrice: number): number {
    return ((currentPrice - entryPrice) / entryPrice) * 100
  }

  private async getSymbolInfo (symbol: string): Promise<{ minQty: number, stepSize: number, tickSize: number } | null> {
    const exchangeInfo = await this.client.exchangeInfo()
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol)

    if (symbolInfo === undefined) {
      console.error(`Informations pour ${symbol} introuvables.`)
      return null
    }

    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE')
    const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER')

    if (lotSizeFilter === undefined || !('minQty' in lotSizeFilter && 'stepSize' in lotSizeFilter)) {
      console.error(`Filtres LOT_SIZE ou PRICE_FILTER introuvables pour ${symbol}.`)
      return null
    }

    if (priceFilter === undefined || !('tickSize' in priceFilter)) {
      console.error(`PRICE_FILTER introuvable ou incomplet pour ${symbol}.`)
      return null
    }

    return {
      minQty: parseFloat(lotSizeFilter.minQty),
      stepSize: parseFloat(lotSizeFilter.stepSize),
      tickSize: parseFloat(priceFilter.tickSize)
    }
  }

  private async getLastPrice (symbol: string): Promise<number | undefined> {
    const ticker = await this.client.prices({ symbol })
    const price = parseFloat(ticker[symbol])
    if (price === undefined) {
      console.error(`Impossible de récupérer le prix pour ${symbol}`)
    }
    return price
  }

  private calculateQuantity (price: number, stepSize: number, side: OrderSide, symbol: string, minQty: number): string | null {
    const amountToSpend = parseFloat(process.env.AMOUNT_TO_SPEND ?? '10')
    let quantity = (amountToSpend / price).toFixed(6)
    quantity = (Math.floor(parseFloat(quantity) / stepSize) * stepSize).toFixed(6)

    if (parseFloat(quantity) < minQty) {
      console.error(`Quantité trop petite pour ${symbol}. Quantité minimale: ${minQty}, Quantité calculée: ${quantity}`)
      return null
    }

    return quantity
  }

  private async executeMarketOrder (symbol: string, side: OrderSide, quantity: string): Promise<void> {
    await this.client.order({
      symbol,
      side,
      quantity,
      type: OrderType.MARKET
    }).catch(console.error)

    console.log(`Ordre ${side} placé pour ${symbol}, quantité: ${quantity}`)
    this.telegram.sendMessageAll(`Ordre ${side} placé pour ${symbol}, quantité: ${quantity}`).catch(console.error)
  }

  private async placeOCOOrder (symbol: string, quantity: string, price: number, takeProfitPercentage: number, tickSize: number): Promise<void> {
    const takeProfitPrice = this.calculatePrice(price, takeProfitPercentage, tickSize, true)
    const stopPrice = this.calculatePrice(price, 2, tickSize, false)
    const stopLimitPrice = this.calculatePrice(parseFloat(stopPrice), 1, tickSize, false)

    await this.client.orderOco({
      symbol,
      side: OrderSide.SELL,
      quantity,
      price: takeProfitPrice,
      stopPrice,
      stopLimitPrice,
      stopLimitTimeInForce: 'GTC'
    }).catch(console.error)

    console.log(`Ordre OCO de vente placé : Take Profit à ${takeProfitPrice}, Stop à ${stopPrice}, Stop Limit à ${stopLimitPrice} pour ${symbol}`)
    this.telegram.sendMessageAll(`Ordre OCO de vente placé : Take Profit à ${takeProfitPrice}, Stop à ${stopPrice}, Stop Limit à ${stopLimitPrice} pour ${symbol}`).catch(console.error)
  }

  private calculatePrice (basePrice: number, percentage: number, tickSize: number, isIncrease: boolean): string {
    const factor = isIncrease ? 1 + percentage / 100 : 1 - percentage / 100
    let price = (basePrice * factor).toFixed(6)
    price = (Math.floor(parseFloat(price) / tickSize) * tickSize).toFixed(6)
    return price
  }
}
