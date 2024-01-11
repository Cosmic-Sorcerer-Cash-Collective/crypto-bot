import { Binance } from './Binance'
import { Telegram } from './Telegram'
import { BotAlgorithm } from './BotAlgorithm'
import { botInstance } from './utils/constant'
import { type typeInstance } from './utils/type'
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()

const botInstances: typeInstance[] = botInstance
const apiTelegram = new Telegram()
apiTelegram.run()

async function processInstance (instance: typeInstance): Promise<void> {
  let tmp: string = 'HOLD'
  const binance = new Binance(instance.symbol, instance.interval, 100)
  const data = await binance.fetchMarketData()
  const algo = new BotAlgorithm(instance.macdShortPeriod, instance.macdLongPeriod, instance.macdSignalPeriod, instance.rsiPeriod, instance.lastDecision[instance.lastDecision.length - 1])
  const { decision } = await algo.tradeDecision(data)

  if (decision === 'BUY' && instance.lastDecision.find((i) => i === 'BUY') === undefined) {
    tmp = 'BUY'
    await apiTelegram.sendMessageAll(`📈 BUY ${instance.symbol} ${instance.interval}\nPrice: ${data[data.length - 1].close}`)
  } else if (decision === 'SELL' && instance.lastDecision.find((i) => i === 'SELL') === undefined) {
    tmp = 'SELL'
    await apiTelegram.sendMessageAll(`📉 SELL ${instance.symbol} ${instance.interval}\nPrice: ${data[data.length - 1].close}`)
  } else {
    tmp = 'HOLD'
  }

  if (instance.lastDecision.length === 10) {
    instance.lastDecision.shift()
  }
  instance.lastDecision.push(tmp)
}

async function main (): Promise<void> {
  await Promise.all(botInstances.map(processInstance))
}

main().then(() => { console.log('Bot started') }).catch((err) => { console.log(err) })

function repeatMain (): void {
  main().then(() => setTimeout(repeatMain, 1000)).catch((err) => { console.log(err) })
}

repeatMain()
