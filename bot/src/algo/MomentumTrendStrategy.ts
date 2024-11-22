import {
  calculateADX,
  calculateATR,
  calculateRSI,
} from './indicators/TechnicalIndicators';
import { dataBinance } from '../utils/type';
import { IndicatorMACD } from '../utils/indicatorClass';

function optimizedTrendMomentumStrategy(
  data: dataBinance[],
  indicators: {
    MACD: IndicatorMACD;
    ADX: {
      calculate: (
        high: number[],
        low: number[],
        close: number[]
      ) => number | undefined;
    };
    ATR: {
      calculate: (high: number[], low: number[], close: number[]) => number;
    };
    RSI: { calculate: (close: number[]) => Array<number | undefined> };
  }
): { buy: boolean; sell: boolean; trailingStopLoss: number | null } {
  const closes = data.map((d) => parseFloat(d.close));
  const highs = data.map((d) => parseFloat(d.high));
  const lows = data.map((d) => parseFloat(d.low));
  const volumes = data.map((d) => parseFloat(d.volume));

  // Calcul des indicateurs
  const macd = indicators.MACD.calculate(closes);
  const adx = indicators.ADX.calculate(highs, lows, closes);
  const atr = indicators.ATR.calculate(highs, lows, closes);
  const rsi = indicators.RSI.calculate(closes);

  // Dernières valeurs pour prise de décision
  const lastClose = closes[closes.length - 1];
  const macdValue = macd.macd[macd.macd.length - 1];
  const signalValue = macd.signal[macd.signal.length - 1];
  const lastADX = adx;
  const lastRSI = rsi[rsi.length - 1];
  const avgVolume = volumes.slice(-20).reduce((sum, v) => sum + v, 0) / 20;
  const currentVolume = volumes[volumes.length - 1];
  const trailingStopLoss = lastClose - 20 * atr;

  let buy = false;
  let sell = false;

  if (
    macdValue === undefined ||
    signalValue === undefined ||
    lastRSI === undefined ||
    lastADX === undefined
  ) {
    return { buy, sell, trailingStopLoss: null };
  }

  if (
    macdValue > signalValue &&
    lastADX > 25 &&
    lastRSI < 70 &&
    currentVolume > avgVolume * 1.2
  ) {
    buy = true;
  }

  if (
    macdValue < signalValue &&
    lastADX > 25 &&
    lastRSI > 30 &&
    currentVolume > avgVolume * 1.2
  ) {
    sell = true;
  }

  return { buy, sell, trailingStopLoss };
}

export async function algoMomentumStrategy(
  data: dataBinance[]
): Promise<{ buy: boolean; sell: boolean; trailingStopLoss: number | null }> {
  const indicators = {
    MACD: new IndicatorMACD(),
    ADX: {
      calculate: (high: number[], low: number[], close: number[]) =>
        calculateADX(
          high.map((h, idx) => ({
            high: h,
            low: low[idx],
            close: close[idx],
          })),
          14
        ),
    },
    ATR: {
      calculate: (high: number[], low: number[], close: number[]) =>
        calculateATR([high, low, close], 14),
    },
    RSI: { calculate: (close: number[]) => calculateRSI(close, 14) },
  };

  return optimizedTrendMomentumStrategy(data, indicators);
}
