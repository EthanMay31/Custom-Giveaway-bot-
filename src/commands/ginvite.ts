import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags, OAuth2Scopes, PermissionFlagsBits } from 'discord.js';
import { COLORS } from '../lib/constants.js';

export class GInviteCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'ginvite', description: 'Shows a link to add the bot to your server' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('ginvite').setDescription('Shows a link to add the bot to your server')
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const invite = this.container.client.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ViewChannel
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('Invite GiveawayBot')
      .setDescription(`[Click here to add GiveawayBot to your server!](${invite})`)
      .setColor(COLORS.PRIMARY);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
