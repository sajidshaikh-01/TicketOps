import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

// Structured JSON logging in production (so Fluent Bit / Loki can parse and
// index fields like request_id later), pretty-printed colourised logs in
// development for readability.
export function buildWinstonOptions(nodeEnv: string) {
  const isProd = nodeEnv === 'production';

  return {
    level: isProd ? 'info' : 'debug',
    transports: [
      new winston.transports.Console({
        format: isProd
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              nestWinstonModuleUtilities.format.nestLike('admin-api', {
                colors: true,
                prettyPrint: true,
              }),
            ),
      }),
    ],
  };
}
