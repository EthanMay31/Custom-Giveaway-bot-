import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { COLORS, EMOJIS } from '../lib/constants.js';
import { giveawayManager } from '../lib/giveaway-manager.js';

@ApplyOptions<Subcommand.Options>({
  name: 'gsettings',
  description: "GiveawayBot's settings",
  preconditions: ['AdminOnly'],
  subcommands: [
    { name: 'show', chatInputRun: 'chatInputShow' },
    {
      name: 'set',
      type: 'group',
      entries: [
        { name: 'color', chatInputRun: 'chatInputSetColor' },
        { name: 'emoji', chatInputRun: 'chatInputSetEmoji' }
      ]
    }
  ]
})
export class GSettingsCommand extends Subcommand {
  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('gsettings')
        .setDescription("GiveawayBot's settings")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
          sub.setName('show').setDescription("Shows GiveawayBot's settings on the server")
        )
        .addSubcommandGroup((group) =>
          group
            .setName('set')
            .setDescription('Change a setting')
            .addSubcommand((sub) =>
              sub
                .setName('color')
                .setDescription('Sets the color of the embed used for giveaways')
                .addStringOption((o) =>
                  o
                    .setName('hex_code')
                    .setDescription('Hex color code (e.g. #FF0000)')
                    .setRequired(true)
                )
            )
            .addSubcommand((sub) =>
              sub
                .setName('emoji')
                .setDescription('Sets the emoji or text used on the button to enter giveaways')
                .addStringOption((o) =>
                  o
                    .setName('emoji')
                    .setDescription('Emoji for the enter button')
                    .setRequired(true)
                )
            )
        )
    );
  }

  public async chatInputShow(interaction: Subcommand.ChatInputCommandInteraction) {
    const settings = await giveawayManager.getRawSettings(interaction.guildId!);

    const color = settings?.color ?? '#5865F2';
    const emoji = settings?.emoji ?? EMOJIS.GIVEAWAY;
    const colorInt = parseInt(color.replace('#', ''), 16);

    const embed = new EmbedBuilder()
      .setTitle('GiveawayBot Settings')
      .setColor(colorInt)
      .addFields(
        { name: 'Color', value: `\`${color}\``, inline: true },
        { name: 'Emoji', value: emoji, inline: true },
        { name: 'Locale', value: `\`${interaction.locale}\``, inline: true }
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  public async chatInputSetColor(interaction: Subcommand.ChatInputCommandInteraction) {
    const hexCode = interaction.options.getString('hex_code', true).trim();

    // Validate hex color
    const hexRegex = /^#?([0-9a-fA-F]{6})$/;
    const match = hexCode.match(hexRegex);

    if (!match) {
      return interaction.reply({
        content: 'Invalid hex color code. Use a format like `#FF0000` or `FF0000`.',
        flags: MessageFlags.Ephemeral
      });
    }

    const normalizedHex = `#${match[1].toUpperCase()}`;

    try {
      await giveawayManager.setColor(interaction.guildId!, normalizedHex);

      const embed = new EmbedBuilder()
        .setDescription(`Giveaway embed color updated to \`${normalizedHex}\``)
        .setColor(parseInt(match[1], 16));

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      await interaction.reply({
        content: `Failed to update color: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  public async chatInputSetEmoji(interaction: Subcommand.ChatInputCommandInteraction) {
    const emoji = interaction.options.getString('emoji', true).trim();

    try {
      await giveawayManager.setEmoji(interaction.guildId!, emoji);

      await interaction.reply({
        content: `Giveaway button emoji updated to ${emoji}`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      await interaction.reply({
        content: `Failed to update emoji: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}
