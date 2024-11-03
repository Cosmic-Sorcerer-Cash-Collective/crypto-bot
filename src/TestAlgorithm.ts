import axios from 'axios'
import { generateSignals, IndicatorBollingerBands, IndicatorIchimoku, IndicatorMACD, IndicatorRSI } from './BotAlgorithm'
import { type dataBinance } from './utils/type'

// Paramètres de l'API Binance et des timeframes
const symbol = 'BTCUSDT'
const timeframes = ['1m', '15m', '1h'] as const // Choisissez les timeframes nécessaires pour votre stratégie
const limit = 1000 // Nombre maximum de bougies par requête

// Fonction pour récupérer les données de Binance pour un timeframe spécifique
async function fetchBinanceData (timeframe: string, startTime: number, endTime: number): Promise<dataBinance[]> {
  const url = 'https://api.binance.com/api/v3/klines'
  const params = {
    symbol,
    interval: timeframe,
    startTime,
    endTime,
    limit
  }

  const response = await axios.get(url, { params })
  return response.data.map((candle: any) => ({
    open_time: candle[0].toString(),
    open: candle[1].toString(),
    high: candle[2].toString(),
    low: candle[3].toString(),
    close: candle[4].toString(),
    volume: candle[5].toString(),
    close_time: candle[6].toString(),
    quote_volume: candle[7].toString(),
    count: candle[8].toString(),
    taker_buy_volume: candle[9].toString(),
    taker_buy_quote_volume: candle[10].toString(),
    ignore: candle[11].toString()
  }))
}

// Fonction pour charger des données multi-timeframes
async function loadMultiTimeframeData (startTime: number, endTime: number): Promise<Record<string, dataBinance[]>> {
  const data: Record<string, dataBinance[]> = {}

  for (const tf of timeframes) {
    console.log(`Fetching ${tf} data...`)
    data[tf] = await fetchBinanceData(tf, startTime, endTime)
  }

  return data
}

// Classe de backtest adaptée au multi-timeframe
class MultiTimeframeBacktest {
  private readonly dataMultiTimeframe: Record<string, dataBinance[]>
  private balance: number
  private readonly initialBalance: number
  private position: 'long' | 'short' | null
  private entryPrice: number | null

  constructor (dataMultiTimeframe: Record<string, dataBinance[]>, initialBalance: number = 1000) {
    this.dataMultiTimeframe = dataMultiTimeframe
    this.balance = initialBalance
    this.initialBalance = initialBalance
    this.position = null
    this.entryPrice = null
  }

  async runBacktest () {
    const indicators = {
      RSI: new IndicatorRSI(14),
      MACD: new IndicatorMACD(12, 26, 9),
      BollingerBands: new IndicatorBollingerBands(20, 2),
      Ichimoku: new IndicatorIchimoku()
    }

    const signals = []

    for (let i = 50; i < this.dataMultiTimeframe['1m'].length; i++) { // Utilise le timeframe 1m comme pilote
      const slicedData: Record<string, dataBinance[]> = {}

      for (const tf of timeframes) {
        slicedData[tf] = this.dataMultiTimeframe[tf].slice(0, Math.min(i + 1, this.dataMultiTimeframe[tf].length))
      }

      // Vérifier la présence des données avant de générer les signaux
      if (!slicedData['1m'] || slicedData['1m'].length === 0) {
        console.warn(`Aucune donnée disponible pour le timeframe '1m' à l'indice ${i}`)
        continue
      }
      if (!slicedData['15m'] || slicedData['15m'].length === 0) {
        console.warn(`Aucune donnée disponible pour le timeframe '15m' à l'indice ${i}`)
        continue
      }
      if (!slicedData['1h'] || slicedData['1h'].length === 0) {
        console.warn(`Aucune donnée disponible pour le timeframe '1h' à l'indice ${i}`)
        continue
      }

      try {
        // Convertir les données en nombre pour les indicateurs
        const closes = slicedData['1m'].map(d => parseFloat(d.close))
        const signal = generateSignals(slicedData, indicators)

        // Vérifier que le signal est bien généré
        if (!signal) {
          console.warn(`Aucun signal généré pour l'indice ${i}`)
          continue
        }

        signals.push({ ...signal, timestamp: this.dataMultiTimeframe['1m'][i].open_time })

        if (signal.buy && this.position !== 'long') {
          this.enterPosition('long', parseFloat(this.dataMultiTimeframe['1m'][i].close))
        } else if (signal.sell && this.position !== 'short') {
          this.enterPosition('short', parseFloat(this.dataMultiTimeframe['1m'][i].close))
        }

        if (this.position === 'long' && this.shouldExitPosition(signal)) {
          this.exitPosition(parseFloat(this.dataMultiTimeframe['1m'][i].close))
        } else if (this.position === 'short' && this.shouldExitPosition(signal)) {
          this.exitPosition(parseFloat(this.dataMultiTimeframe['1m'][i].close))
        }
      } catch (error) {
        console.error(`Erreur lors de la génération du signal à l'indice ${i}:`, error)
      }
    }

    this.logResults()
  }

  enterPosition (position: 'long' | 'short', price: number) {
    console.log(`Entering ${position} at price ${price}`)
    this.position = position
    this.entryPrice = price
  }

  exitPosition (price: number) {
    const profit = this.position === 'long' ? price - this.entryPrice! : this.entryPrice! - price
    this.balance += profit
    console.log(`Exiting ${this.position} at price ${price}. Profit: ${profit}`)
    this.position = null
    this.entryPrice = null
  }

  shouldExitPosition (signal: { buy: boolean, sell: boolean, timeframe: string | null, takeProfitPercentage: number }) {
    const exitPrice = this.entryPrice! * (1 + (signal.takeProfitPercentage / 100) * (this.position === 'long' ? 1 : -1))
    return (this.position === 'long' && parseFloat(this.dataMultiTimeframe['1m'][this.dataMultiTimeframe['1m'].length - 1].close) >= exitPrice) ||
           (this.position === 'short' && parseFloat(this.dataMultiTimeframe['1m'][this.dataMultiTimeframe['1m'].length - 1].close) <= exitPrice)
  }

  logResults () {
    console.log('Backtest Results:')
    console.log(`Initial Balance: $${this.initialBalance}`)
    console.log(`Final Balance: $${this.balance}`)
    console.log(`Total Profit: $${this.balance - this.initialBalance}`)
    console.log(`Return: ${(this.balance - this.initialBalance) / this.initialBalance * 100}%`)
  }
}

// Exécution du backtest multi-timeframe
async function main () {
  const endTime = Date.now()
  const startTime = endTime - 30 * 24 * 60 * 60 * 1000 // 30 jours de données
  const dataMultiTimeframe = await loadMultiTimeframeData(startTime, endTime)
  const backtest = new MultiTimeframeBacktest(dataMultiTimeframe)
  await backtest.runBacktest()
}

main().catch(console.error)
