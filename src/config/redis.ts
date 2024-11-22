import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST ?? '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT ?? '6379', 10);
const redis = new Redis({ host: redisHost, port: redisPort });

redis.on('connect', () => {
  console.log('Redis connecté via Docker');
});

redis.on('error', (err) => {
  console.error('Erreur Redis :', err);
});

export default redis;
