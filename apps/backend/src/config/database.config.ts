import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    ssl: buildSsl(),
  }),
);

/**
 * SSL is opt-in via DB_SSL=true so that setting NODE_ENV=production locally
 * (e.g. to test production behaviour against a local self-signed Postgres)
 * doesn't break the connection. Managed cloud databases typically provide a CA
 * cert — set DB_SSL_CA to that cert's PEM for verified connections. To skip
 * cert verification (e.g. self-signed on a private network) set
 * DB_SSL_REJECT_UNAUTHORIZED=false.
 */
function buildSsl() {
  if (process.env.DB_SSL !== 'true') return false;
  if (process.env.DB_SSL_CA) {
    return { ca: process.env.DB_SSL_CA };
  }
  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}
