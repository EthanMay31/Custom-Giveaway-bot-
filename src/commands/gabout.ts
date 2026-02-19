import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { COLORS } from '../lib/constants.js';

export class GAboutCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'gabout', description: 'Shows information about the bot' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('gabout').setDescription('Shows information about the bot')
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const client = this.container.client;
    const guildCount = client.guilds.cache.size;
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const embed = new EmbedBuilder()
      .setTitle('GiveawayBot')
      .setDescription('A feature-rich giveaway bot for Discord!')
      .setColor(COLORS.PRIMARY)
      .setThumbnail(client.user?.displayAvatarURL() ?? null)
      .addFields(
        { name: 'Servers', value: `${guildCount}`, inline: true },
        { name: 'Uptime', value: `${hours}h ${minutes}m`, inline: true },
        { name: 'Ping', value: `${client.ws.ping}ms`, inline: true }
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
