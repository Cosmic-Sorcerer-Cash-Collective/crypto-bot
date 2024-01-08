import TelegramBot from 'node-telegram-bot-api';
import { Binance } from './binance';
import { BotInstance } from './bot';
require('dotenv').config();

const botToken = process.env.TOKEN || '';
const bot = new TelegramBot(botToken, { polling: true });
// TODO: change this path
const botInstances = [
    new BotInstance('../bot-ts/log/logs_2023-11-18T19-46-23-152Z.txt', 'BotInstance1'),
    // Ajoutez d'autres instances selon vos besoins
];
const instances: { [key: string]: Binance } = {};
const channel: string = process.env.CHANNEL || '';

instances['BTCUSDT'] = new Binance('BTCUSDT', '1h');

bot.onText(/\/addinstance (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;

    if (match && match[1] && match[2]) {
        const symbolToAdd = match[1];
        const intervalToAdd = match[2];

        if (instances[symbolToAdd]) {
            bot.sendMessage(chatId, `Une instance avec le symbole ${symbolToAdd} existe déjà.`);
        } else {
            instances[symbolToAdd] = new Binance(symbolToAdd, intervalToAdd);
            bot.sendMessage(chatId, `Instance ajoutée avec le symbole ${symbolToAdd} et l'intervalle ${intervalToAdd}.`);
        }
    } else {
        bot.sendMessage(chatId, 'Veuillez fournir un symbole et un intervalle avec la commande /addinstance.');
    }
});

bot.onText(/\/removeinstance (.+)/, (msg, match) => {
    const chatId = msg.chat.id;

    if (match && match[1]) {
        const symbolToRemove = match[1];

        if (instances[symbolToRemove]) {
            delete instances[symbolToRemove];
            bot.sendMessage(chatId, `Instance avec le symbole ${symbolToRemove} supprimée.`);
        } else {
            bot.sendMessage(chatId, `Aucune instance avec le symbole ${symbolToRemove} n'existe.`);
        }
    } else {
        bot.sendMessage(chatId, 'Veuillez fournir un symbole avec la commande /removeinstance.');
    }
});

bot.onText(/\/listinstances/, (msg) => {
    const chatId = msg.chat.id;

    if (Object.keys(instances).length > 0) {
        let message = 'Instances disponibles:\n';
        Object.keys(instances).forEach((symbol) => {
            message += `${symbol} - ${instances[symbol].getInterval()}\n`;
        });
        bot.sendMessage(chatId, message);
    } else {
        bot.sendMessage(chatId, 'Aucune instance n\'a été ajoutée.');
    }
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, `Commandes disponibles:
    /addinstance [symbol] [interval]
    /removeinstance [symbol]
    /listinstances
    /bilan
    /help`);
});

function checkAndSendMessage(): void {
    Object.values(instances).forEach(async (binanceInstance) => {
        const message = await binanceInstance.run();
        if (message) {
            bot.sendMessage(channel, message);
        }
    });
}

bot.onText(/\/bilan/, (msg) => {
    const chatId = msg.chat.id;

    botInstances.forEach((instance) => {
        const message = instance.analyzeLogs();
    const profitsByDay = message.profitsByDay;
    const profitsByMonth = message.profitsByMonth;
    const profitsByYear = message.profitsByYear;

    let summaryMessage = `Bilan de l'instance ${instance.getInstanceName()} :\n\n`;

    // Profits par jour
    if (profitsByDay.length > 0) {
        const lastDay = profitsByDay[profitsByDay.length - 1];
        const lastDayDate = new Date(lastDay[0]);
        const today = new Date();

        if (lastDayDate.getDate() === today.getDate()) {
            summaryMessage += `Profit du jour : ${lastDay[1].toFixed(3)}%\n`;
        } else {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            const yesterdayFormatted = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
            const profitYesterday = profitsByDay.find(([date]) => date === yesterdayFormatted);

            if (profitYesterday) {
                summaryMessage += `Profit du ${yesterdayFormatted} : ${profitYesterday[1].toFixed(3)}%\n`;
            } else {
                summaryMessage += 'Aucun profit hier.\n';
            }
        }
    } else {
        summaryMessage += 'Aucun profit aujourd\'hui.\n';
    }

    // Profits par mois
    if (profitsByMonth.length > 0) {
        const lastMonth = profitsByMonth[profitsByMonth.length - 1];

        summaryMessage += `Profit du mois en cours : ${lastMonth[1].toFixed(3)}%\n`;
    } else {
        summaryMessage += 'Aucun profit ce mois-ci.\n';
    }

    // Profits par année
    if (profitsByYear.length > 0) {
        const lastYear = profitsByYear[profitsByYear.length - 1];

        summaryMessage += `Profit de l'année en cours : ${lastYear[1].toFixed(3)}%\n`;
    } else {
        summaryMessage += 'Aucun profit cette année.\n';
    }

    // Envoyer le message récapitulatif
    bot.sendMessage(chatId, summaryMessage);
    });
});


function sendDailyProfitSummary() {
    const today = new Date();

    if (today.getHours() === 10 && today.getMinutes() === 0) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const yesterdayFormatted = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
        botInstances.forEach((instance) => {
        const profitYesterday = instance.analyzeLogs().profitsByDay.find(([date]) => date === yesterdayFormatted);

        if (profitYesterday) {
            const profitMessage = `Bénéfice de la journée d'hier ${profitYesterday[1].toFixed(3)}% pour l'instance ${instance.getInstanceName()}.`;
            bot.sendMessage(channel, profitMessage);
        } else {
            const profitMessage = `Aucun bénéfice hier pour l'instance ${instance.getInstanceName()}.`;
            bot.sendMessage(channel, profitMessage);
        }
        });
    }
}

// setInterval(sendDailyProfitSummary, 60000);
// setInterval(checkAndSendMessage, 1000);

console.log('Bot started');