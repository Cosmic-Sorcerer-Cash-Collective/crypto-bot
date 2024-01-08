import csv from 'csv-parser';
import fs from 'fs';
import * as tf from '@tensorflow/tfjs-node';

interface dataCsv {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  close_time: string;
  quote_volume: string;
  count: string;
  taker_buy_volume: string;
  taker_buy_quote_volume: string;
  ignore: string;
}

class Data {
  public date: Date;
  public open: number;
  public high: number;
  public low: number;
  public close: number;
  public volume: number;

  constructor(date: Date, open: number, high: number, low: number, close: number, volume: number) {
    this.date = date;
    this.open = open;
    this.high = high;
    this.low = low;
    this.close = close;
    this.volume = volume;
  }

  public toString(): string {
    return `${this.date.toISOString()},${this.open},${this.high},${this.low},${this.close},${this.volume}`;
  }

  public static fromString(data: string): Data {
    const [date, open, high, low, close, volume] = data.split(',');
    return new Data(new Date(date), parseFloat(open), parseFloat(high), parseFloat(low), parseFloat(close), parseFloat(volume));
  }

  public async readCSV(filePath: string): Promise<dataCsv[]> {
    return new Promise<dataCsv[]>((resolve, reject) => {
      const results: dataCsv[] = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: dataCsv) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }
}

class TechnicalIndicators {
  calculateRSI(data: number[]): number {
    const changes = this.calculatePriceChanges(data);
    const avgGainLoss = this.calculateAverageGainLoss(changes);
    const relativeStrength = this.calculateRelativeStrength(avgGainLoss);

    return 100 - (100 / (1 + relativeStrength));
  }

  private calculatePriceChanges(data: number[]): number[] {
    return data.slice(1).map((current, i) => current - data[i]);
  }

  private calculateAverageGainLoss(changes: number[]): { avgGain: number; avgLoss: number } {
    const positiveChanges = changes.map(change => Math.max(0, change));
    const negativeChanges = changes.map(change => Math.max(0, -change));

    const avgGain = this.calculateAverage(positiveChanges);
    const avgLoss = this.calculateAverage(negativeChanges);

    return { avgGain, avgLoss };
  }

  private calculateRelativeStrength({ avgGain, avgLoss }: { avgGain: number; avgLoss: number }): number {
    return avgGain / avgLoss;
  }

  private calculateAverage(arr: number[]): number {
    return arr.reduce((acc, value) => acc + value, 0) / arr.length;
  }

  calculateSMA(data: number[], period: number): number {
    const sum = data.slice(-period).reduce((acc, value) => acc + value, 0);
    return sum / period;
  }

  calculateBollingerBands(data: number[], period: number, stdDevMultiplier: number): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(data, period);
    const stdDev = this.calculateStandardDeviation(data, period);

    const upper = sma + stdDev * stdDevMultiplier;
    const middle = sma;
    const lower = sma - stdDev * stdDevMultiplier;

    return { upper, middle, lower };
  }

  private calculateStandardDeviation(data: number[], period: number): number {
    const slice = data.slice(-period);
    const mean = this.average(slice);
    const squaredDifferences = slice.map(value => Math.pow(value - mean, 2));
    const variance = this.average(squaredDifferences);
    const standardDeviation = Math.sqrt(variance);
    return standardDeviation;
  }

  private average(arr: number[]): number {
    return arr.reduce((acc, value) => acc + value, 0) / arr.length;
  }
}

class TradingAlgorithm {
  private indicators: TechnicalIndicators;
  private accumulatedData: number[][] = [];
  private periodSMAShort: number;
  private periodSMALong: number;
  private periodRSI: number;
  private periodBB: number;
  private useSMA: boolean;
  private useRSI: boolean;
  private useBB: boolean;

  constructor(periodSMAShort: number, periodSMALong: number, periodRSI: number, periodBB: number, useSMA: boolean, useRSI: boolean, useBB: boolean) {
    this.indicators = new TechnicalIndicators();
    this.periodSMAShort = periodSMAShort;
    this.periodSMALong = periodSMALong;
    this.periodRSI = periodRSI;
    this.periodBB = periodBB;
    this.useSMA = useSMA;
    this.useRSI = useRSI;
    this.useBB = useBB;
    console.log(`TradingAlgorithm: ${this.periodSMAShort}, ${this.periodSMALong}, ${this.periodRSI}, ${this.periodBB}, ${this.useSMA}, ${this.useRSI}, ${this.useBB}`);
  }

  private getIndicatorsData(data: dataCsv[]): number[] {
    const closeData = data.map(row => parseFloat(row.close));
    const smaShort = this.indicators.calculateSMA(closeData, this.periodSMAShort);
    const smaLong = this.indicators.calculateSMA(closeData, this.periodSMALong);
    const rsi = this.indicators.calculateRSI(closeData);
    const bb = this.indicators.calculateBollingerBands(closeData, this.periodBB, 2);
    return [smaShort, smaLong, rsi, bb.upper, bb.middle, bb.lower];
  }

