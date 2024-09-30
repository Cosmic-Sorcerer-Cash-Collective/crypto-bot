import { TechnicalIndicator } from './TechnicalIndicator';
import { type typeTradeDecision, type dataBinance } from './utils/type';

export class BotAlgorithm {
  public async tradeDecision(data: dataBinance[]): Promise<typeTradeDecision> {
    const technicalIndicator = new TechnicalIndicator();
    let decision: string = 'HOLD';

    // Conversion des prix de fermeture en nombres
    const closePrices = data.map((item) => parseFloat(item.close));

    // Calcul des indicateurs
    const macd = technicalIndicator.calculateMACD(closePrices, 12, 26, 9);
    const mas = technicalIndicator.calculateMAs(data, [50, 200]);
    const bollingerBands = technicalIndicator.calculateBollingerBands(closePrices, 20);
    const rsi = technicalIndicator.calculateRSI(data, 14);

    // Récupération des dernières valeurs du MACD
    const macdLine = macd.MACD;
    const signalLine = macd.signal;
    const lastMacd = macdLine[macdLine.length - 1];
    const lastSignal = signalLine[signalLine.length - 1];

    // Récupération des moyennes mobiles
    const maShort = mas[0][mas[0].length - 1]; // MA 50
    const maLong = mas[1][mas[1].length - 1]; // MA 200
    const previousMaShort = mas[0][mas[0].length - 2];
    const previousMaLong = mas[1][mas[1].length - 2];

    // Récupération des dernières valeurs pour les Bandes de Bollinger et le RSI
    const lastClosePrice = parseFloat(data[data.length - 1].close);
    const lastLowerBand = bollingerBands.lower[bollingerBands.lower.length - 1];
    const lastUpperBand = bollingerBands.upper[bollingerBands.upper.length - 1];
    const lastRsi = rsi[rsi.length - 1];

    // Conditions pour les croisements de moyennes mobiles
    const goldenCross = previousMaShort < previousMaLong && maShort > maLong;
    const deathCross = previousMaShort > previousMaLong && maShort < maLong;

    // Conditions pour le MACD
    const macdBullish = lastMacd > lastSignal;
    const macdBearish = lastMacd < lastSignal;

    // Conditions pour les Bandes de Bollinger et RSI
    const bollingerBuy = lastClosePrice < lastLowerBand && lastRsi < 30;
    const bollingerSell = lastClosePrice > lastUpperBand && lastRsi > 70;

    // Logique de décision
    if (goldenCross && macdBullish) {
      decision = 'STRONG_BUY';
    } else if (bollingerBuy) {
      decision = 'BUY';
    } else if (deathCross && macdBearish) {
      decision = 'STRONG_SELL';
    } else if (bollingerSell) {
      decision = 'SELL';
    } else {
      decision = 'HOLD';
    }

    return { decision };
  }
}
