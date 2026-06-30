// Centralised, typed configuration. Every other module reads config through
// ConfigService rather than touching process.env directly, so the source of
// truth for "what env vars exist" lives in exactly one place.

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  seatLockTtlSeconds: number;
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
  };
  corsOrigin: string;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  seatLockTtlSeconds: parseInt(process.env.SEAT_LOCK_TTL_SECONDS || '600', 10),
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
});
