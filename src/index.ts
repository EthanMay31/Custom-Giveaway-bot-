import { ShardingManager } from 'discord.js';
import { env } from './lib/env.js';

const manager = new ShardingManager('./dist/bot.js', {
  token: env.DISCORD_TOKEN,
  totalShards: 'auto'
});

manager.on('shardCreate', (shard) => {
  console.log(`[ShardManager] Launched shard ${shard.id}`);

  shard.on('death', () => {
    console.error(`[ShardManager] Shard ${shard.id} died. It will be respawned automatically.`);
  });
});

manager.spawn().catch((error) => {
  console.error('[ShardManager] Failed to spawn shards:', error);
  process.exit(1);
});
