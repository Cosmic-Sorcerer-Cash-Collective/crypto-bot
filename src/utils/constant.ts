import { type typeInstance } from './type'

export const botInstance: typeInstance[] = [
  {
    id: 0,
    symbol: 'BTCUSDT',
    interval: '1m',
    macdShortPeriod: 12,
    macdLongPeriod: 26,
    macdSignalPeriod: 9,
    rsiPeriod: 14,
    lastDecision: ['HOLD']
  }
  // {
  //   id: 1,
  //   symbol: 'ETHUSDT',
  //   interval: '1m',
  //   macdShortPeriod: 12,
  //   macdLongPeriod: 26,
  //   macdSignalPeriod: 9,
  //   rsiPeriod: 14,
  //   lastDecision: ['HOLD']
  // },
  // {
  //   id: 2,
  //   symbol: 'SOLUSDT',
  //   interval: '1m',
  //   macdShortPeriod: 12,
  //   macdLongPeriod: 26,
  //   macdSignalPeriod: 9,
  //   rsiPeriod: 14,
  //   lastDecision: ['HOLD']
  // }
]
