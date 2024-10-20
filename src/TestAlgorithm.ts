import Binance, { OrderSide, OrderType } from 'binance-api-node'
import { Telegram } from './Telegram'
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()

async function testOrderPlacement (): Promise<void> {
  // Initialisation du client Binance et de Telegram
  const client = Binance({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET
  })

  const telegram = new Telegram()
  telegram.run()

  const symbol = 'ATOMUSDT' // Paire à tester
  const side = OrderSide.BUY // Ordre d'achat
  let amountToSpend = 10 // Montant initial en USDT à dépenser

  try {
    // 1. Récupérer les informations de la paire pour LOT_SIZE, MIN_NOTIONAL et PRICE_FILTER
    const exchangeInfo = await client.exchangeInfo()
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol)

    if (symbolInfo === undefined) {
      console.error(`Informations pour ${symbol} introuvables.`)
      return
    }

    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE')
    const notionalFilter = symbolInfo.filters.find(f => f.filterType === 'MIN_NOTIONAL')
    const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER')

    if (lotSizeFilter === undefined || !('minQty' in lotSizeFilter && 'stepSize' in lotSizeFilter)) {
      console.error(`LOT_SIZE filter introuvable ou incomplet pour ${symbol}.`)
      return
    }

    if (priceFilter === undefined || !('tickSize' in priceFilter)) {
      console.error(`PRICE_FILTER introuvable ou incomplet pour ${symbol}.`)
      return
    }

    const minQty = parseFloat(lotSizeFilter.minQty)
    const stepSize = parseFloat(lotSizeFilter.stepSize)
    const tickSize = parseFloat(priceFilter.tickSize)

    let minNotional = 5 // Fallback valeur par défaut

    if (notionalFilter !== undefined && 'minNotional' in notionalFilter) {
      minNotional = parseFloat(notionalFilter.minNotional as string)
    } else {
      console.warn(`MIN_NOTIONAL filter introuvable pour ${symbol}. Utilisation de la valeur par défaut: ${minNotional} USDT.`)
    }

    // 2. Récupérer le dernier prix pour la paire
    const ticker = await client.prices({ symbol })
    const price = parseFloat(ticker[symbol])

    if (price === undefined) {
      console.error(`Impossible de récupérer le prix pour ${symbol}`)
      return
    }

    // 3. Calculer la quantité à acheter
    let quantity = (amountToSpend / price).toFixed(6)

    // 4. Ajuster la quantité pour respecter les règles de LOT_SIZE
    quantity = (Math.floor(parseFloat(quantity) / stepSize) * stepSize).toFixed(6)

    // Vérifier si la quantité est suffisante (minQty)
    if (parseFloat(quantity) < minQty) {
      console.error(`Quantité trop petite pour ${symbol}. Quantité minimale: ${minQty}, Quantité calculée: ${quantity}`)
      return
    }

    // 5. Vérifier si la valeur totale (quantity * price) respecte le minNotional
    let notionalValue = parseFloat(quantity) * price
    if (notionalValue < minNotional) {
      console.warn(`Valeur totale trop petite (${notionalValue} USDT) pour ${symbol}. Ajustement pour atteindre ${minNotional} USDT.`)
      amountToSpend = minNotional + 0.1 // Ajuster pour dépasser légèrement le minNotional
      quantity = (amountToSpend / price).toFixed(6)
      quantity = (Math.floor(parseFloat(quantity) / stepSize) * stepSize).toFixed(6)
      notionalValue = parseFloat(quantity) * price
    }

    // 6. Placer un ordre de marché pour acheter la quantité calculée
    await client.order({
      symbol,
      side,
      quantity,
      type: OrderType.MARKET
    })

    console.log(`Ordre ${side} placé pour ${symbol}, quantité: ${quantity}, montant total: ${notionalValue} USDT`)
    await telegram.sendMessageAll(`Ordre ${side} placé pour ${symbol}, quantité: ${quantity}, montant total: ${notionalValue} USDT`)

    // 7. Si achat, définir le Take Profit et Stop Loss
    if (side === OrderSide.BUY) {
      let takeProfitPrice = (price * 1.02).toFixed(6) // 2% au-dessus du prix d'achat
      let stopLossPrice = (price * 0.98).toFixed(6) // 2% en dessous du prix d'achat

      // 8. Ajuster les prix de Take Profit et Stop Loss selon la tickSize
      takeProfitPrice = (Math.floor(parseFloat(takeProfitPrice) / tickSize) * tickSize).toFixed(6)
      stopLossPrice = (Math.floor(parseFloat(stopLossPrice) / tickSize) * tickSize).toFixed(6)

      // Placer des ordres Stop Loss et Take Profit
      await client.order({
        symbol,
        side: OrderSide.SELL,
        quantity,
        price: takeProfitPrice, // Take Profit à 2%
        stopPrice: stopLossPrice, // Stop Loss à 2%
        type: OrderType.STOP_LOSS_LIMIT
      })

      console.log(`Take Profit à ${takeProfitPrice} et Stop Loss à ${stopLossPrice} placés pour ${symbol}`)
      await telegram.sendMessageAll(`Take Profit à ${takeProfitPrice} et Stop Loss à ${stopLossPrice} placés pour ${symbol}`)
    }
  } catch (error) {
    console.error(`Erreur lors de la tentative de placement d'ordre pour ${symbol}:`, error)
    await telegram.sendMessageAll(`Erreur lors du placement de l'ordre pour ${symbol}`)
  }
}

testOrderPlacement().then(() => {
  console.log('Test d\'achat terminé')
}).catch((error) => {
  console.error('Erreur lors du test:', error)
})