  public simulateTrading(model: NeuralNetwork, data: dataCsv[]): number {
    this.accumulatedData = [];
    let performance = 0;
    for (let i = 0; i < data.length; i++) {
      const newData = parseFloat(data[i].close);
      const decision = model.makeDecision(this.getIndicatorsData(data.slice(0, i)));
      if (decision === 'BUY') {
        performance -= newData;
      } else if (decision === 'SELL') {
        performance += newData;
      }
    }
    return performance;
  }
}

class NeuralNetwork {
  public model: tf.Sequential;

  constructor() {
    this.model = tf.sequential();
    this.model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
    this.model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });
  }

  public async trainModel(xs: tf.Tensor, ys: tf.Tensor): Promise<void> {
    await this.model.fit(xs, ys, { epochs: 10 });
  }

  public async saveModel(): Promise<void> {
    await this.model.save('file://saved-model');
  }

  public async loadModel(): Promise<void> {
    const loadedModel = await tf.loadLayersModel('file://saved-model/model.json');
    this.model = loadedModel as tf.Sequential;
  }

  public makeDecision(data: number[]): string {
    const prediction = this.model.predict(tf.tensor2d(data, [data.length, 1])) as tf.Tensor;
    const value = prediction.arraySync() as number[][];
    const signal = value[0][0] > 0.5 ? 'BUY' : 'SELL';
    return signal;
  }

  public generateRandomDecision(data: number[]): string {
    const threshold = Math.random();
    const signal = threshold > 0.5 ? 'BUY' : 'SELL';
    return signal;
  }
}

class TrainingData {
  public data: Data[];
  public tensor: tf.Tensor;

  constructor(data: Data[]) {
    this.data = data ?? [];
    this.tensor = this.data.length > 0 ? tf.tensor2d(this.data.map(row => [row.close])) : tf.tensor2d([], [0, 0]);
  }

  public addData(data: Data): void {
    this.data.push(data);
    this.tensor = this.data.length > 0 ? tf.tensor2d(this.data.map(row => [row.close])) : tf.tensor2d([], [0, 0]);
  }

  public getTensor(): tf.Tensor {
    return this.tensor;
  }

  public getShape(): number[] {
    return this.tensor.shape;
  }

  public getLength(): number {
    return this.tensor.shape[0];
  }
}

class Main {
  private models: NeuralNetwork[] = [];
  private bestModels: NeuralNetwork[] = [];
  private data: Data;
  private csvData: dataCsv[];

  constructor() {
    this.data = new Data(new Date(), 0, 0, 0, 0, 0);
    this.csvData = [];
  }

  private async loadData(filePath: string): Promise<void> {
    this.csvData = await this.data.readCSV(filePath);
  }

  private async trainModels(numModels: number, maxGenerations: number): Promise<void> {
    const tradingAlgorithms: TradingAlgorithm[] = [];
    for (let generation = 0; generation < maxGenerations; generation++) {
      console.log(`Generation: ${generation}`);
      for (let modelIndex = 0; modelIndex < numModels; modelIndex++) {
        const model = new NeuralNetwork();
        const trainingData = new TrainingData([]);
        for (let i = 0; i < this.csvData.length; i++) {
          const randomDecision = model.generateRandomDecision([]);
          const newData = parseFloat(this.csvData[i].close);
          const decision = randomDecision === 'BUY' ? 1 : randomDecision === 'SELL' ? -1 : 0;
          trainingData.addData(new Data(new Date(), 0, 0, 0, newData, decision));
        }
        const xs = trainingData.getTensor().reshape([trainingData.getLength(), 1]);
        const ys = tf.tensor2d(
          trainingData.data.slice(0).map(row => [row.close]),
          [trainingData.getLength(), 1]
        );
        if (ys.shape[0] > 0 && xs.shape[0] === ys.shape[0]) {
          await model.trainModel(xs, ys);
          this.models.push(model);
          const tradingAlgorithm = new TradingAlgorithm(Math.floor(Math.random() * 10) + 5, Math.floor(Math.random() * 10) + 15, Math.floor(Math.random() * 10) + 5, Math.floor(Math.random() * 10) + 15, Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5);
          tradingAlgorithms.push(tradingAlgorithm);
        }
      }
      for (let i = 0; i < this.models.length; i++) {
        const model = this.models[i];
        const tradingAlgorithm = tradingAlgorithms[i];
        let performance = 0;
        for (let j = 0; j < this.csvData.length; j++) {
          if (j !== 0) {
            if (j < 50)
              performance = tradingAlgorithm.simulateTrading(model, this.csvData.slice(0, j));
            else
              performance = tradingAlgorithm.simulateTrading(model, this.csvData.slice(j - 50, j));
          }
        }
        console.log(`Model Performance: ${performance}`);
      }
      this.models = this.models.sort((modelA, modelB) => {
        const performanceA = tradingAlgorithms[this.models.indexOf(modelA)].simulateTrading(modelA, this.csvData);
        const performanceB = tradingAlgorithms[this.models.indexOf(modelB)].simulateTrading(modelB, this.csvData);
        return performanceB - performanceA;
      });
      this.bestModels = this.models.slice(0, 3);
      for (const bestModel of this.bestModels) {
        await bestModel.saveModel();
      }
      this.models = [];
      this.bestModels = [];
    }
  }

  public async run(): Promise<void> {
    await this.loadData('BTCUSDT-1m-2024-01-05.csv');
    await this.trainModels(5, 50);
  }
}

const main = new Main();
main.run();