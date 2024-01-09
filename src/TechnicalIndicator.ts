import { dataBinance } from "./utils/type";

export class TechnicalIndicator {
    calculateMACD(data: dataBinance[], shortPeriod: number, longPeriod: number, signalPeriod: number): number[] {
        const prices = data.map((entry) => parseFloat(entry.close));
        const shortEMA = this.calculateEMA(prices, shortPeriod);
        const longEMA = this.calculateEMA(prices, longPeriod);
        const macdLine: number[] = [];

        for (let i = longPeriod - 1; i < prices.length; i++) {
          const macdValue = shortEMA[i] - longEMA[i];
          macdLine.push(macdValue);
        }

        const signalLine = this.calculateEMA(macdLine, signalPeriod);
        const histogram: number[] = macdLine.map((macd, i) => macd - signalLine[i]);

        return histogram;
      }

      calculateRSI(data: dataBinance[], period: number): number[] {
        const prices = data.map((entry) => parseFloat(entry.close));
        const gains: number[] = [];
        const losses: number[] = [];

        for (let i = 1; i < prices.length; i++) {
          const priceDifference = prices[i] - prices[i - 1];
          if (priceDifference > 0) {
            gains.push(priceDifference);
            losses.push(0);
          } else {
            gains.push(0);
            losses.push(-priceDifference);
          }
        }

        const avgGain = this.calculateAverage(gains, period);
        const avgLoss = this.calculateAverage(losses, period);
        const rsi: number[] = [];

        for (let i = period; i < prices.length; i++) {
          const relativeStrength = avgGain[i - period] / avgLoss[i - period];
          const rsIndex = 100 - (100 / (1 + relativeStrength));
          rsi.push(rsIndex);
        }
        return rsi;
      }

      calculateEMA(prices: number[], period: number): number[] {
        const multiplier = 2 / (period + 1);
        const ema: number[] = [prices[0]];

        for (let i = 1; i < prices.length; i++) {
          const emaValue = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
          ema.push(emaValue);
        }

        return ema;
      }
      calculateAverage(values: number[], period: number): number[] {
        const average: number[] = [];

        for (let i = period - 1; i < values.length; i++) {
          const sum = values.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
          average.push(sum / period);
        }

        return average;
      }
}