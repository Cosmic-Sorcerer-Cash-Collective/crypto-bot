CREATE TABLE crypto (
    id SERIAL PRIMARY KEY,
    pair text NOT NULL,
    close_price numeric NOT NULL
);

CREATE TABLE dataCrypto (
    id SERIAL PRIMARY KEY,
    pair text NOT NULL,
    nbSignals integer NOT NULL,
    percentProfit numeric NOT NULL DEFAULT 0
);
