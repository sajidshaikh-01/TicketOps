export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  bcryptSaltRounds: number;
  corsOrigin: string;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
});
