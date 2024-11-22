
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bots (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    pairs JSONB NOT NULL,
    budget DECIMAL(20, 2) NOT NULL,
    interval_seconds INT NOT NULL DEFAULT 30,
    algo VARCHAR(10) NOT NULL DEFAULT 'MTF',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    bot_id INT REFERENCES bots(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    profit_loss DECIMAL(20, 8),
    executed_at TIMESTAMP NOT NULL
);

CREATE TABLE communication_tools (
    id SERIAL PRIMARY KEY,
    bot_id INT REFERENCES bots(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    token VARCHAR(255) NOT NULL,
    channels JSONB NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bot_logs (
    id SERIAL PRIMARY KEY,
    bot_id INT REFERENCES bots(id) ON DELETE CASCADE,
    log_message TEXT NOT NULL,
    log_level VARCHAR(20) DEFAULT 'INFO',
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE performance_metrics (
    id SERIAL PRIMARY KEY,
    bot_id INT REFERENCES bots(id) ON DELETE CASCADE,
    time_period VARCHAR(10) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_profit_loss DECIMAL(20, 8) NOT NULL,
    total_trades INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_id ON bots(user_id);
CREATE INDEX idx_bot_id ON transactions(bot_id);
CREATE INDEX idx_bot_id_comm ON communication_tools(bot_id);
