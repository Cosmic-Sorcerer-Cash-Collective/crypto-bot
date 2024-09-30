import { type typeFibonacci, type dataBinance, type macdIndicator } from './utils/type'

export class TechnicalIndicator {
  public calculateMACD(
    prices: number[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number
  ): { MACD: number[]; signal: number[] } {
    const emaFast = this.calculateEMA(prices, fastPeriod);
    const emaSlow = this.calculateEMA(prices, slowPeriod);
  
    const macdLine = emaFast.map((value, index) => {
      return value - emaSlow[index];
    });
  
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
  
    return { MACD: macdLine, signal: signalLine };
  }
  
  private calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = [];
  
    ema[0] = prices[0]; // Initialisation avec la première valeur
  
    for (let i = 1; i < prices.length; i++) {
      ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
    }
  
    return ema;
  }

  public calculateRSI(
    data: dataBinance[],
    period: number
  ): number[] {
    const closePrices = data.map((item) => parseFloat(item.close));
    const rsi: number[] = [];
    let gain = 0;
    let loss = 0;
  
    for (let i = 1; i < closePrices.length; i++) {
      const delta = closePrices[i] - closePrices[i - 1];
      if (delta > 0) {
        gain += delta;
      } else {
        loss -= delta;
      }
  
      if (i >= period) {
        const avgGain = gain / period;
        const avgLoss = loss / period;
        const rs = avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
  
        // Préparer pour la prochaine période
        const deltaOld = closePrices[i - period + 1] - closePrices[i - period];
        if (deltaOld > 0) {
          gain -= deltaOld;
        } else {
          loss += deltaOld;
        }
      } else {
        rsi.push(NaN);
      }
    }
  
    return rsi;
  }

  public isHammer (lastCandle: dataBinance, currentCandle: dataBinance): boolean {
    const lastCandleBody = Math.abs(parseFloat(lastCandle.open) - parseFloat(lastCandle.close))
    const lastCandleShadow = parseFloat(lastCandle.high) - parseFloat(lastCandle.low)
    const currentCandleBody = Math.abs(parseFloat(currentCandle.open) - parseFloat(currentCandle.close))
    const currentCandleShadow = parseFloat(currentCandle.high) - parseFloat(currentCandle.low)
    const isHammer = currentCandleBody <= lastCandleBody && currentCandleShadow >= lastCandleShadow && parseFloat(currentCandle.close) > parseFloat(lastCandle.close)
    return isHammer
  }

