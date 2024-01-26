import { type dataBinance, type macdIndicator } from './utils/type'

export class TechnicalIndicator {
  calculateMACD (data: dataBinance[], shortPeriod: number = 12, longPeriod: number = 26, signalPeriod: number = 9): macdIndicator {
    const prices = data.map((entry) => parseFloat(entry.close))

    const shortEMA = this.calculateEMA(prices, shortPeriod)
    const longEMA = this.calculateEMA(prices, longPeriod)

    const macdLine = this.calculateMACDLine(shortEMA, longEMA)
    const signalLine = this.calculateSignalLine(macdLine, signalPeriod)
    const histogram = this.calculateHistogram(macdLine, signalLine)

    return {
      macd: macdLine.slice(-1)[0],
      signal: signalLine.slice(-1)[0],
      histogram: histogram.slice(-1)[0]
    }
  }

  private calculateMACDLine (shortEMA: number[], longEMA: number[]): number[] {
    return shortEMA.map((short, index) => short - longEMA[index])
  }

  private calculateSignalLine (macdLine: number[], signalPeriod: number): number[] {
    return this.calculateEMA(macdLine, signalPeriod)
  }

  private calculateHistogram (macdLine: number[], signalLine: number[]): number[] {
    return macdLine.map((macd, index) => macd - signalLine[index])
  }

  calculateRSI (data: dataBinance[], period: number): number {
    const prices = data.map((entry) => parseFloat(entry.close))

    let avgGain = 0
    let avgLoss = 0

    for (let i = 1; i < prices.length; i++) {
      const priceDiff = prices[i] - prices[i - 1]
      if (priceDiff >= 0) {
        avgGain = (avgGain * (period - 1) + priceDiff) / period
        avgLoss = (avgLoss * (period - 1)) / period
      } else {
        avgGain = (avgGain * (period - 1)) / period
        avgLoss = (avgLoss * (period - 1) - priceDiff) / period
      }
    }

    const relativeStrength = avgGain / avgLoss
    const rsi: number = 100 - (100 / (1 + relativeStrength))

    return rsi
  }

  calculateSMA (data: number[], period: number): number {
    let sum = 0
    for (let i = 0; i < period; i++) {
      sum += data[data.length - 1 - i]
    }
    return sum / period
  }

  calculateEMA (prices: number[], period: number): number[] {
    const k = 2 / (period + 1)
    const emaValues: number[] = []
    let ema = prices[0]
    for (const price of prices) {
      ema = (price * k) + (ema * (1 - k))
      emaValues.push(ema)
    }
    return emaValues
  }

  public isHammer (lastCandle: dataBinance, currentCandle: dataBinance): boolean {
    const lastCandleBody = Math.abs(parseFloat(lastCandle.open) - parseFloat(lastCandle.close))
    const lastCandleShadow = parseFloat(lastCandle.high) - parseFloat(lastCandle.low)
    const currentCandleBody = Math.abs(parseFloat(currentCandle.open) - parseFloat(currentCandle.close))
    const currentCandleShadow = parseFloat(currentCandle.high) - parseFloat(currentCandle.low)
    const isHammer = currentCandleBody <= lastCandleBody && currentCandleShadow >= lastCandleShadow && parseFloat(currentCandle.close) > parseFloat(lastCandle.close)
    return isHammer
  }

  private calculateStandardDeviation (data: number[], period: number): number {
    const sma = this.calculateSMA(data, period)
    const sum = data.slice(data.length - period).reduce((acc, value) => {
      return acc + Math.pow(value - sma, 2)
    }, 0)
    const stdDev = Math.sqrt(sum / period)
    return stdDev
  }

  public calculateBollingerBands (data: dataBinance[], period: number = 20, deviation: number = 2): { upper: number[], middle: number[], lower: number[] } {
    const prices = data.map((entry) => parseFloat(entry.close))
    const middle = this.calculateSMA(prices, period)
    const stdDev = this.calculateStandardDeviation(prices, period)
    const upper = middle + (stdDev * deviation)
    const lower = middle - (stdDev * deviation)
    return { upper: [upper], middle: [middle], lower: [lower] }
  }

