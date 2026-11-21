import 'dotenv/config';

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: number(process.env.PORT, 4100),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/upimesh',
  corsOrigin: process.env.CORS_ORIGIN || '',
  packetMaxAgeSeconds: number(process.env.PACKET_MAX_AGE_SECONDS, 86400),
  idempotencyTtlSeconds: number(process.env.IDEMPOTENCY_TTL_SECONDS, 86400),
  nodeEnv: process.env.NODE_ENV || 'development'
};
