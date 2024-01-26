import { Binance } from './Binance'
import { Telegram } from './Telegram'
import { type typeInstance } from './utils/type'
import { TechnicalIndicator } from './TechnicalIndicator'
import { BotAlgorithm } from './BotAlgorithm'
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()

const botInstances: typeInstance[] = []
const binance = new Binance('BTCUSDT', '1h', 30)
const apiTelegram = new Telegram()
apiTelegram.run()

async function processInstance (instance: typeInstance): Promise<void> {
  const data = await instance.binance.fetchMarketData()
  const { decision } = await instance.botAlgorithm.tradeDecision(data)

  if (decision === 'BUY' && !instance.lastDecision.includes('BUY')) {
    await apiTelegram.sendMessageAll(`✅ *BUY* \n\n Symbole: ${instance.symbol}\nPrice: ${data[data.length - 1].close}`);
  } else if (decision === 'SELL' && !instance.lastDecision.includes('SELL')) {
    await apiTelegram.sendMessageAll(`🛑 *SELL* \n\n Symbole: ${instance.symbol}\nPrice: ${data[data.length - 1].close}`);
  } else if (decision === 'POTENTIAL_BUY' && !instance.lastDecision.includes('POTENTIAL_BUY')) {
    await apiTelegram.sendMessageAll(`⚠️ *POTENTIAL BUY* \n\n Symbole: ${instance.symbol}\nPrice: ${data[data.length - 1].close}`);
  } else if (decision === 'POTENTIAL_SELL' && !instance.lastDecision.includes('POTENTIAL_SELL')) {
    await apiTelegram.sendMessageAll(`⚠️ *POTENTIAL SELL* \n\n Symbole: ${instance.symbol}\nPrice: ${data[data.length - 1].close}`);
  }
}

async function main (): Promise<void> {
  await Promise.all(botInstances.map(processInstance))
}

async function createInstance (): Promise<void> {
  const getSymb: string[] = await binance.fetchMarketExchangeInfo()
  getSymb.forEach((symb: string, index: number) => {
    botInstances.push({
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
    })
  })
}

createInstance().then(() => { console.log('instance created') }).catch((err) => { console.log(err) })

main().then(() => { console.log('Bot started') }).catch((err) => { console.log(err) })

function repeatMain (): void {
  main().then(() => setTimeout(repeatMain, 30 * 60 * 1000)).catch((err) => { console.log(err) })
}

repeatMain()