  public calculateBollingerBands(
    prices: number[],
    period: number
  ): { middle: number[]; upper: number[]; lower: number[] } {
    const middleBand = this.calculateSMA(prices, period);
    const stdDev: any = [];
  
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        stdDev.push(NaN);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const mean = middleBand[i];
        const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
        stdDev.push(Math.sqrt(variance));
      }
    }
  
    const upperBand = middleBand.map((mb, index) => mb + 2 * stdDev[index]);
    const lowerBand = middleBand.map((mb, index) => mb - 2 * stdDev[index]);
  
    return { middle: middleBand, upper: upperBand, lower: lowerBand };
  }
  
  private calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
  
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
        sma.push(sum / period);
      }
    }
  
    return sma;
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

  private calculateTrueRange (data: dataBinance[]): number[] {
    const trueRange = []

    for (let i = 1; i < data.length; i++) {
      const high = parseFloat(data[i].high)
      const low = parseFloat(data[i].low)
      const close = parseFloat(data[i - 1].close)

      const method1 = high - low
      const method2 = Math.abs(high - close)
      const method3 = Math.abs(low - close)

      trueRange.push(Math.max(method1, method2, method3))
    }

    return trueRange
  }

  private calculatePositiveDirectionalMovement (data: dataBinance[]): number[] {
    const positiveDirectionalMovement = []

    for (let i = 1; i < data.length; i++) {
      const high = parseFloat(data[i].high)
      const highPrev = parseFloat(data[i - 1].high)
      const low = parseFloat(data[i].low)
      const lowPrev = parseFloat(data[i - 1].low)

      const moveUp = Math.max(high - highPrev, 0)
      const moveDown = Math.max(lowPrev - low, 0)

      positiveDirectionalMovement.push(moveUp > moveDown ? moveUp : 0)
    }

    return positiveDirectionalMovement
  }

  private calculateNegativeDirectionalMovement (data: dataBinance[]): number[] {
    const negativeDirectionalMovement = []

    for (let i = 1; i < data.length; i++) {
      const high = parseFloat(data[i].high)
      const highPrev = parseFloat(data[i - 1].high)
      const low = parseFloat(data[i].low)
      const lowPrev = parseFloat(data[i - 1].low)

      const moveUp = Math.max(high - highPrev, 0)
      const moveDown = Math.max(lowPrev - low, 0)

      negativeDirectionalMovement.push(moveDown > moveUp ? moveDown : 0)
    }

    return negativeDirectionalMovement
  }

  private calculateAverage (values: number[], period: number): number {
    const sum = values.slice(0, period).reduce((acc, val) => acc + val, 0)
    return sum / period
  }

  private calculateAverageDirectionalIndex (directionalMovementIndex: number, period: number): number[] {
    // Smooth the DX with an exponential moving average
    return this.calculateEMA([directionalMovementIndex], period)
  }

  public calculateMAs(
    data: dataBinance[],
    periods: number[]
  ): number[][] {
    const result: number[][] = [];
  
    for (const period of periods) {
      const ma: number[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          ma.push(NaN);
        } else {
          const sum = data
            .slice(i - period + 1, i + 1)
            .reduce((acc, curr) => acc + parseFloat(curr.close), 0);
          ma.push(sum / period);
        }
      }
      result.push(ma);
    }
  
    return result;
  }

  private calculateMA (prices: number[], period: number): number[] {
    const maValues = []

    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((acc, price) => acc + price, 0)
      const ma = sum / period
      maValues.push(ma)
    }

    return maValues
  }

  public calculateOBV (data: dataBinance[]): number[] {
    const obvValues: number[] = [0]

    for (let i = 1; i < data.length; i++) {
      const currentClose = parseFloat(data[i].close)
      const previousClose = parseFloat(data[i - 1].close)

      let obv = obvValues[i - 1]

      if (currentClose > previousClose) {
        obv += parseFloat(data[i].volume)
      } else if (currentClose < previousClose) {
        obv -= parseFloat(data[i].volume)
      }

      obvValues.push(obv)
    }

    return obvValues
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

  public calculateParabolicSAR (data: dataBinance[]): number[] {
    const sarValues: number[] = []

    let af = 0.02
    let ep = parseFloat(data[data.length - 1].low)
    let sar = ep + af * (parseFloat(data[data.length - 2].high) - ep)

    sarValues.unshift(sar)

    for (let i = data.length - 3; i >= 0; i--) {
      const currentHigh = parseFloat(data[i].high)
      const currentLow = parseFloat(data[i].low)

      if (sar <= currentHigh && sar >= currentLow) {
        sarValues.unshift(sar)
      } else {
        sar = ep + af * (sar - ep)

        if (sar > currentHigh) {
          sar = currentHigh
        } else if (sar < currentLow) {
          sar = currentLow
        }

        if (sar > parseFloat(data[i + 1].high) || sar > parseFloat(data[i + 2].high)) {
          sar = parseFloat(data[i + 1].high)
        }

        ep = currentLow < parseFloat(data[i + 1].low) ? currentLow : parseFloat(data[i + 1].low)
        af = af < 0.2 ? af + 0.02 : af

        sarValues.unshift(sar)
      }
    }

    return sarValues
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

  public hasRecentPriceIncrease (data: dataBinance[], period: number): boolean {
    const prices = data.map((entry) => parseFloat(entry.close))
    const priceDiff = prices[prices.length - 1] - prices[prices.length - period - 1]
    const hasRecentPriceIncrease = priceDiff > 0
    return hasRecentPriceIncrease
  }

  public hasRecentPriceDecrease (data: dataBinance[], period: number): boolean {
    const prices = data.map((entry) => parseFloat(entry.close))
    const priceDiff = prices[prices.length - 1] - prices[prices.length - period - 1]
    const hasRecentPriceDecrease = priceDiff < 0
    return hasRecentPriceDecrease
  }

  public calculateGoldenCross (data: dataBinance[], shortPeriod: number = 50, longPeriod: number = 200): boolean {
    const prices = data.map((entry) => parseFloat(entry.close))
    const shortSMA = this.calculateSMA(prices, shortPeriod)
    const longSMA = this.calculateSMA(prices, longPeriod)
    const goldenCross = shortSMA > longSMA
    return goldenCross
  }

  public calculateDeathCross (data: dataBinance[], shortPeriod: number = 50, longPeriod: number = 200): boolean {
    const prices = data.map((entry) => parseFloat(entry.close))
    const shortSMA = this.calculateSMA(prices, shortPeriod)
    const longSMA = this.calculateSMA(prices, longPeriod)
    const deathCross = shortSMA < longSMA
    return deathCross
  }

  public calculateVolatility (data: dataBinance[], period: number): number[] {
    const volatility: number[] = []

    for (let i = data.length - 1 - period; i < data.length; i++) {
      let sum = 0
      for (let j = i - period; j < i; j++) {
        sum += Math.abs(parseFloat(data[j].close) - parseFloat(data[j - 1].close))
      }
      const volatilityValue = sum / period
      volatility.push(volatilityValue)
    }

    return volatility
  }
}
