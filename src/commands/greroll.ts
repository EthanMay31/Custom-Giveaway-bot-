import { Command } from '@sapphire/framework';
import { ApplicationCommandType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { giveawayManager } from '../lib/giveaway-manager.js';

export class GRerollCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'greroll',
      description: 'Picks a new winner from the specified giveaway',
      preconditions: ['AdminOnly']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('greroll')
        .setDescription('Picks a new winner from the specified giveaway')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption((o) =>
          o.setName('giveaway_id').setDescription('The ID of the giveaway to reroll').setRequired(true)
        )
    );

    // Context menu command for right-click reroll
    registry.registerContextMenuCommand((builder) =>
      builder
        .setName('Reroll Giveaway')
        .setType(ApplicationCommandType.Message)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const id = interaction.options.getInteger('giveaway_id', true);

    try {
      await giveawayManager.reroll(id, interaction.guildId!);

      await interaction.reply({
        content: `Giveaway #${id} has been rerolled!`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      await interaction.reply({
        content: `Failed to reroll giveaway: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    const messageId = interaction.targetMessage.id;

    try {
      await giveawayManager.rerollByMessageId(messageId);

      await interaction.reply({
        content: 'Giveaway has been rerolled!',
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      await interaction.reply({
        content: `Failed to reroll: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}
