# Binance Trading Bot

This project is an automated trading bot designed to execute buy and sell orders on **Binance**. The bot uses technical indicators (RSI, Bollinger Bands, etc.) to generate trading signals and can notify results via **Telegram**.

## Table of Contents
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Features](#features)
- [Code Overview](#code-overview)
- [Troubleshooting](#troubleshooting)

---

## Requirements

- **Node.js** (version 14 or higher)
- A **Binance** account with an API key and secret.
- A Telegram bot setup for receiving trading notifications (optional).

## Installation

1. **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <folder-name>
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

## Configuration

1. **Create a `.env` file** in the root directory and add the following variables:
    ```plaintext
    BINANCE_API_KEY=your_binance_api_key
    BINANCE_API_SECRET=your_binance_api_secret
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token
    TELEGRAM_CHAT_ID=your_telegram_chat_id
    AMOUNT_TO_SPEND=your_amount_to_spend
    ```

    Replace `your_binance_api_key`, `your_binance_api_secret`, `your_telegram_bot_token`, `your_telegram_chat_id`, and `your_amount_to_spend` with your own values.

2. **Binance API Keys**:
   - Create an API key in your Binance account under `API Management`.
   - Make sure the API key has **read** and **trading** permissions.

3. **Telegram** (optional):
   - Create a Telegram bot via **BotFather**.
   - Use `TELEGRAM_BOT_TOKEN` for your bot's token and `TELEGRAM_CHAT_ID` for the group or user chat ID.

## Usage

1. **Start the bot**:
    ```bash
    npm start
    ```
   The bot will begin analyzing the configured trading pairs and will execute buy/sell orders based on detected signals.

2. **Stop the bot**:
   To stop the bot, press `Ctrl + C`.

## Features

- **Multi-timeframe Analysis**: Uses multiple timeframes (1m, 3m, 5m, etc.) to calculate technical indicators.
- **Technical Indicators**: Integrates RSI, Bollinger Bands, and Ichimoku to generate trading signals.
- **Order Execution**: Places market orders to buy or sell assets with automatic take-profit management.
- **Telegram Notifications**: Sends notifications for each order placed and for any errors encountered.

## Code Overview

- **`TradingBot.ts`**: Contains the bot's main logic, including signal management, order execution, and notification setup.
- **`TechnicalIndicator.ts`**: Calculates technical indicators for different timeframes.
- **`Telegram.ts`**: Module for Telegram notifications.
- **`utils/type.ts`**: Defines types and interfaces for Binance data.

## Troubleshooting

- **Error: Insufficient Balance**  
   This error occurs when the Binance account does not have enough funds to execute the order. Ensure that you have sufficient balance for the selected trading pairs.

- **Error: Too Much Precision**  
   This error is caused by a quantity with too many decimal places. Ensure that `quantity` respects precision rules using `stepSize`.

- **"No signal for..."**  
   This message means no buy or sell signal was detected for the pair. This can be normal under current market conditions.

## Disclaimer

This bot is for educational use only. Cryptocurrency markets are volatile, and automated trading strategies involve risk. Use this bot at your own risk, and only trade amounts you are prepared to lose.

---

## License

This project is open-source and distributed under the MIT license.
