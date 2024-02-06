import { Client } from 'pg'

export class Postgres {
  private readonly client: Client

  constructor () {
    this.client = new Client({
      user: process.env.USER,
      host: process.env.HOST,
      database: process.env.DB,
      password: process.env.PASSWORD,
      port: parseInt(process.env.PORT ?? '5432')
    })
  }

  public async connect (): Promise<void> {
    await this.client.connect()
  }

  public async disconnect (): Promise<void> {
    await this.client.end()
  }

  public async query (query: string): Promise<any> {
    const res = await this.client.query(query)
    return res.rows
  }

  public async insert (query: string): Promise<void> {
    await this.client.query(query)
  }

  public async update (query: string): Promise<void> {
    await this.client.query(query)
  }

  public async delete (query: string): Promise<void> {
    await this.client.query(query)
  }
}
