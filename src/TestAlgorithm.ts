// Fichier : testAlgorithm.ts

import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'

// Définition des interfaces et types
interface dataBinance {
  open_time: string
  open: string
  high: string
  low: string
  close: string
  volume: string
  close_time: string
  quote_volume: string
  count: string
  taker_buy_volume: string
  taker_buy_quote_volume: string
  ignore: string
}

interface MACDResult {
  macd: Array<number | undefined>
  signal: Array<number | undefined>
  histogram: Array<number | undefined>
}

interface BollingerBandsResult {
  middleBand: Array<number | undefined>
  upperBand: Array<number | undefined>
  lowerBand: Array<number | undefined>
}

// Variables globales pour la gestion des positions et du capital
let positionOpen = false
let positionType: 'buy' | 'sell' | null = null
let entryPrice = 0
let positionSize = 0 // Quantité d'actifs achetés ou vendus
const riskPerTradePercentage = 0.05 // 5% du capital par trade
const stopLossPercentage = 0.02 // 2% de stop loss
const takeProfitPercentage = 0.04 // 4% de take profit
const transactionFee = 0.001 // 0.1% de frais par transaction
const initialCapital = 10000 // Capital initial en USD
let capital = initialCapital

// Fonctions pour les indicateurs techniques

// Calcul du RSI
function calculateRSI (closes: number[], period: number): Array<number | undefined> {
  const gains: number[] = []
  const losses: number[] = []

  for (let i = 1; i < closes.length; i++) {
    const difference = closes[i] - closes[i - 1]
    if (difference >= 0) {
      gains.push(difference)
      losses.push(0)
    } else {
      gains.push(0)
      losses.push(-difference)
    }
  }

  const rsi: Array<number | undefined> = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(undefined)
    } else {
      const avgGain = average(gains.slice(i - period, i))
      const avgLoss = average(losses.slice(i - period, i))

      if (avgLoss === 0) {
        rsi.push(100)
      } else {
        const rs = avgGain / avgLoss
        rsi.push(100 - 100 / (1 + rs))
      }
    }
  }

  return rsi
}

// Calcul de l'EMA
function calculateEMA (data: number[], period: number): Array<number | undefined> {
  const ema: Array<number | undefined> = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(undefined)
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0)
      ema.push(sum / period)
    } else {
      const prevEma = ema[i - 1]
      if (prevEma !== undefined) {
        ema.push((data[i] - prevEma) * multiplier + prevEma)
      } else {
        ema.push(undefined)
      }
    }
  }

  return ema
}

// Calcul du MACD
function calculateMACD (
  closes: number[],
  shortPeriod: number,
  longPeriod: number,
  signalPeriod: number
): MACDResult {
  const shortEMA = calculateEMA(closes, shortPeriod)
  const longEMA = calculateEMA(closes, longPeriod)

  const macd: Array<number | undefined> = []
  for (let i = 0; i < closes.length; i++) {
    const shortValue = shortEMA[i]
    const longValue = longEMA[i]
    if (shortValue !== undefined && longValue !== undefined) {
      macd.push(shortValue - longValue)
    } else {
      macd.push(undefined)
    }
  }

  // Calcul du signal
  const signal = calculateEMA(
    macd.map((v) => v ?? 0),
    signalPeriod
  ).map((v, i) => (macd[i] !== undefined ? v : undefined))

  // Calcul de l'histogramme
  const histogram: Array<number | undefined> = []
  for (let i = 0; i < macd.length; i++) {
    const macdValue = macd[i]
    const signalValue = signal[i]
    if (macdValue !== undefined && signalValue !== undefined) {
      histogram.push(macdValue - signalValue)
    } else {
      histogram.push(undefined)
    }
  }

  return { macd, signal, histogram }
}

