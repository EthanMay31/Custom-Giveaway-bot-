import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { giveawayManager } from '../lib/giveaway-manager.js';

export class GEndCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'gend',
      description: 'Ends a giveaway and picks winners immediately',
      preconditions: ['AdminOnly']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('gend')
        .setDescription('Ends a giveaway and picks winners immediately')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption((o) =>
          o.setName('giveaway_id').setDescription('The ID of the giveaway to end').setRequired(true)
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const id = interaction.options.getInteger('giveaway_id', true);

    try {
      const giveaway = await giveawayManager.end(id, interaction.guildId!);

      await interaction.reply({
        content: `Giveaway **${giveaway.name}** has been ended!`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      await interaction.reply({
        content: `Failed to end giveaway: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}
