import { Listener } from '@sapphire/framework';
import { type Client, Events } from 'discord.js';
import { giveawayManager } from '../commands/giveaway.js';

export class ReadyListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: Events.ClientReady
    });
  }

  public async run(client: Client<true>) {
    this.container.logger.info(`Logged in as ${client.user.tag} (${client.guilds.cache.size} guilds)`);

    // Restore giveaway timers for active giveaways
    await giveawayManager.restoreTimers(client);

    // Purge old completed giveaways
    await giveawayManager.purgeOld();
  }
}
