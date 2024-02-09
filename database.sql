CREATE TABLE crypto (
    id SERIAL PRIMARY KEY,
    pair text NOT NULL,
    close_price numeric NOT NULL,
    candle_time text NOT NULL
);