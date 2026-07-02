import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralized, validated environment configuration.
 * The app refuses to boot with an invalid/missing config instead of failing
 * mysteriously deep inside a request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Comma-separated list of allowed origins, or "*" for all.
  CORS_ORIGIN: z.string().default('*'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  corsOrigins: raw.CORS_ORIGIN === '*' ? '*' : raw.CORS_ORIGIN.split(',').map((s) => s.trim()),
};

// Guard against shipping an insecure default secret to production.
if (env.isProduction && env.JWT_SECRET.length < 24) {
  // eslint-disable-next-line no-console
  console.error('❌ JWT_SECRET must be at least 24 characters in production.');
  process.exit(1);
}

export type Env = typeof env;
