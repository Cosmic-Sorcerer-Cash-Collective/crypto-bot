import { Binance } from './Binance'
import { Telegram } from './Telegram'
import { type typeInstance } from './utils/type'
import { TechnicalIndicator } from './TechnicalIndicator'
import { BotAlgorithm } from './BotAlgorithm'
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()

let botInstancesHour: typeInstance[] = []
let botInstancesDay: typeInstance[] = []
const binance = new Binance('BTCUSDT', '1h', 30)
const MINIMUM_VOLUME = 1500000
const apiTelegram = new Telegram()
apiTelegram.run()

// async function processInstanceOffline (): Promise<void> {
//   const data = await binance.fetchMarketDataOffline('./data.csv')
//   const instance = {
//     id: 0,
//     symbol: 'BTCUSDT',
//     interval: '1h',
//     macdShortPeriod: 12,
//     macdLongPeriod: 26,
//     macdSignalPeriod: 9,
//     rsiPeriod: 14,
//     lastDecision: ['HOLD'],
//     technicalIndicator: new TechnicalIndicator(),
//     botAlgorithm: new BotAlgorithm()
//   }

//   for (let i = 50; i < data.length; i++) {
//     const { decision } = await instance.botAlgorithm.tradeDecision(data.slice(i - 50, i))
//     const formatMessage = (action: string, trend: string, term: string): string => {
//       return `
//         ${action === 'BUY' ? '✅' : '❌'} *${action}*
//         ${trend}: ${term} 📈

//         **Symbole:** ${instance.symbol}
//         **Price:** ${data[i].close}
//       `
//     }

//     if (decision === 'STRONG_BUY' || decision === 'MEDIUM_BUY') {
//       const trendType = instance.interval === '1h' ? 'court terme' : 'long terme'
//       const actionType = decision === 'STRONG_BUY' ? 'Fort' : 'Moyenne'

//       await apiTelegram.sendMessageAll(formatMessage('BUY', `${actionType} tendance`, trendType))
//     } else if (decision === 'STRONG_SELL' || decision === 'MEDIUM_SELL') {
//       const trendType = instance.interval === '1h' ? 'court terme' : 'long terme'
//       const actionType = decision === 'STRONG_SELL' ? 'Fort' : 'Moyenne'

//       await apiTelegram.sendMessageAll(formatMessage('SELL', `${actionType} tendance`, trendType))
//     }
//   }
//   console.log('Bot is finished...')
// }

async function processInstance (instance: typeInstance): Promise<void> {
  const data = await instance.binance.fetchMarketData()
  const { decision } = await instance.botAlgorithm.tradeDecision(data)

  const formatMessage = (action: string, trend: string, term: string): string => {
    return `
${action === 'BUY' ? '✅' : '❌'} *${action}* ${action === 'BUY' ? '📈' : '📉'}
${trend}: ${term}

**Symbole:** ${instance.symbol}
**Price:** ${data[data.length - 1].close}
  `
  }

  if (decision === 'STRONG_BUY' || decision === 'MEDIUM_BUY') {
    const trendType = instance.interval === '1h' ? 'court terme' : 'long terme'
    const actionType = decision === 'STRONG_BUY' ? 'Fort' : 'Moyenne'

    await apiTelegram.sendMessageAll(formatMessage('BUY', `${actionType} tendance`, trendType))
  } else if (decision === 'STRONG_SELL' || decision === 'MEDIUM_SELL') {
    const trendType = instance.interval === '1h' ? 'court terme' : 'long terme'
    const actionType = decision === 'STRONG_SELL' ? 'Fort' : 'Moyenne'

    await apiTelegram.sendMessageAll(formatMessage('SELL', `${actionType} tendance`, trendType))
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
          binance: new Binance(symb, '1d', 50),
          technicalIndicator: new TechnicalIndicator(),
          botAlgorithm: new BotAlgorithm()
        }
      } else {
        return null
      }
    })
  )
  const filtered = highVolumePairs.filter((instance) => instance !== null)
  if (filtered != null) {
    botInstancesDay = (filtered as typeInstance[])
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
          binance: new Binance(symb, '1h', 50),
          technicalIndicator: new TechnicalIndicator(),
          botAlgorithm: new BotAlgorithm()
        }
      } else {
        return null
      }
    })
  )
  const filtered = highVolumePairs.filter((instance) => instance !== null)
  if (filtered != null) {
    botInstancesHour = (filtered as typeInstance[])
  }
}

createInstanceHour().catch((err) => { console.log(err) })
createInstanceDay().catch((err) => { console.log(err) })
console.log('Bot is running...')

mainHour().catch((err) => { console.log(err) })
mainDay().catch((err) => { console.log(err) })

// function repeatMain (): void {
//   mainHour().then(() => setTimeout(repeatMain, 60 * 1000)).catch((err) => { console.log(err) })
//   mainDay().then(() => setTimeout(repeatMain, 60 * 60 * 1000)).catch((err) => { console.log(err) })
//   // processInstanceOffline().catch((err) => { console.log(err) })
// }

function repeatProcessInstanceHour (): void {
  mainHour().catch((err) => { console.log(err) })
}

function repeatProcessInstanceDay (): void {
  mainDay().catch((err) => { console.log(err) })
}

setInterval(repeatProcessInstanceHour, 20 * 60 * 1000)
setInterval(repeatProcessInstanceDay, 60 * 60 * 1000)
// repeatMain()
