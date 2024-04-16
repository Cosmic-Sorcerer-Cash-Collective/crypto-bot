import { Binance } from './Binance'
import { Telegram } from './Telegram'
import { type typeInstance } from './utils/type'
import { TechnicalIndicator } from './TechnicalIndicator'
import { BotAlgorithm } from './BotAlgorithm'
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()

let botInstancesHour: typeInstance[] = []
let botInstancesDay: typeInstance[] = []
let botInstancesMinute: typeInstance[] = []
const binance = new Binance('BTCUSDT', '1h', 30)
const MINIMUM_VOLUME = 1500000
const apiTelegram = new Telegram(binance)
apiTelegram.run()

async function processInstanceShortTerm (instance: typeInstance): Promise<void> {
  const data = await instance.binance.fetchMarketData()
  const { decision } = await instance.botAlgorithm.tradeDecisionShort(data)

  const formatMessage = (action: string, trend: string, term: string, recommendation?: string, amount?: number, duration?: string): string => {
    let message = `
${action === 'BUY' ? '✅' : '❌'} *${action}* ${action === 'BUY' ? '📈' : '📉'}
${trend}: ${term}

**Symbole:** ${instance.symbol}
**Price:** ${data[data.length - 1].close}
    `
    if (recommendation != null && amount != null && duration != null) {
      message += `
**Recommandation:** ${recommendation}
**Montant suggéré:** ${amount.toFixed(2)}%
**Durée suggérée:** ${duration}
      `
    }
    return message
  }

  if (decision === 'STRONG_BUY' || decision === 'MEDIUM_BUY') {
    const trendType = instance.interval === '1h' ? 'moyen terme' : instance.interval === '1d' ? 'long terme' : 'court terme'
    const actionType = decision === 'STRONG_BUY' ? 'Fort' : 'Moyenne'

    let recommendation = ''
    let amount = 0
    let duration = ''
    if (decision === 'STRONG_BUY') {
      recommendation = 'Achat fortement recommandé'
      amount = 50
      duration = 'quelques heures à quelques jours'
    } else if (decision === 'MEDIUM_BUY') {
      recommendation = 'Achat modérément recommandé'
      amount = 25
      duration = 'quelques jours à quelques semaines'
    }

    await apiTelegram.sendMessageAll(formatMessage('BUY', `${actionType} tendance`, trendType, recommendation, amount, duration))
  } else if (decision === 'STRONG_SELL' || decision === 'MEDIUM_SELL') {
    await apiTelegram.sendMessageAll(`
📉 *SELL* 📉\n
**Symbole:** ${instance.symbol}
**Price:** ${data[data.length - 1].close}
      `)
  }
}

async function processInstanceLongTerm (instance: typeInstance): Promise<void> {
  const data = await instance.binance.fetchMarketData()
  const { decision } = await instance.botAlgorithm.tradeDecisionShort(data)

  const formatMessage = (action: string, trend: string, term: string, recommendation?: string, amount?: number, duration?: string): string => {
    let message = `
${action === 'BUY' ? '✅' : '❌'} *${action}* ${action === 'BUY' ? '📈' : '📉'}
${trend}: ${term}

**Symbole:** ${instance.symbol}
**Price:** ${data[data.length - 1].close}
    `
    if (recommendation != null && amount != null && duration != null) {
      message += `
**Recommandation:** ${recommendation}
**Montant suggéré:** ${amount.toFixed(2)}%
**Durée suggérée:** ${duration}
      `
    }
    return message
  }

  if (decision === 'STRONG_BUY' || decision === 'MEDIUM_BUY') {
    const trendType = instance.interval === '1h' ? 'moyen terme' : instance.interval === '1d' ? 'long terme' : 'court terme'
    const actionType = decision === 'STRONG_BUY' ? 'Fort' : 'Moyenne'

    let recommendation = ''
    let amount = 0
    let duration = ''
    if (decision === 'STRONG_BUY') {
      recommendation = 'Achat fortement recommandé'
      amount = 50
      duration = 'quelques heures à quelques jours'
    } else if (decision === 'MEDIUM_BUY') {
      recommendation = 'Achat modérément recommandé'
      amount = 25
      duration = 'quelques jours à quelques semaines'
    }

    await apiTelegram.sendMessageAll(formatMessage('BUY', `${actionType} tendance`, trendType, recommendation, amount, duration))
  } else if (decision === 'STRONG_SELL' || decision === 'MEDIUM_SELL') {
    await apiTelegram.sendMessageAll(`
📉 *SELL* 📉\n
**Symbole:** ${instance.symbol}
**Price:** ${data[data.length - 1].close}
      `)
  }
}

async function mainMinute (): Promise<void> {
  await Promise.all(botInstancesMinute.map(processInstanceShortTerm))
}

async function mainDay (): Promise<void> {
  await Promise.all(botInstancesDay.map(processInstanceLongTerm))
}

async function mainHour (): Promise<void> {
  await Promise.all(botInstancesHour.map(processInstanceShortTerm))
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
          binance: new Binance(symb, '1d', 100),
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
          interval: '5m',
          macdShortPeriod: 12,
          macdLongPeriod: 26,
          macdSignalPeriod: 9,
          rsiPeriod: 14,
          lastDecision: ['HOLD'],
          binance: new Binance(symb, '5m', 50),
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

mainHour().catch((err) => { console.log(err) })
mainDay().catch((err) => { console.log(err) })
mainMinute().catch((err) => { console.log(err) })

function repeatProcessInstanceHour (): void {
  mainHour().catch((err) => { console.log(err) })
}

function repeatProcessInstanceDay (): void {
  mainDay().catch((err) => { console.log(err) })
}

function repeatProcessInstanceMinute (): void {
  mainMinute().catch((err) => { console.log(err) })
}

setInterval(repeatProcessInstanceHour, 10 * 60 * 1000)
setInterval(repeatProcessInstanceDay, 30 * 60 * 1000)
setInterval(repeatProcessInstanceMinute, 1 * 60 * 1000)
