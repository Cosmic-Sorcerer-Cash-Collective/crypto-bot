import { TradingBot } from './modules/trade/Binance'
import { pairs } from './utils/constants'
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()

// Vos clés API Binance (à sécuriser)
const apiKey = process.env.BINANCE_API_KEY ?? ''
const apiSecret = process.env.BINANCE_API_SECRET ?? ''

const bot = new TradingBot(apiKey, apiSecret, pairs)

const interval = 60 * 1000

// Exécuter immédiatement au démarrage
bot.startTrading().catch((error) => { console.error(error) })

// Programmer l'exécution périodique
setInterval(() => {
  bot.startTrading().catch((error) => { console.error(error) })
}, interval)
