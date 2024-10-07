import { TradingBot } from './Binance'
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()

// Vos clés API Binance (à sécuriser)
const apiKey = process.env.BINANCE_API_KEY ?? ''
const apiSecret = process.env.BINANCE_API_SECRET ?? ''

// Liste des paires à trader
const pairs = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'ADAUSDT',
  'XRPUSDT',
  'DOTUSDT',
  'LINKUSDT',
  'LTCUSDT',
  'BCHUSDT',
  'DOGEUSDT'
]

const bot = new TradingBot(apiKey, apiSecret, pairs)

const interval = 60 * 1000

// Exécuter immédiatement au démarrage
bot.startTrading().catch((error) => { console.error(error) })

// Programmer l'exécution périodique
setInterval(() => {
  bot.startTrading().catch((error) => { console.error(error) })
}, interval)
