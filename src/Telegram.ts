import TelegramBot from 'node-telegram-bot-api'
import { type Binance } from './Binance'
import { type Postgres } from './database/Postgres'

export class Telegram {
  private readonly bot: TelegramBot
  private readonly binance: Binance
  private readonly database: Postgres
  private readonly chatId: number[] = []

  constructor (crypto: Binance, database: Postgres) {
    this.bot = new TelegramBot(process.env.TOKEN ?? '', { polling: true })
    if (process.env.CHANNEL !== undefined) {
      this.chatId = process.env.CHANNEL.split(',').map((id) => parseInt(id))
    }
    this.binance = crypto
    this.database = database
  }

  private async sendMessage (chatId: number, message: string): Promise<void> {
    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
  }

  async sendMessageAll (message: string): Promise<void> {
    this.chatId.forEach((id) => this.sendMessage(id, message) as any)
  }

  async getBigCandle (): Promise<void> {
    const res = await this.database.query('SELECT * FROM crypto')
    for (const crypto of res) {
      const data = await this.binance.fetchPairMarketData(crypto.pair as string, '5m', 1)
      const closePrice = parseFloat(data[0].close)
      const openPrice = parseFloat(data[0].open)
      const price = parseFloat(crypto.close_price as string)
      const calculate = ((closePrice - openPrice) / openPrice) * 100
      const profit = ((closePrice - price) / price) * 100
      if (calculate > 5) {
        await this.sendMessageAll(`**${crypto.pair}**: ${calculate.toFixed(2)}%`)
      } else if (profit > 10) {
        await this.sendMessageAll(`**${crypto.pair}**: ${profit.toFixed(2)}%`)
      }
    }
  }

  async sendProfit (chatId: number): Promise<void> {
    const res = await this.database.query('SELECT * FROM crypto')
    let message = ''
    for (const crypto of res) {
      const data = await this.binance.fetchPairMarketData(crypto.pair as string, '5m', 1)
      console.log(data)
      console.log(crypto)
      const closePrice = parseFloat(data[0].close)
      const price = parseFloat(crypto.close_price as string)
      const profit = ((closePrice - price) / price) * 100
      console.log(closePrice, price, profit)
      message += `**${crypto.pair}**: ${profit.toFixed(2)}%\n`
    }
    this.sendMessage(chatId, message) as any
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

    this.bot.onText(/\/getProfit/, (msg) => {
      const chatId = msg.chat.id
      this.sendProfit(chatId) as any
    })

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id
      this.sendMessage(chatId, `Commandes disponibles:
      /join - Rejoindre le groupe
      /leave - Quitter le groupe
      /help - Afficher les commandes disponibles`) as any
    })
  }
}
