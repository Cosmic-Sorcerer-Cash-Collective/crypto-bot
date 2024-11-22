import TelegramBot from 'node-telegram-bot-api';

export class Telegram {
  private readonly bot: TelegramBot;
  private readonly chatId: number[] = [];

  constructor() {
    this.bot = new TelegramBot(process.env.TOKEN ?? '', { polling: true });
    if (process.env.CHANNEL !== undefined) {
      this.chatId = process.env.CHANNEL.split(',').map((id) => parseInt(id));
    }
  }

  private async sendMessage(chatId: number, message: string): Promise<void> {
    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  public async sendMessageAll(message: string): Promise<void> {
    try {
      this.chatId.forEach((id) => {
        this.sendMessage(id, message).catch((error) => {
          console.error(error);
        });
      });
    } catch (error) {
      console.error(error);
    }
  }

  public run(): void {
    this.bot.onText(/\/join/, (msg) => {
      const chatId = msg.chat.id;
      if (this.chatId.includes(chatId)) {
        this.sendMessage(chatId, 'Vous êtes déjà inscrit.').catch((error) => {
          console.error(error);
        });
        return;
      }
      this.chatId.push(chatId);
      this.sendMessage(chatId, 'Inscription réussie.').catch((error) => {
        console.error(error);
      });
    });

    this.bot.onText(/\/leave/, (msg) => {
      const chatId = msg.chat.id;
      const index = this.chatId.indexOf(chatId);
      if (index !== -1) {
        this.chatId.splice(index, 1);
        this.sendMessage(chatId, 'Désinscription réussie.').catch((error) => {
          console.error(error);
        });
      } else {
        this.sendMessage(chatId, "Vous n'êtes pas inscrit.").catch((error) => {
          console.error(error);
        });
      }
    });

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.sendMessage(
        chatId,
        `Commandes disponibles:
- /join : Recevoir les notifications.
- /leave : Arrêter les notifications.
- /help : Afficher l'aide.`
      ).catch((error) => {
        console.error(error);
      });
    });

    this.bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      if (!this.chatId.includes(chatId)) {
        this.sendMessage(chatId, "Vous n'êtes pas inscrit.").catch((error) => {
          console.error(error);
        });
      }
    });
  }
}
