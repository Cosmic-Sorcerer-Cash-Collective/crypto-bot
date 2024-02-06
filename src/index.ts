import { Binance } from './Binance'
import { Telegram } from './Telegram'
import { type typeInstance } from './utils/type'
import { TechnicalIndicator } from './TechnicalIndicator'
import { BotAlgorithm } from './BotAlgorithm'
import { Postgres } from './database/Postgres'
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()

let botInstancesHour: typeInstance[] = []
let botInstancesDay: typeInstance[] = []
let botInstancesMinute: typeInstance[] = []
const binance = new Binance('BTCUSDT', '1h', 30)
const MINIMUM_VOLUME = 1500000
const database = new Postgres()
const apiTelegram = new Telegram(binance, database)
apiTelegram.run()
database.connect().catch((err) => { console.log(err) })

async function processInstance (instance: typeInstance): Promise<void> {
  const data = await instance.binance.fetchMarketData()
  const { decision } = await instance.botAlgorithm.tradeDecision(data)
  const closePrice = parseFloat(data[data.length - 1].close)

  const formatMessage = (action: string, trend: string, term: string): string => {
    return `
${action === 'BUY' ? '✅' : '❌'} *${action}* ${action === 'BUY' ? '📈' : '📉'}
${trend}: ${term}

**Symbole:** ${instance.symbol}
**Price:** ${data[data.length - 1].close}
  `
  }

  if (decision === 'STRONG_BUY' || decision === 'MEDIUM_BUY') {
    const trendType = instance.interval === '1h' ? 'moyen terme' : instance.interval === '1d' ? 'long terme' : 'court terme'
    const actionType = decision === 'STRONG_BUY' ? 'Fort' : 'Moyenne'

    await apiTelegram.sendMessageAll(formatMessage('BUY', `${actionType} tendance`, trendType))
    const result = await database.query(`SELECT * FROM crypto WHERE pair = '${instance.symbol}'`).catch((err) => { console.log(err) })
    if (result.length === 0) {
      await database.insert(`INSERT INTO crypto (pair, close_price) VALUES ('${instance.symbol}', ${closePrice})`).catch((err) => { console.log(err) })
    }
  } else if (decision === 'STRONG_SELL' || decision === 'MEDIUM_SELL') {
    const result = await database.query(`SELECT * FROM crypto WHERE pair = '${instance.symbol}'`).catch((err) => { console.log(err) })
    if (result.length > 0) {
      const price = result[result.length - 1].close_price
      const profit = ((closePrice - price) / price) * 100
      await apiTelegram.sendMessageAll(`📉 *SELL* 📉
      **Symbole:** ${instance.symbol}
      **Price:** ${data[data.length - 1].close}
      **Profit:** ${profit.toFixed(2)}%
      `)
      database.delete(`DELETE FROM crypto WHERE pair = '${instance.symbol}'`).catch((err) => { console.log(err) })
      const update = await database.query(`SELECT * FROM dataCrypto WHERE pair = '${instance.symbol}'`).catch((err) => { console.log(err) })
      if (update.length > 0) {
        const profitTotal = update[update.length - 1].profit + profit
        await database.update(`UPDATE dataCrypto SET profit = ${profitTotal} WHERE pair = '${instance.symbol}'`).catch((err) => { console.log(err) })
      } else {
        await database.insert(`INSERT INTO dataCrypto (pair, nbSignals, percentProfit) VALUES ('${instance.symbol}', '${result[0].nbSignals++}', ${profit})`).catch((err) => { console.log(err) })
      }
    }
  }
}

async function mainMinute (): Promise<void> {
  await Promise.all(botInstancesMinute.map(processInstance))
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

async function createInstanceMinute (): Promise<void> {
  const getSymb: string[] = await binance.fetchMarketExchangeInfo()
  const highVolumePairs = await Promise.all(
    getSymb.map(async (symb: string, index: number) => {
      const volume = await binance.fetchPairVolume(symb)
      if (volume != null && volume >= MINIMUM_VOLUME) {
        return {
          id: index,
          symbol: symb,
          interval: '1m',
          macdShortPeriod: 12,
          macdLongPeriod: 26,
          macdSignalPeriod: 9,
          rsiPeriod: 14,
          lastDecision: ['HOLD'],
          binance: new Binance(symb, '1m', 50),
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
    botInstancesMinute = (filtered as typeInstance[])
  }
}

createInstanceMinute().catch((err) => { console.log(err) })
createInstanceHour().catch((err) => { console.log(err) })
createInstanceDay().catch((err) => { console.log(err) })
console.log('Bot is running...')

mainHour().catch((err) => { console.log(err) })
mainDay().catch((err) => { console.log(err) })

function repeatProcessInstanceHour (): void {
  mainHour().catch((err) => { console.log(err) })
}

function repeatProcessInstanceDay (): void {
  mainDay().catch((err) => { console.log(err) })
}

function repeatProcessInstanceMinute (): void {
  mainMinute().catch((err) => { console.log(err) })
}

setInterval(repeatProcessInstanceHour, 20 * 60 * 1000)
setInterval(repeatProcessInstanceDay, 60 * 60 * 1000)
setInterval(repeatProcessInstanceMinute, 2.5 * 60 * 1000)
