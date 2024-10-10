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
  macd: Array<number | undefined>
  signal: Array<number | undefined>
  histogram: Array<number | undefined>
}

export interface BollingerBandsResult {
  middleBand: Array<number | undefined>
  upperBand: Array<number | undefined>
  lowerBand: Array<number | undefined>
}

export interface IchimokuResult {
  tenkanSen: Array<number | undefined>
  kijunSen: Array<number | undefined>
  senkouSpanA: Array<number | undefined>
  senkouSpanB: Array<number | undefined>
  chikouSpan: Array<number | undefined>
}