// Calcul des Bandes de Bollinger
function calculateBollingerBands (
  closes: number[],
  period: number,
  stdDevMultiplier: number
): BollingerBandsResult {
  const middleBand = calculateSMA(closes, period)
  const upperBand: Array<number | undefined> = []
  const lowerBand: Array<number | undefined> = []

  for (let i = 0; i < closes.length; i++) {
    const middleValue = middleBand[i]
    if (i < period - 1 || middleValue === undefined) {
      upperBand.push(undefined)
      lowerBand.push(undefined)
    } else {
      const slice = closes.slice(i - period + 1, i + 1)
      const stdDev = standardDeviation(slice)
      upperBand.push(middleValue + stdDevMultiplier * stdDev)
      lowerBand.push(middleValue - stdDevMultiplier * stdDev)
    }
  }

  return { middleBand, upperBand, lowerBand }
}

// Fonctions utilitaires internes
function average (data: number[]): number {
  return data.reduce((a, b) => a + b, 0) / data.length
}

function calculateSMA (data: number[], period: number): Array<number | undefined> {
  const sma: Array<number | undefined> = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(undefined)
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      sma.push(sum / period)
    }
  }
  return sma
}

function standardDeviation (data: number[]): number {
  const avg = average(data)
  const squareDiffs = data.map((value) => Math.pow(value - avg, 2))
  const avgSquareDiff = average(squareDiffs)
  return Math.sqrt(avgSquareDiff)
}

// Fonction pour générer les signaux de trading
function generateSignals (
  dataMultiTimeframe: {
    '1h': dataBinance[]
  }
): { buy: boolean, sell: boolean } {
  const closes = dataMultiTimeframe['1h'].map((d) => parseFloat(d.close))
  const highs = dataMultiTimeframe['1h'].map((d) => parseFloat(d.high))
  const lows = dataMultiTimeframe['1h'].map((d) => parseFloat(d.low))

  // Vérifier que nous avons suffisamment de données pour les indicateurs
  if (closes.length < 100) {
    return { buy: false, sell: false }
  }

  // Calcul des indicateurs sur le timeframe 1h
  const rsi = calculateRSI(closes, 14)
  const macd = calculateMACD(closes, 12, 26, 9)
  const bollingerBands = calculateBollingerBands(closes, 20, 2)

  const index = closes.length - 1

  // Récupérer les dernières valeurs des indicateurs
  const lastRsi = rsi[index]
  const prevRsi = rsi[index - 1]
  const lastMacd = macd.macd[index]
  const prevMacd = macd.macd[index - 1]
  const lastSignal = macd.signal[index]
  const prevSignal = macd.signal[index - 1]
  const lastClose = closes[index]
  const lastUpperBand = bollingerBands.upperBand[index]
  const lastLowerBand = bollingerBands.lowerBand[index]

  if (
    lastRsi !== undefined &&
    prevRsi !== undefined &&
    lastMacd !== undefined &&
    prevMacd !== undefined &&
    lastSignal !== undefined &&
    prevSignal !== undefined &&
    lastUpperBand !== undefined &&
    lastLowerBand !== undefined
  ) {
    let buySignal = false
    let sellSignal = false

    // Conditions d'achat
    if (
      prevRsi < 30 &&
      lastRsi > 30 && // RSI croise au-dessus de 30
      lastClose > lastLowerBand && // Prix au-dessus de la bande inférieure
      prevMacd < prevSignal &&
      lastMacd > lastSignal // MACD croise au-dessus du signal
    ) {
      buySignal = true
    }

    // Conditions de vente
    if (
      prevRsi > 70 &&
      lastRsi < 70 && // RSI croise en dessous de 70
      lastClose < lastUpperBand && // Prix en dessous de la bande supérieure
      prevMacd > prevSignal &&
      lastMacd < lastSignal // MACD croise en dessous du signal
    ) {
      sellSignal = true
    }

    return { buy: buySignal, sell: sellSignal }
  } else {
    // Si les valeurs sont undefined, nous ne pouvons pas calculer les signaux
    return { buy: false, sell: false }
  }
}

