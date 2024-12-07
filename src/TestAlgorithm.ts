import fs from 'fs';
import csv from 'csv-parser';
import { dataBinance } from './utils/type';
import { getSignal } from './algo/MultiTimestamp';

// Fonction pour lire le CSV et convertir en liste de données
async function readCSV(filePath: string): Promise<dataBinance[]> {
  return new Promise((resolve, reject) => {
    const results: dataBinance[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        results.push({
          open_time: row.open_time,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume,
          close_time: row.close_time,
          quote_volume: row.quote_volume,
          count: row.count,
          taker_buy_volume: row.taker_buy_volume,
          taker_buy_quote_volume: row.taker_buy_quote_volume,
          ignore: row.ignore,
        });
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Fonction principale pour tester les algorithmes
async function testAlgo() {
  const data: dataBinance[] = await readCSV('BTCUSDT_1m_candlestick_data.csv');

  const capital = 1000;
  let balance = capital;
  let position = 0; // Nombre d'unités achetées
  const decision: {
    buy: boolean;
    sell: boolean;
    stopLoss: boolean;
    timestamp: string;
  }[] = [];

  // Simulation des indicateurs et autres données
  const indicatorResults = simulateIndicators(data);

  // Simulation sur chaque timestamp
  for (let i = 250; i < data.length; i++) {
    console.log(`Simulation en cours... (${i}/${data.length})`);
    const lastPrice1h = parseFloat(data[i].close);
    const currentData = data.slice(i - 250, i);
    const dataMultiTimeframe = { '1m': currentData };
    const closes: Record<string, number[]> = {
      '1m': currentData.map((d) => parseFloat(d.close)) ?? [],
    };
    const { buySignal, sellSignal } = getSignal(
      'downtrend',
      dataMultiTimeframe,
      indicatorResults,
      closes,
      lastPrice1h,
      '1m'
    );

    if (buySignal && balance >= lastPrice1h) {
      position++;
      balance -= lastPrice1h;
      decision.push({
        buy: true,
        sell: false,
        stopLoss: false,
        timestamp: data[i].open_time.toString(),
      });
      console.log(`Achat à ${lastPrice1h}`);
    }

    if (sellSignal && position > 0) {
      position--;
      balance += lastPrice1h;
      decision.push({
        buy: false,
        sell: true,
        stopLoss: false,
        timestamp: data[i].open_time.toString(),
      });
      console.log(`Vente à ${lastPrice1h}`);
    }
  }

  // Calcul du capital final
  const finalCapital =
    balance + position * parseFloat(data[data.length - 1].close);
  console.log(`Simulation terminée. Capital final: ${finalCapital.toFixed(2)}`);
  printDecisionStats(decision);
}

// Simulation des indicateurs
// eslint-disable-next-line
function simulateIndicators(data: dataBinance[]): Record<string, any> {
  // Remplir avec les résultats simulés pour RSI, ATR, etc.
  return {
    RSI: { '1m': data.map((_, i) => (i % 2 === 0 ? 60 : 40)) },
    ATR: { '1m': data.map(() => 5) },
    ADX: { '1m': data.map(() => 30) },
    Volume: { '1m': data.map(() => 1000) },
    BollingerBands: { '1m': { upperBand: data.map(() => 50000) } },
    OBV: { '1m': data.map(() => 100) },
    Fibonacci: { '1m': [50000, 51000, 52000] },
    EMA50: { '15m': 50000 },
    EMA200: { '15m': 49500 },
  };
}

// Fonction pour afficher les statistiques des décisions
function printDecisionStats(
  decision: {
    buy: boolean;
    sell: boolean;
    stopLoss: boolean;
    timestamp: string;
  }[]
): void {
  const totalDecisions = decision.length;
  const totalBuys = decision.filter((d) => d.buy).length;
  const totalSells = decision.filter((d) => d.sell).length;
  const totalStopLosses = decision.filter((d) => d.stopLoss).length;

  const dailyActivity: { [date: string]: number } = {};
  decision.forEach((d) => {
    const date = new Date(Number(d.timestamp)).toISOString().split('T')[0];
    dailyActivity[date] = (dailyActivity[date] || 0) + 1;
  });

  const totalDays = Object.keys(dailyActivity).length;
  const avgActivityPerDay = (totalDecisions / totalDays).toFixed(2);

  console.log('=== Statistiques des Décisions ===');
  console.log(`Total des décisions : ${totalDecisions}`);
  console.log(
    `Achats : ${totalBuys} (${((totalBuys / totalDecisions) * 100).toFixed(2)}%)`
  );
  console.log(
    `Ventes : ${totalSells} (${((totalSells / totalDecisions) * 100).toFixed(2)}%)`
  );
  console.log(
    `Stop-loss : ${totalStopLosses} (${((totalStopLosses / totalDecisions) * 100).toFixed(2)}%)`
  );
  console.log(`Nombre de jours avec activité : ${totalDays}`);
  console.log(`Nombre moyen d'activités par jour : ${avgActivityPerDay}`);
}

// Exécution de la fonction de test
testAlgo().catch(console.error);
