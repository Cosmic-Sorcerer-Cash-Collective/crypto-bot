import { Binance } from './Binance'
import { Telegram } from './Telegram'
import { type typeInstance } from './utils/type'
import { TechnicalIndicator } from './TechnicalIndicator'
import { BotAlgorithm } from './BotAlgorithm'
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()

const botInstancesHour: typeInstance[] = []
const botInstancesDay: typeInstance[] = []
const binance = new Binance('BTCUSDT', '1h', 30)
const MINIMUM_VOLUME = 1500000
const apiTelegram = new Telegram()
apiTelegram.run()

async function processInstance (instance: typeInstance): Promise<void> {
  const data = await instance.binance.fetchMarketData()
  const { decision } = await instance.botAlgorithm.tradeDecision(data)

  if (decision === 'BUY' && !instance.lastDecision.includes('BUY')) {
    if (instance.interval === '1h') {
      await apiTelegram.sendMessageAll(`✅ *BUY* court terme 📈 \n\n Symbole: ${instance.symbol}\nPrice: ${data[data.length - 1].close}`)
    } else if (instance.interval === '1d') {
      await apiTelegram.sendMessageAll(`✅ *BUY* long terme 📈\n\n Symbole: ${instance.symbol}\nPrice: ${data[data.length - 1].close}`)
    }
  } else if (decision === 'SELL' && !instance.lastDecision.includes('SELL')) {
    if (instance.interval === '1h') {
      await apiTelegram.sendMessageAll(`🛑 *SELL* court terme 📉 \n\n Symbole: ${instance.symbol}\nPrice: ${data[data.length - 1].close}`)
    } else if (instance.interval === '1d') {
      await apiTelegram.sendMessageAll(`🛑 *SELL* long terme 📉\n\n Symbole: ${instance.symbol}\nPrice: ${data[data.length - 1].close}`)
    }
  }
}

async function mainDay (): Promise<void> {
  await Promise.all(botInstancesDay.map(processInstance))
}

async function mainHour (): Promise<void> {
  await Promise.all(botInstancesHour.map(processInstance))
}

async function createInstanceDay (): Promise<void> {
  const getSymb: string[] = await binance.fetchMarketExchangeInfo()
  const highVolumePairs = await Promise.all(
    getSymb.map(async (symb: string, index: number) => {
      const volume = await binance.fetchPairVolume(symb)
      if (volume != null && volume >= MINIMUM_VOLUME) {
        return {
          id: index,
          symbol: symb,
          interval: '1d',
          macdShortPeriod: 12,
          macdLongPeriod: 26,
          macdSignalPeriod: 9,
          rsiPeriod: 14,
          lastDecision: ['HOLD'],
          binance: new Binance(symb, '1d', 30),
          technicalIndicator: new TechnicalIndicator(),
          botAlgorithm: new BotAlgorithm(12, 26, 9, 14, 'HOLD')
        }
      } else {
        return null
      }
    })
  )
  const filtered = highVolumePairs.filter((instance) => instance !== null)
  if (filtered != null) {
    botInstancesDay.push(...(filtered as typeInstance[]))
  }
}

async function createInstanceHour (): Promise<void> {
  const getSymb: string[] = await binance.fetchMarketExchangeInfo()
  const highVolumePairs = await Promise.all(
    getSymb.map(async (symb: string, index: number) => {
      const volume = await binance.fetchPairVolume(symb)
      if (volume != null && volume >= MINIMUM_VOLUME) {
        return {
          id: index,
          symbol: symb,
          interval: '1h',
          macdShortPeriod: 12,
          macdLongPeriod: 26,
          macdSignalPeriod: 9,
          rsiPeriod: 14,
          lastDecision: ['HOLD'],
          binance: new Binance(symb, '1h', 30),
          technicalIndicator: new TechnicalIndicator(),
          botAlgorithm: new BotAlgorithm(12, 26, 9, 14, 'HOLD')
        }
      } else {
        return null
      }
    })
  )
  const filtered = highVolumePairs.filter((instance) => instance !== null)
  if (filtered != null) {
    botInstancesHour.push(...(filtered as typeInstance[]))
  }
}

createInstanceHour().catch((err) => { console.log(err) })
createInstanceDay().catch((err) => { console.log(err) })
console.log('Bot is running...')
mainDay().catch((err) => { console.log(err) })
mainHour().catch((err) => { console.log(err) })

function repeatMain (): void {
  mainHour().then(() => setTimeout(repeatMain, 20 * 60 * 1000)).catch((err) => { console.log(err) })
  mainDay().then(() => setTimeout(repeatMain, 60 * 60 * 1000)).catch((err) => { console.log(err) })
}

repeatMain()
