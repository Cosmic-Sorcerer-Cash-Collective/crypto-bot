import axios from 'axios';

const closePrices: number[] = []; // Tableau pour stocker les prix de clôture

export class Binance {
    private hasCrossed: boolean;

    constructor(private symbol: string, private interval: string) {
        this.symbol = symbol;
        this.interval = interval;
        this.hasCrossed = false;
    }

    public getSymbol(): string {
        return this.symbol;
    }

    public getInterval(): string {
        return this.interval;
    }

    public setSymbol(symbol: string): void {
        this.symbol = symbol;
    }

    public setInterval(interval: string): void {
        this.interval = interval;
    }

    private calculateSMA(data: number[], period: number): number {
        if (data.length < period) {
          return NaN;
        }

        const sum = data.slice(-period).reduce((acc, val) => acc + val, 0);
        return sum / period;
      }

      private detectCross(sma20: number, sma50: number): boolean {
        return sma20 > sma50;
      }

      private async fetchMarketData(): Promise<number> {
        const klinesResponse = await axios.get('https://api.binance.com/api/v3/klines', {
          params: {
            symbol: this.symbol,
            interval: this.interval,
            limit: 50,
          },
        });
        const klines = klinesResponse.data;
        const latestClosePrices = klines.map((kline: any) => parseFloat(kline[4]));

        closePrices.push(...latestClosePrices);

        while (closePrices.length > 50) {
          closePrices.shift();
        }

          return latestClosePrices[latestClosePrices.length - 1];
        }

      public async run(): Promise<string | undefined> {
            try {
                const latestClosePrice = await this.fetchMarketData();

                const sma20 = this.calculateSMA(closePrices, 20);
                const sma50 = this.calculateSMA(closePrices, 50);

                const isCross = this.detectCross(sma20, sma50);
                if (isCross && !this.hasCrossed) {
                    if (sma20 > sma50) {
                        this.hasCrossed = true;
                        return `📈 ${this.symbol} : prix ${latestClosePrice}, potentiel achat`;
                    } else {
                        return `📉 ${this.symbol} : prix ${latestClosePrice}, potentiel vente`;
                    }
                } else if (!isCross) {
                    this.hasCrossed = false;
                    return undefined;
                }
            } catch (error) {
                console.error('Une erreur s\'est produite lors de la vérification du croisement:', error);
                return undefined;
            }
    }
}