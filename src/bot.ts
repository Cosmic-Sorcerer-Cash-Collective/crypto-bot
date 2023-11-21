import * as fs from 'fs';

export class BotInstance {
  private logs: string[];
  private instanceName: string;

  constructor(private filePath: string, instanceName: string) {
    this.logs = this.readLogsFromFile();
    this.instanceName = instanceName;
  }

  private readLogsFromFile(): string[] {
    try {
      return fs.readFileSync(this.filePath, 'utf8').split('\n');
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);
      return [];
    }
  }

  public getInstanceName(): string {
    return this.instanceName;
  }

  private calculateProfits(): {
    profitsByDay: [string, number][];
    profitsByMonth: [string, number][];
    profitsByYear: [string, number][];
  } {
    this.logs = this.readLogsFromFile();
    const profitsByDay: Map<string, number> = new Map();
    const profitsByMonth: Map<string, number> = new Map();
    const profitsByYear: Map<string, number> = new Map();

    this.logs.forEach((log) => {

      const dateMatch = log.match(/\[(.*?)\]/);
      const timestamp = dateMatch ? new Date(dateMatch[1]) : null;

      const profitMatch = log.match(/Profit : (.*?)%/);
      const profitPercentage = profitMatch ? parseFloat(profitMatch[1]) : null;

      if (timestamp !== null && profitPercentage !== null) {
        const dayKey = timestamp.toISOString().split('T')[0];
        profitsByDay.set(dayKey, (profitsByDay.get(dayKey) || 0) + profitPercentage);

        const monthKey = `${timestamp.getFullYear()}-${timestamp.getMonth() + 1}`;
        profitsByMonth.set(monthKey, (profitsByMonth.get(monthKey) || 0) + profitPercentage);

        const yearKey = timestamp.getFullYear().toString();
        profitsByYear.set(yearKey, (profitsByYear.get(yearKey) || 0) + profitPercentage);
      }
    });

    return {
      profitsByDay: Array.from(profitsByDay.entries()),
      profitsByMonth: Array.from(profitsByMonth.entries()),
      profitsByYear: Array.from(profitsByYear.entries()),
    };
  }


  public analyzeLogs(): {
    profitsByDay: [string, number][];
    profitsByMonth: [string, number][];
    profitsByYear: [string, number][];
  } {
    if (this.logs.length > 0) {
      return this.calculateProfits();
    } else {
      console.log(`[${this.instanceName}] Aucun log trouvé.`);
      return {
        profitsByDay: [],
        profitsByMonth: [],
        profitsByYear: [],
      };
    }
  }

  public hasMadeProfit(): boolean {
    const profits = this.calculateProfits();
    const totalProfit =
      profits.profitsByDay.reduce((acc, [_, profit]) => acc + profit, 0) +
      profits.profitsByMonth.reduce((acc, [_, profit]) => acc + profit, 0) +
      profits.profitsByYear.reduce((acc, [_, profit]) => acc + profit, 0);

    return totalProfit > 0;
  }
}
