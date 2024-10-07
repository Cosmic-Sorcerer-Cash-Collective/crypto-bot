export interface dataBinance {
  open_time: string
  open: string
  high: string
  low: string
  close: string
  volume: string
  close_time: string
  quote_volume: string
  count: string
  taker_buy_volume: string
  taker_buy_quote_volume: string
  ignore: string
}

export interface MACDResult {
  macd: number[]
  signal: number[]
  histogram: number[]
}

export interface BollingerBandsResult {
  middleBand: number[]
  upperBand: number[]
  lowerBand: number[]
}

export interface IchimokuResult {
  tenkanSen: number[]
  kijunSen: number[]
  senkouSpanA: number[]
  senkouSpanB: number[]
  chikouSpan: number[]
}
