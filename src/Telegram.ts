import TelegramBot from 'node-telegram-bot-api'
import { type Binance } from './Binance'

export class Telegram {
  private readonly bot: TelegramBot
  private readonly binance: Binance
  private readonly chatId: number[] = []

  constructor (crypto: Binance) {
    this.bot = new TelegramBot(process.env.TOKEN ?? '', { polling: true })
    if (process.env.CHANNEL !== undefined) {
      this.chatId = process.env.CHANNEL.split(',').map((id) => parseInt(id))
    }
    this.binance = crypto
  }

  private async sendMessage (chatId: number, message: string): Promise<void> {
    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
  }

  async sendMessageAll (message: string): Promise<void> {
    try {
      this.chatId.forEach((id) => this.sendMessage(id, message) as any)
    } catch (err) {
      console.log(err)
    }
  }

  public run (): void {
    this.bot.onText(/\/join/, (msg) => {
      const chatId = msg.chat.id
      for (const id of this.chatId) {
        if (id === chatId) {
          this.sendMessage(chatId, 'Already joined') as any
          return
        }
      }
      this.chatId.push(chatId)
      this.sendMessage(chatId, 'Joined') as any
    })

    this.bot.onText(/\/leave/, (msg) => {
      const chatId = msg.chat.id
      for (let i = 0; i < this.chatId.length; i++) {
        if (this.chatId[i] === chatId) {
          this.chatId.splice(i, 1)
          this.sendMessage(chatId, 'Left') as any
          return
        }
      }
      this.sendMessage(chatId, 'Not joined') as any
    })

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id
      this.sendMessage(chatId, `Commandes disponibles:
/join - Rejoindre le groupe
/leave - Quitter le groupe
/help - Afficher les commandes disponibles`) as any
    })

    this.bot.on('message', (msg) => {
      const chatId: number = msg.chat.id
      if (msg.text === undefined || msg.text === '/join' || msg.text === '/leave' || msg.text === '/getProfit' || msg.text === '/help') return
      const message: string = `Je n'ai pas compris votre demande. Voici les commandes disponibles:\n
/help - Afficher les commandes disponibles
/join - Rejoindre le groupe
/leave - Quitter le groupe
      `
      this.sendMessage(chatId, message) as any
    })
  }
}
