export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  queuePollTimeoutSeconds: number;
  reconcileIntervalMs: number;
  stuckJobThresholdMs: number;
  maxJobAttempts: number;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4002', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  queuePollTimeoutSeconds: parseInt(
    process.env.QUEUE_POLL_TIMEOUT_SECONDS || '5',
    10,
  ),
  reconcileIntervalMs: parseInt(
    process.env.RECONCILE_INTERVAL_MS || '30000',
    10,
  ),
  stuckJobThresholdMs: parseInt(
    process.env.STUCK_JOB_THRESHOLD_MS || '120000',
    10,
  ),
  maxJobAttempts: parseInt(process.env.MAX_JOB_ATTEMPTS || '5', 10),
});