// Fonction pour lire le fichier CSV
async function readCSV (filePath: string): Promise<dataBinance[]> {
  return await new Promise((resolve, reject) => {
    const results: dataBinance[] = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data as dataBinance))
      .on('end', () => {
        resolve(results)
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

// Fonction principale pour tester l'algorithme
async function testAlgorithm (): Promise<void> {
  // Chemin vers votre fichier CSV
  const filePath = path.resolve(__dirname, '../data.csv')

  // Lire les données du CSV
  const data = await readCSV(filePath)

  // Vérifier que les données sont suffisantes
  if (data.length === 0) {
    console.error('Aucune donnée trouvée dans le fichier CSV.')
    return
  }

  // Générer les signaux pour chaque point de données
  for (let i = 100; i < data.length; i++) {
    // Extraire une tranche des données jusqu'à l'index i
    const slicedData = {
      '1h': data.slice(0, i + 1)
    }

    const signals = generateSignals(slicedData)
    const { buy, sell } = signals

    const currentTime = new Date(parseInt(data[i].close_time)).toLocaleString()
    const currentPrice = parseFloat(data[i].close)

    // Vérifier les stop loss et take profit
    if (positionOpen) {
      if (positionType === 'buy') {
        const priceChange = currentPrice - entryPrice
        const priceChangePercentage = priceChange / entryPrice

        if (
          priceChangePercentage <= -stopLossPercentage ||
          priceChangePercentage >= takeProfitPercentage
        ) {
          // Fermer la position
          const exitPrice = currentPrice
          const profit = (exitPrice - entryPrice) * positionSize
          const fee = (entryPrice + exitPrice) * positionSize * transactionFee
          capital += profit - fee
          console.log(
            `[${currentTime}] Position d'ACHAT fermée à ${exitPrice.toFixed(
              2
            )} USD. Profit: ${profit.toFixed(2)} USD`
          )
          positionOpen = false
          positionType = null
        }
      } else if (positionType === 'sell') {
        const priceChange = entryPrice - currentPrice
        const priceChangePercentage = priceChange / entryPrice

        if (
          priceChangePercentage <= -stopLossPercentage ||
          priceChangePercentage >= takeProfitPercentage
        ) {
          // Fermer la position
          const exitPrice = currentPrice
          const profit = (entryPrice - exitPrice) * positionSize
          const fee = (entryPrice + exitPrice) * positionSize * transactionFee
          capital += profit - fee
          console.log(
            `[${currentTime}] Position de VENTE fermée à ${exitPrice.toFixed(
              2
            )} USD. Profit: ${profit.toFixed(2)} USD`
          )
          positionOpen = false
          positionType = null
        }
      }
    }

    // Gestion des signaux d'achat et de vente
    if (!positionOpen) {
      if (buy) {
        // Calculer la taille de la position
        const riskAmount = capital * riskPerTradePercentage
        const positionValue = riskAmount / stopLossPercentage
        positionSize = positionValue / currentPrice

        if (positionValue > capital) {
          console.log(
            `[${currentTime}] Pas assez de capital pour ouvrir une position d'ACHAT.`
          )
          continue
        }

        // Ouvrir une position d'achat
        positionOpen = true
        positionType = 'buy'
        entryPrice = currentPrice
        const fee = positionValue * transactionFee
        capital -= positionValue + fee // Déduire le coût de la position et les frais
        console.log(
          `[${currentTime}] Position d'ACHAT ouverte à ${entryPrice.toFixed(
            2
          )} USD avec taille ${positionSize.toFixed(4)}`
        )
      } else if (sell) {
        // Calculer la taille de la position
        const riskAmount = capital * riskPerTradePercentage
        const positionValue = riskAmount / stopLossPercentage
        positionSize = positionValue / currentPrice

        if (positionValue > capital) {
          console.log(
            `[${currentTime}] Pas assez de capital pour ouvrir une position de VENTE.`
          )
          continue
        }

        // Ouvrir une position de vente
        positionOpen = true
        positionType = 'sell'
        entryPrice = currentPrice
        const fee = positionValue * transactionFee
        capital -= fee // Déduire les frais
        console.log(
          `[${currentTime}] Position de VENTE ouverte à ${entryPrice.toFixed(
            2
          )} USD avec taille ${positionSize.toFixed(4)}`
        )
      }
    }
  }

  // Calcul du rendement total
  console.log(`\nCapital final : ${capital.toFixed(2)} USD`)
  const totalReturnPercentage = ((capital - initialCapital) / initialCapital) * 100
  console.log(`Rendement total : ${totalReturnPercentage.toFixed(2)}%`)
}

testAlgorithm().catch((error) => {
  console.error(error)
})
