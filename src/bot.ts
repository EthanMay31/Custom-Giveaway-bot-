import './lib/setup.js';

import { execSync } from 'node:child_process';
import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { env } from './lib/env.js';

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  presence: {
    status: 'invisible'
  },
  loadDefaultErrorListeners: true,
  logger: {
    level: env.NODE_ENV === 'development' ? 20 : 30 // Debug in dev, Info in prod
  }
});

async function main() {
  try {
    client.logger.info('Running database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    client.logger.info('Migrations complete.');

    client.logger.info('Logging in...');
    await client.login(env.DISCORD_TOKEN);
  } catch (error) {
    client.logger.fatal(error);
    await client.destroy();
    process.exit(1);
  }
}

void main();
