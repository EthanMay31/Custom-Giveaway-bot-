import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { giveawayManager } from '../lib/giveaway-manager.js';

export class GDeleteCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'gdelete',
      description: 'Deletes a giveaway without picking winners',
      preconditions: ['AdminOnly']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('gdelete')
        .setDescription('Deletes a giveaway without picking winners')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption((o) =>
          o.setName('giveaway_id').setDescription('The ID of the giveaway to delete').setRequired(true)
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const id = interaction.options.getInteger('giveaway_id', true);

    try {
      const giveaway = await giveawayManager.delete(id, interaction.guildId!);

      await interaction.reply({
        content: `Giveaway **${giveaway.name}** deleted successfully!`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      await interaction.reply({
        content: `Failed to delete giveaway: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}