  calculateATR (data: dataBinance[], period: number = 14): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const atrValues: number[] = []
    let atr = 0
    for (let i = 1; i < prices.length; i++) {
      const high = parseFloat(data[i].high)
      const low = parseFloat(data[i].low)
      const close = parseFloat(data[i - 1].close)
      const tr = Math.max(high - low, Math.abs(high - close), Math.abs(low - close))
      atr = ((atr * (period - 1)) + tr) / period
      atrValues.push(atr)
    }
    return atr
  }

  calculateADX (data: dataBinance[], period: number = 14): number {
    const atr = this.calculateATR(data, period)
    const adxValues: number[] = []
    const dmPlusValues: number[] = []
    const dmMinusValues: number[] = []
    const trValues: number[] = []
    for (let i = 1; i < data.length; i++) {
      const high = parseFloat(data[i].high)
      const low = parseFloat(data[i].low)
      const high2 = parseFloat(data[i - 1].high)
      const low2 = parseFloat(data[i - 1].low)
      const dmPlus = high - high2 > low2 - low ? Math.max(high - high2, 0) : 0
      const dmMinus = low2 - low > high - high2 ? Math.max(low2 - low, 0) : 0
      const tr = Math.max(high - low, Math.abs(high - high2), Math.abs(low - low2))
      dmPlusValues.push(dmPlus)
      dmMinusValues.push(dmMinus)
      trValues.push(tr)
    }
    const diPlus = this.calculateEMA(dmPlusValues, period).map((value) => (value / atr) * 100)
    const diMinus = this.calculateEMA(dmMinusValues, period).map((value) => (value / atr) * 100)
    for (let i = 0; i < diPlus.length; i++) {
      const adx = Math.abs(diPlus[i] - diMinus[i]) / (diPlus[i] + diMinus[i]) * 100
      adxValues.push(adx)
    }
    const adx = this.calculateEMA(adxValues, period)
    return adx[adx.length - 1]
  }

  calculateStochastic (data: dataBinance[], period: number = 14): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const stochasticValues: number[] = []
    for (let i = period - 1; i < prices.length; i++) {
      const periodSlice = prices.slice(i - period + 1, i + 1)
      const min = Math.min(...periodSlice)
      const max = Math.max(...periodSlice)
      const stochastic = (prices[i] - min) / (max - min) * 100
      stochasticValues.push(stochastic)
    }
    const stochastic = this.calculateSMA(stochasticValues, 3)
    return stochastic
  }

  calculateOBV (data: dataBinance[]): number {
    const obvValues: number[] = []
    for (let i = 1; i < data.length; i++) {
      const close = parseFloat(data[i].close)
      const close2 = parseFloat(data[i - 1].close)
      const volume = parseFloat(data[i].volume)
      let obv = 0
      if (close > close2) {
        obv = volume
      } else if (close < close2) {
        obv = -volume
      }
      obvValues.push(obv)
    }
    const obv = this.calculateSMA(obvValues, 20)
    return obv
  }

  calculateMFI (data: dataBinance[], period: number = 14): number {
    const typicalPrices: number[] = []
    for (const entry of data) {
      const typicalPrice = (parseFloat(entry.high) + parseFloat(entry.low) + parseFloat(entry.close)) / 3
      typicalPrices.push(typicalPrice)
    }
    const mfValues: number[] = []
    for (let i = 1; i < typicalPrices.length; i++) {
      const typicalPrice = typicalPrices[i]
      const typicalPrice2 = typicalPrices[i - 1]
      const volume = parseFloat(data[i].volume)
      let mf = 0
      if (typicalPrice > typicalPrice2) {
        mf = typicalPrice * volume
      } else if (typicalPrice < typicalPrice2) {
        mf = -typicalPrice * volume
      }
      mfValues.push(mf)
    }
    const positiveMFValues = []
    const negativeMFValues = []
    for (const mf of mfValues) {
      if (mf > 0) {
        positiveMFValues.push(mf)
        negativeMFValues.push(0)
      } else {
        positiveMFValues.push(0)
        negativeMFValues.push(mf)
      }
    }
    const positiveMFSum = this.calculateSMA(positiveMFValues, period)
    const negativeMFSum = this.calculateSMA(negativeMFValues, period)
    const mfr = positiveMFSum / negativeMFSum
    const mfi = 100 - (100 / (1 + mfr))
    return mfi
  }

  calculateCCI (data: dataBinance[], period: number = 20): number {
    const typicalPrices: number[] = []
    for (const entry of data) {
      const typicalPrice = (parseFloat(entry.high) + parseFloat(entry.low) + parseFloat(entry.close)) / 3
      typicalPrices.push(typicalPrice)
    }
    const tpSMA = this.calculateSMA(typicalPrices, period)
    const meanDeviation = typicalPrices.map((tp) => Math.abs(tp - tpSMA)).reduce((acc, value) => acc + value) / period
    const cci = (typicalPrices[typicalPrices.length - 1] - tpSMA) / (0.015 * meanDeviation)
    return cci
  }

  calculateCMO (data: dataBinance[], period: number = 9): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const cmoValues: number[] = []
    for (let i = period - 1; i < prices.length; i++) {
      const periodSlice = prices.slice(i - period + 1, i + 1)
      const sumGains = periodSlice.filter((value) => value > 0).reduce((acc, value) => acc + value, 0)
      const sumLosses = periodSlice.filter((value) => value < 0).reduce((acc, value) => acc + Math.abs(value), 0)
      const cmo = 100 * ((sumGains - sumLosses) / (sumGains + sumLosses))
      cmoValues.push(cmo)
    }
    const cmo = this.calculateSMA(cmoValues, 3)
    return cmo
  }

  calculateROC (data: dataBinance[], period: number = 9): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const roc = ((prices[prices.length - 1] - prices[prices.length - period - 1]) / prices[prices.length - period - 1]) * 100
    return roc
  }

  calculateWMA (data: number[], period: number): number {
    let sum = 0
    let denominator = 0
    for (let i = 0; i < period; i++) {
      sum += data[data.length - 1 - i] * (i + 1)
      denominator += (i + 1)
    }
    return sum / denominator
  }

  calculateKAMA (data: number[], period: number): number {
    const kamaValues: number[] = []
    let changeSum = 0
    let volatilitySum = 0
    let kama = data[0]
    for (let i = 1; i < data.length; i++) {
      const change = Math.abs(data[i] - data[i - 1])
      changeSum += change
      if (i > period) {
        const volatility = 0
        volatilitySum += volatility
      } else if (i === period) {
        const volatility = changeSum
        volatilitySum += volatility
      }
      const er = changeSum / volatilitySum
      const sc = Math.pow((er * (2 / (2 + 1) - 2 / (30 + 1)) + 2 / (30 + 1)), 2)
      kama = kama + sc * (data[i] - kama)
      kamaValues.push(kama)
    }
    return kamaValues[kamaValues.length - 1]
  }

  calculateFiabonacciRetracement (data: dataBinance[], period: number = 20): { upper: number[], lower: number[] } {
    const prices = data.map((entry) => parseFloat(entry.close))
    const max = Math.max(...prices.slice(-period))
    const min = Math.min(...prices.slice(-period))
    const diff = max - min
    const upper = max - (diff * 0.236)
    const lower = min + (diff * 0.236)
    return { upper: [upper], lower: [lower] }
  }

  calculateFiabonacciFan (data: dataBinance[], period: number = 20): { upper: number[], lower: number[] } {
    const prices = data.map((entry) => parseFloat(entry.close))
    const max = Math.max(...prices.slice(-period))
    const min = Math.min(...prices.slice(-period))
    const diff = max - min
    const upper = max - (diff * 0.382)
    const lower = min + (diff * 0.382)
    return { upper: [upper], lower: [lower] }
  }

  calculateFiabonacciExtension (data: dataBinance[], period: number = 20): { upper: number[], lower: number[] } {
    const prices = data.map((entry) => parseFloat(entry.close))
    const max = Math.max(...prices.slice(-period))
    const min = Math.min(...prices.slice(-period))
    const diff = max - min
    const upper = max + (diff * 1.618)
    const lower = min - (diff * 1.618)
    return { upper: [upper], lower: [lower] }
  }

  calculateParabolicSAR (data: dataBinance[], period: number = 20): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const sarValues: number[] = []
    let af = 0.02
    let sar = prices[0]
    let trend = 'bullish'
    for (let i = 1; i < prices.length; i++) {
      const price = prices[i]
      const price2 = prices[i - 1]
      if (trend === 'bullish') {
        if (price < sar) {
          trend = 'bearish'
          sar = prices[i - 1]
          af = 0.02
        } else {
          sar = sar + af * (price - sar)
          if (price > price2) {
            af += 0.02
            if (af > 0.2) {
              af = 0.2
            }
          }
        }
      } else {
        if (price > sar) {
          trend = 'bullish'
          sar = prices[i - 1]
          af = 0.02
        } else {
          sar = sar + af * (price - sar)
          if (price < price2) {
            af += 0.02
            if (af > 0.2) {
              af = 0.2
            }
          }
        }
      }
      sarValues.push(sar)
    }
    return sarValues[sarValues.length - 1]
  }

  public calculateAMA (data: dataBinance[], period: number = 9): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const amaValues: number[] = []
    let ama = prices[0]
    for (let i = 1; i < prices.length; i++) {
      const price = prices[i]
      const price2 = prices[i - 1]
      const trend = price > price2 ? 'bullish' : 'bearish'
      ama = ama + (trend === 'bullish' ? 1 : -1) * price * (0.1 * (Math.abs(price - price2) / price))
      amaValues.push(ama)
    }
    return amaValues[amaValues.length - 1]
  }

  public calculateVWAP (data: dataBinance[]): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const volumes = data.map((entry) => parseFloat(entry.volume))
    const vwap = prices.map((price, index) => price * volumes[index]).reduce((acc, value) => acc + value) / volumes.reduce((acc, value) => acc + value)
    return vwap
  }

  public calculateVWMA (data: dataBinance[], period: number = 20): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const volumes = data.map((entry) => parseFloat(entry.volume))
    const vwma = prices.map((price, index) => price * volumes[index]).reduce((acc, value) => acc + value) / volumes.reduce((acc, value) => acc + value)
    return vwma
  }

  public calculateVPT (data: dataBinance[]): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const volumes = data.map((entry) => parseFloat(entry.volume))
    const vptValues: number[] = []
    let vpt = 0
    for (let i = 1; i < prices.length; i++) {
      const price = prices[i]
      const price2 = prices[i - 1]
      const volume = volumes[i]
      vpt = vpt + volume * ((price - price2) / price2)
      vptValues.push(vpt)
    }
    return vptValues[vptValues.length - 1]
  }

  public calculatePZO (data: dataBinance[], period: number = 20): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const pzoValues: number[] = []
    const ema = this.calculateEMA(prices, period)
    for (let i = 0; i < prices.length; i++) {
      const price = prices[i]
      const emaValue = ema[i]
      const pzo = 100 * ((price - emaValue) / emaValue)
      pzoValues.push(pzo)
    }
    const pzo = this.calculateSMA(pzoValues, 3)
    return pzo
  }

  public calculateFI (data: dataBinance[], period: number = 13): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const volumes = data.map((entry) => parseFloat(entry.volume))
    const fiValues: number[] = []
    for (let i = 1; i < prices.length; i++) {
      const price = prices[i]
      const price2 = prices[i - 1]
      const volume = volumes[i]
      const fi = (price - price2) / price2 * volume
      fiValues.push(fi)
    }
    const fi = this.calculateSMA(fiValues, 3)
    return fi
  }

  public calculateSMI (data: dataBinance[], period: number = 14): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const smiValues: number[] = []
    const sma: number = this.calculateSMA(prices, period)
    const hhv = Math.max(...prices.slice(-period))
    const llv = Math.min(...prices.slice(-period))
    const smi = ((prices[prices.length - 1] - sma) / (hhv - llv)) * 100
    smiValues.push(smi)
    return smiValues[smiValues.length - 1]
  }

  public calculateVFI (data: dataBinance[], period: number = 13): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const volumes = data.map((entry) => parseFloat(entry.volume))
    const vfiValues: number[] = []
    for (let i = 1; i < prices.length; i++) {
      const price = prices[i]
      const price2 = prices[i - 1]
      const volume = volumes[i]
      const vfi = ((price - price2) / price2) * volume
      vfiValues.push(vfi)
    }
    const vfi = this.calculateSMA(vfiValues, 3)
    return vfi
  }

  public calculateVZO (data: dataBinance[], period: number = 14): number {
    const prices = data.map((entry) => parseFloat(entry.close))
    const volumes = data.map((entry) => parseFloat(entry.volume))
    const vzoValues: number[] = []
    const ema = this.calculateEMA(prices, period)
    for (let i = 0; i < prices.length; i++) {
      const price = prices[i]
      const emaValue = ema[i]
      const volume = volumes[i]
      const vzo = 100 * ((price - emaValue) / emaValue) * volume
      vzoValues.push(vzo)
    }
    const vzo = this.calculateSMA(vzoValues, 3)
    return vzo
  }

  public calculateHeikinAshi (data: dataBinance[]): { open: number[], high: number[], low: number[], close: number[] } {
    const open = []
    const high = []
    const low = []
    const close = []
    for (let i = 0; i < data.length; i++) {
      const entry = data[i]
      const haClose = (parseFloat(entry.open) + parseFloat(entry.high) + parseFloat(entry.low) + parseFloat(entry.close)) / 4
      let haOpen
      if (i === 0) {
        haOpen = parseFloat(entry.open)
      } else {
        const previousEntry = data[i - 1]
        haOpen = (parseFloat(previousEntry.open) + parseFloat(previousEntry.close)) / 2
      }
      const haHigh = Math.max(parseFloat(entry.high), haOpen, haClose)
      const haLow = Math.min(parseFloat(entry.low), haOpen, haClose)
      open.push(haOpen)
      high.push(haHigh)
      low.push(haLow)
      close.push(haClose)
    }
    return { open, high, low, close }
  }
}
