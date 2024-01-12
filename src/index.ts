import { Binance } from './Binance'
import { Telegram } from './Telegram'
import { BotAlgorithm } from './BotAlgorithm'
import { botInstance } from './utils/constant'
import { type typeInstance } from './utils/type'
import fs from 'fs'
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

  if (instance.lastDecision.length === 20) {
    instance.lastDecision.shift()
  }
  instance.lastDecision.push(tmp)
}

let i = 100
const binance = new Binance('BTCUSDT', '1m', 100)
const Bigdata = binance.fetchMarketDataOffline('./data/BTCUSDT-1m-2023-12.csv')

function writeToLogFile (logMessage: string): void {
  // Chemin vers le fichier de log
  const filePath = './output/my-log-file.txt';

  // Créer le message de log avec la date
  const logEntry = `${logMessage}\n`;

  // Écrire le message de log dans le fichier
  fs.appendFile(filePath, logEntry, (err: any) => {
    if (err) {
      console.error(`Erreur lors de l'écriture dans le fichier de log : ${err}`);
    } else {
      console.log('Log enregistré avec succès.');
    }
  });
}

async function processInstanceOffline (instance: typeInstance): Promise<void> {
  let tmp: string = 'HOLD'
  let data = await Bigdata
  if (i === data.length) {
    console.log('End of data')
  }
  data = data.slice(i - 100, i)
  const algo = new BotAlgorithm(instance.macdShortPeriod, instance.macdLongPeriod, instance.macdSignalPeriod, instance.rsiPeriod, instance.lastDecision[instance.lastDecision.length - 1])
  const { decision } = await algo.tradeDecision(data)
  const date = new Date(parseInt(data[data.length - 1].open_time)).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })

  if (decision === 'BUY' && instance.lastDecision.find((i) => i === 'BUY') === undefined) {
    tmp = 'BUY'
    // console.log(`BUY date: ${date} Price: ${data[data.length - 1].close}`)
    writeToLogFile(`BUY date: ${date} Price: ${data[data.length - 1].close}`)
  } else if (decision === 'SELL' && instance.lastDecision.find((i) => i === 'SELL') === undefined) {
    tmp = 'SELL'
    // console.log(`SELL date: ${date} Price: ${data[data.length - 1].close}`)
    writeToLogFile(`SELL date: ${date} Price: ${data[data.length - 1].close}`)
  } else if (decision === 'POTENTIAL_BUY' && instance.lastDecision.find((i) => i === 'POTENTIAL_BUY') === undefined) {
    tmp = 'POTENTIAL_BUY'
    console.log(`POTENTIAL_BUY Price: ${data[data.length - 1].close}`)
  } else if (decision === 'POTENTIAL_SELL' && instance.lastDecision.find((i) => i === 'POTENTIAL_SELL') === undefined) {
    tmp = 'POTENTIAL_SELL'
    console.log(`POTENTIAL_SELL Price: ${data[data.length - 1].close}`)
  } else {
    tmp = 'HOLD'
  }

  if (instance.lastDecision.length === 20) {
    instance.lastDecision.shift()
  }
  instance.lastDecision.push(tmp)
  i += 1
}

async function main (): Promise<void> {
  await Promise.all(botInstances.map(processInstanceOffline))
  // await Promise.all(botInstances.map(processInstance))
}

main().then(() => { console.log('Bot started') }).catch((err) => { console.log(err) })

function repeatMain (): void {
  main().then(() => setTimeout(repeatMain, 1000)).catch((err) => { console.log(err) })
}

repeatMain()
