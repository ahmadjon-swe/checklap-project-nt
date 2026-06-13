import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

/**
 * Schema for required/expected environment variables. Validated once at boot so
 * the app fails fast with a clear message instead of starting in an insecure or
 * half-configured state (e.g. an empty JWT secret = forgeable tokens).
 */
class EnvironmentVariables {
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsOptional()
  @IsInt()
  PORT?: number;

  @IsString()
  FRONTEND_URL: string;

  // Database
  @IsString()
  DB_HOST: string;

  @IsInt()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  // JWT — short secrets are a real security hole, so enforce a floor.
  @IsString()
  @MinLength(32, {
    message: 'JWT_ACCESS_SECRET must be at least 32 characters',
  })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET must be at least 32 characters',
  })
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES?: string;

  // Optional integrations — only validated for shape when present.
  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CALLBACK_URL?: string;

  @IsOptional()
  @IsString()
  TELEGRAM_BOT_TOKEN?: string;

  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(
      `Invalid environment configuration:\n  - ${messages}\n` +
        `Check your .env file against .env.example.`,
    );
  }

  // Production hardening: refuse to boot with leftover dev/localhost values or
  // well-known default credentials. These pass the shape checks above but would
  // be silent footguns in production (broken OAuth, open DB, forgeable tokens).
  if (validated.NODE_ENV === NodeEnv.production) {
    const problems: string[] = [];
    const DEV_HOSTS = ['localhost', '0.0.0.0', '127.0.0.1', '10.10.100.124'];

    const urlFields: Array<[string, string | undefined]> = [
      ['FRONTEND_URL', validated.FRONTEND_URL],
      ['GOOGLE_CALLBACK_URL', validated.GOOGLE_CALLBACK_URL],
      ['DOMAIN', config.DOMAIN as string | undefined],
    ];
    for (const [name, value] of urlFields) {
      if (value && DEV_HOSTS.some((h) => value.includes(h))) {
        problems.push(`${name} contains a dev/localhost host: ${value}`);
      }
    }

    if (validated.DB_PASSWORD === 'postgres') {
      problems.push(
        'DB_PASSWORD is the default "postgres" — set a strong value',
      );
    }
    if (validated.JWT_ACCESS_SECRET === validated.JWT_REFRESH_SECRET) {
      problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
    }

    const minio = [
      ['S3_ACCESS_KEY', config.S3_ACCESS_KEY],
      ['S3_SECRET_KEY', config.S3_SECRET_KEY],
    ] as const;
    for (const [name, value] of minio) {
      if (value === 'minioadmin') {
        problems.push(
          `${name} is the default "minioadmin" — set a strong value`,
        );
      }
    }

    if (config.ADMIN_PASSWORD === 'KJWlskalkspaokkajmn') {
      problems.push('ADMIN_PASSWORD is the hardcoded sample value — rotate it');
    }

    if (problems.length > 0) {
      throw new Error(
        `Refusing to start in production with unsafe configuration:\n  - ${problems.join(
          '\n  - ',
        )}\n` +
          `Fix these in the production .env (see .env.example) before deploying.`,
      );
    }
  }

  return validated;
}
