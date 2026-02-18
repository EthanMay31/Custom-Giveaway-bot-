import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, type ButtonInteraction } from 'discord.js';
import { CUSTOM_IDS } from '../lib/constants.js';
import { giveawayManager } from '../commands/giveaway.js';

export class GiveawayEnterHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(`${CUSTOM_IDS.GIVEAWAY_ENTER}:`)) {
      return this.none();
    }

    const giveawayId = parseInt(interaction.customId.split(':')[1], 10);
    if (isNaN(giveawayId)) return this.none();

    return this.some({ giveawayId });
  }

  public async run(interaction: ButtonInteraction, data: { giveawayId: number }) {
    try {
      const result = await giveawayManager.addEntry(data.giveawayId, interaction.user.id);

      if (result.alreadyEntered) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`${CUSTOM_IDS.GIVEAWAY_LEAVE}:${data.giveawayId}`)
            .setLabel('Leave Giveaway')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          content: 'You have already entered this giveaway!',
          components: [row],
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferUpdate();
    } catch (error) {
      await interaction.reply({
        content: `Failed to enter giveaway: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}
