import TelegramBot from 'node-telegram-bot-api';
import { Binance } from './Binance';
import { BotAlgorithm } from './bot';
import { typeInstance } from './utils/type';
require('dotenv').config();

const botToken = process.env.TOKEN || '';
const bot = new TelegramBot(botToken, { polling: true });

const channel: string = process.env.CHANNEL || '';
const botInstance : typeInstance[] = [
    {
        id: 0,
        symbol: 'BTCUSDT',
        interval: '1m',
        macdShortPeriod: 12,
        macdLongPeriod: 26,
        macdSignalPeriod: 9,
        rsiPeriod: 14,
        lastDecision: 'HOLD'
    },
    {
        id: 1,
        symbol: 'ETHUSDT',
        interval: '1m',
        macdShortPeriod: 12,
        macdLongPeriod: 26,
        macdSignalPeriod: 9,
        rsiPeriod: 14,
        lastDecision: 'HOLD'
    },
    {
        id: 2,
        symbol: 'BNBUSDT',
        interval: '1m',
        macdShortPeriod: 12,
        macdLongPeriod: 26,
        macdSignalPeriod: 9,
        rsiPeriod: 14,
        lastDecision: 'HOLD'
    },
    {
        id: 3,
        symbol: 'BONKUSDT',
        interval: '1m',
        macdShortPeriod: 12,
        macdLongPeriod: 26,
        macdSignalPeriod: 9,
        rsiPeriod: 14,
        lastDecision: 'HOLD'
    },
    {
        id: 4,
        symbol: 'NFPUSDT',
        interval: '1m',
        macdShortPeriod: 12,
        macdLongPeriod: 26,
        macdSignalPeriod: 9,
        rsiPeriod: 14,
        lastDecision: 'HOLD'
    },
    {
        id: 5,
        symbol: 'DOCKUSDT',
        interval: '1m',
        macdShortPeriod: 12,
        macdLongPeriod: 26,
        macdSignalPeriod: 9,
        rsiPeriod: 14,
        lastDecision: 'HOLD'
    }
];

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, `Commandes disponibles:
    /addinstance symbol interval macdShortPeriod macdLongPeriod macdSignalPeriod rsiPeriod
    /removeinstance symbol
    /listinstances
    /help`);
});

bot.onText(/\/addinstance (.+) (.+)(?: (\d+)(?: (\d+)(?: (\d+)(?: (\d+))?)?)?)?/, (msg, match) => {
    if (!match) return;
    const chatId = msg.chat.id;
    const symbol = match[1];
    const interval = match[2];
    const macdShortPeriod = Number(match[3]) || 12;
    const macdLongPeriod = Number(match[4]) || 26;
    const macdSignalPeriod = Number(match[5]) || 9;
    const rsiPeriod = Number(match[6]) || 14;

    const instance = {
        id: botInstance.length,
        symbol,
        interval,
        macdShortPeriod,
        macdLongPeriod,
        macdSignalPeriod,
        rsiPeriod
    }
    botInstance.push(instance);
    bot.sendMessage(chatId, `Instance ajoutée: ${symbol} ${interval}`);
});

bot.onText(/\/removeinstance (.+)/, (msg, match) => {
    if (!match) return;
    const chatId = msg.chat.id;
    const symbol = match[1];

    const index = botInstance.findIndex((instance) => instance.symbol === symbol);
    if (index !== -1) {
        botInstance.splice(index, 1);
        bot.sendMessage(chatId, `Instance supprimée: ${symbol}`);
    } else {
        bot.sendMessage(chatId, `Instance non trouvée: ${symbol}`);
    }
});

bot.onText(/\/listinstances/, (msg) => {
    const chatId = msg.chat.id;
    if (botInstance.length === 0) {
        bot.sendMessage(chatId, `Aucune instance`);
        return;
    }
    let message = 'instances:\n';
    botInstance.forEach((instance) => {
        message += `${instance.id} ${instance.symbol} ${instance.interval} ${instance.macdShortPeriod} ${instance.macdLongPeriod} ${instance.macdSignalPeriod} ${instance.rsiPeriod}\n`;
    });
    bot.sendMessage(chatId, message);
});

async function main() {
    if (botInstance.length !== 0) {
        for (const instance of botInstance) {
            const binance = new Binance(instance.symbol, instance.interval, 50);
            const data = await binance.fetchMarketData();
            const algo = new BotAlgorithm(instance.macdShortPeriod, instance.macdLongPeriod, instance.macdSignalPeriod, instance.rsiPeriod, instance.lastDecision || 'SELL');
            const decision = await algo.tradeDecision(data);
            if (decision === 'BUY' && instance.lastDecision !== 'BUY') {
                const updateInstance = botInstance.find((ins: typeInstance) => ins.id === instance.id);
                if (!updateInstance) {
                    bot.sendMessage(channel, `Instance non trouvée: ${instance.id}`);
                    return;
                }
                updateInstance.lastDecision = 'BUY';
                bot.sendMessage(channel, `📈 BUY ${instance.symbol} ${instance.interval}\nPrice: ${data[data.length - 1].close}`);
            } else if (decision === 'SELL' && instance.lastDecision !== 'SELL') {
                const updateInstance = botInstance.find((ins: typeInstance) => ins.id === instance.id);
                if (!updateInstance) {
                    bot.sendMessage(channel, `Instance non trouvée: ${instance.id}`);
                    return;
                }
                updateInstance.lastDecision = 'SELL';
                bot.sendMessage(channel, `📉 SELL ${instance.symbol} ${instance.interval}\nPrice: ${data[data.length - 1].close}`);
            }
        }
    }
}

setInterval(main, 30000);
console.log('Bot started');