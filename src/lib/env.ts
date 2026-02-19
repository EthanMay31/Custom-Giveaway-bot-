import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

// Load .env file if it exists (for local dev / non-Docker runs)
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  const { config } = await import('dotenv');
  config({ path: envPath });
}

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(z.treeifyError(result.error));
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
