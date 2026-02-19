import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { COLORS } from '../lib/constants.js';
import { giveawayManager } from '../lib/giveaway-manager.js';

export class GListCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'glist',
      description: 'Lists all currently-running giveaways on the server',
      preconditions: ['AdminOnly']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('glist')
        .setDescription('Lists all currently-running giveaways on the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    try {
      const { active, ended } = await giveawayManager.list(interaction.guildId!);
      const guildId = interaction.guildId!;

      const embed = new EmbedBuilder().setTitle('Giveaway List').setColor(COLORS.PRIMARY);

      if (active.length > 0) {
        embed.addFields({ name: '**Active Giveaways**', value: '\u200B', inline: false });
        for (const g of active) {
          const ts = Math.floor(g.endsAt.getTime() / 1000);
          const link = `https://discord.com/channels/${guildId}/${g.channelId}/${g.messageId}`;
          embed.addFields(
            { name: 'ID', value: `${g.id}`, inline: true },
            { name: 'Name', value: `[${g.name}](${link})`, inline: true },
            { name: 'Ends', value: `<t:${ts}:R> (<t:${ts}:f>)`, inline: true }
          );
        }
      } else {
        embed.addFields({ name: 'Active Giveaways', value: 'No active giveaways.', inline: false });
      }

      if (ended.length > 0) {
        embed.addFields({ name: '**Ended Giveaways**', value: '\u200B', inline: false });
        for (const g of ended) {
          const ts = Math.floor(g.endsAt.getTime() / 1000);
          const link = `https://discord.com/channels/${guildId}/${g.channelId}/${g.messageId}`;
          embed.addFields(
            { name: 'ID', value: `${g.id}`, inline: true },
            { name: 'Name', value: `[${g.name}](${link})`, inline: true },
            { name: 'Ended', value: `<t:${ts}:R> (<t:${ts}:f>)`, inline: true }
          );
        }
      } else {
        embed.addFields({ name: 'Ended Giveaways', value: 'No ended giveaways.', inline: false });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      await interaction.reply({
        content: `Failed to list giveaways: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}
