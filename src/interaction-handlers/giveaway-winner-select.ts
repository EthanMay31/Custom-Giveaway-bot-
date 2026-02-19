import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type UserSelectMenuInteraction } from 'discord.js';
import { CUSTOM_IDS } from '../lib/constants.js';
import { giveawayManager } from '../lib/giveaway-manager.js';
import { pendingGiveaways } from '../lib/pending-giveaways.js';

export class GiveawayWinnerSelectHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu
    });
  }

  public override parse(interaction: UserSelectMenuInteraction) {
    if (!interaction.customId.startsWith(`${CUSTOM_IDS.GIVEAWAY_WINNER_SELECT}:`)) {
      return this.none();
    }

    const pendingId = interaction.customId.split(':')[1];
    return this.some({ pendingId });
  }

  public async run(interaction: UserSelectMenuInteraction, data: { pendingId: string }) {
    const pending = pendingGiveaways.get(data.pendingId);

    if (!pending) {
      return interaction.update({
        content: 'This giveaway setup has expired. Please run the command again.',
        components: []
      });
    }

    const selectedUserIds = interaction.values;

    if (selectedUserIds.length !== pending.winnersCount) {
      return interaction.reply({
        content: `Please select exactly **${pending.winnersCount}** winner(s).`,
        flags: MessageFlags.Ephemeral
      });
    }

    pendingGiveaways.delete(data.pendingId);

    try {
      await giveawayManager.create({
        ...pending,
        actualWinnerIds: selectedUserIds
      });

      await interaction.update({
        content: `Giveaway **${pending.name}** created successfully!`,
        components: []
      });
    } catch (error) {
      await interaction.update({
        content: `Failed to create giveaway: ${error}`,
        components: []
      });
    }
  }
}
