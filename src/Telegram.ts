import TelegramBot from 'node-telegram-bot-api'

export class Telegram {
  private readonly bot: TelegramBot
  private readonly chatId: number[] = []

  constructor () {
    this.bot = new TelegramBot(process.env.TOKEN ?? '', { polling: true })
    if (process.env.CHANNEL_ID !== undefined) {
      this.chatId = process.env.CHANNEL_ID.split(',').map((id) => parseInt(id))
    }
  }

  private async sendMessage (chatId: number, message: string): Promise<void> {
    await this.bot.sendMessage(chatId, message)
  }

  async sendMessageAll (message: string): Promise<void> {
    this.chatId.forEach((id) => this.sendMessage(id, message) as any)
  }

  public run (): void {
    this.bot.on('message', (msg) => {
      const chatId = msg.chat.id
      this.sendMessage(chatId, 'Received your message') as any
    })

    this.bot.onText(/\/join/, (msg, match) => {
      const chatId = msg.chat.id
      this.chatId.push(chatId)
      this.sendMessage(chatId, 'Joined') as any
    })

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id
      this.sendMessage(chatId, `Commandes disponibles:
      /addinstance symbol interval macdShortPeriod macdLongPeriod macdSignalPeriod rsiPeriod
      /removeinstance symbol
      /listinstances
      /help`) as any
    })
  }
}
