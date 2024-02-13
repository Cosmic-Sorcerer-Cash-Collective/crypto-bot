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
    try {
      this.chatId.forEach((id) => this.sendMessage(id, message) as any)
    } catch (err) {
      console.log(err)
    }
  }

  async getBigCandle (): Promise<void> {
    const bigCandles: Record<string, { threshold: number, message: string }> = {
      '1d': { threshold: 7.5, message: 'Voici les Grosses bougies pour les actifs en 1d:\n' },
      '1h': { threshold: 3, message: 'Voici les Grosses bougies pour les actifs en 1h:\n' },
      '5m': { threshold: 1, message: 'Voici les Grosses bougies pour les actifs en 5m:\n' }
    }

    for (const [candleTime, { threshold, message }] of Object.entries(bigCandles)) {
      const res = await this.database.query(`SELECT * FROM crypto WHERE candle_time = '${candleTime}'`)
      let offset = 0
      let candleMessage = ''

      for (const crypto of res) {
        const data = await this.binance.fetchPairMarketData(crypto.pair as string, candleTime, 1)
        const closePrice = parseFloat(data[0].close)
        const openPrice = parseFloat(data[0].open)
        const profit = ((closePrice - openPrice) / openPrice) * 100

        if (profit > threshold) {
          candleMessage += `${crypto.pair}: ${profit.toFixed(2)}%\n`
          offset++
        }
      }

      if (offset !== 0) {
        const formattedMessage = `
          *${message}*
          \`\`\`
          ${candleMessage}
          \`\`\`
        `
        this.sendMessageAll(formattedMessage) as any
      }
    }
  }

  async sendProfit (chatId: number): Promise<void> {
    const intervals = [
      { interval: '1h', message: 'Voici les profits pour les actifs en 1h:\n' },
      { interval: '1d', message: 'Voici les profits pour les actifs en 1d:\n' },
      { interval: '5m', message: 'Voici les profits pour les actifs en 5m:\n' }
    ]

    for (const { interval, message } of intervals) {
      const res = await this.database.query(`SELECT * FROM crypto WHERE candle_time = '${interval}'`)
      let profitMessage = message

      if (res.length === 0) {
        profitMessage = `Pas de profits pour les actifs en ${interval}\n`
      } else {
        for (const crypto of res) {
          const data = await this.binance.fetchPairMarketData(crypto.pair as string, interval, 1)
          const closePrice = parseFloat(data[0].close)
          const price = parseFloat(crypto.close_price as string)
          const profit = ((closePrice - price) / price) * 100
          profitMessage += `*${crypto.pair}*: ${profit.toFixed(2)}%\n`
        }
      }
      try {
        await this.sendMessage(chatId, profitMessage)
      } catch (err) {
        console.log(err)
      }
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

    this.bot.onText(/\/getProfit/, (msg) => {
      const chatId = msg.chat.id
      this.sendProfit(chatId) as any
    })

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id
      this.sendMessage(chatId, `Commandes disponibles:
/join - Rejoindre le groupe
/leave - Quitter le groupe
/getProfit - Afficher les profits
/help - Afficher les commandes disponibles`) as any
    })

    this.bot.on('message', (msg) => {
      const chatId: number = msg.chat.id
      const message: string = `Je n'ai pas compris votre demande. Voici les commandes disponibles:\n
/help - Afficher les commandes disponibles
/join - Rejoindre le groupe
/leave - Quitter le groupe
/getProfit - Afficher les profits
      `
      this.sendMessage(chatId, message) as any
    })

    setInterval(() => {
      this.getBigCandle().catch((err) => { console.log(err) })
    }, 2 * 60 * 1000)
  }
}
