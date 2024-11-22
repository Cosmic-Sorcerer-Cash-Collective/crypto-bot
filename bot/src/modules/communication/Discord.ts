import { Client, GatewayIntentBits, type TextChannel } from 'discord.js';

export class Discord {
  private readonly client: Client;
  private readonly channelIds: string[] = [];

  constructor() {
    const token = process.env.DISCORD_TOKEN;
    if (token === undefined) {
      throw new Error('Le token Discord est requis dans DISCORD_TOKEN.');
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    if (process.env.DISCORD_CHANNELS !== undefined) {
      this.channelIds = process.env.DISCORD_CHANNELS.split(',');
    }

    this.client.login(token).catch((error) => {
      console.error('Erreur lors de la connexion à Discord:', error);
    });
  }

  private async sendMessage(channelId: string, message: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);

    // if (channel && channel.isTextBased()) {
    if (channel !== null && channel.isTextBased()) {
      try {
        await (channel as TextChannel).send(message);
      } catch (error) {
        console.error(
          `Erreur lors de l'envoi d'un message à ${channelId}:`,
          error
        );
      }
    } else {
      console.error(
        `Le canal ${channelId} n'est pas valide ou n'est pas textuel.`
      );
    }
  }

  public async sendMessageAll(message: string): Promise<void> {
    try {
      for (const channelId of this.channelIds) {
        await this.sendMessage(channelId, message);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi des messages Discord :", error);
    }
  }

  public run(): void {
    this.client.once('ready', () => {
      console.log('Bot Discord prêt.');

      this.client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        const content = message.content.toLowerCase();

        if (content === '/join') {
          if (this.channelIds.includes(message.channel.id)) {
            message
              .reply('Ce canal est déjà inscrit pour les notifications.')
              .catch(console.error);
          } else {
            this.channelIds.push(message.channel.id);
            message
              .reply(
                'Ce canal a été inscrit avec succès pour les notifications.'
              )
              .catch(console.error);
          }
        }

        if (content === '/leave') {
          const index = this.channelIds.indexOf(message.channel.id);
          if (index !== -1) {
            this.channelIds.splice(index, 1);
            message
              .reply('Ce canal a été désinscrit des notifications.')
              .catch(console.error);
          } else {
            message
              .reply("Ce canal n'est pas inscrit pour les notifications.")
              .catch(console.error);
          }
        }

        if (content === '/help') {
          message
            .reply(
              `Commandes disponibles :
- /join : Recevoir les notifications.
- /leave : Arrêter les notifications.
- /help : Afficher l'aide.`
            )
            .catch(console.error);
        }
      });
    });
  }
}
