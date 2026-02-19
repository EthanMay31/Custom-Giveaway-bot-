import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { CUSTOM_IDS } from '../lib/constants.js';
import { giveawayManager } from '../lib/giveaway-manager.js';

export class GiveawayLeaveHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(`${CUSTOM_IDS.GIVEAWAY_LEAVE}:`)) {
      return this.none();
    }

    const giveawayId = parseInt(interaction.customId.split(':')[1], 10);
    if (isNaN(giveawayId)) return this.none();

    return this.some({ giveawayId });
  }

  public async run(interaction: ButtonInteraction, data: { giveawayId: number }) {
    try {
      const result = await giveawayManager.removeEntry(data.giveawayId, interaction.user.id);

      if (!result.wasEntered) {
        return interaction.reply({
          content: 'You are not entered in this giveaway!',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.update({
        content: 'You have left the giveaway.',
        components: []
      });
    } catch (error) {
      await interaction.reply({
        content: `Failed to leave giveaway: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}
