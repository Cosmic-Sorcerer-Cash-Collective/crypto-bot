import { Binance } from '../Binance'
import { BotAlgorithm } from '../BotAlgorithm'
import { TechnicalIndicator } from '../TechnicalIndicator'
import { type typeInstance } from './type'

export const botInstance: typeInstance[] = [
  {
    id: 0,
    symbol: 'BTCUSDT',
    interval: '1h',
    macdShortPeriod: 12,
    macdLongPeriod: 26,
    macdSignalPeriod: 9,
    rsiPeriod: 14,
    lastDecision: ['HOLD'],
    binance: new Binance('BTCUSDT', '1h', 30),
    technicalIndicator: new TechnicalIndicator(),
    botAlgorithm: new BotAlgorithm(12, 26, 9, 14, 'HOLD')
  }
]
