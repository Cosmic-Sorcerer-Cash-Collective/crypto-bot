export type dataBinance = {
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

export type typeInstance = {
    id: number;
    symbol: string;
    interval: string;
    macdShortPeriod: number;
    macdLongPeriod: number;
    macdSignalPeriod: number;
    rsiPeriod: number;
    lastDecision?: string;
}