import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import ms, { type StringValue } from 'ms';
import { GiveawayManager } from '../services/GiveawayManager.js';
import { COLORS, LIMITS } from '../lib/constants.js';

const giveawayManager = new GiveawayManager();

// Export for use in listeners (timer restoration)
export { giveawayManager };

function parseDuration(durationStr: string): number {
  const parts = durationStr.trim().split(/\s+/);
  let total = 0;

  for (const part of parts) {
    const parsed = ms(part as StringValue);
    if (parsed) total += parsed;
  }

  return total;
}

@ApplyOptions<Subcommand.Options>({
  name: 'giveaway',
  description: 'Manage giveaways',
  preconditions: ['AdminOnly'],
  subcommands: [
    { name: 'help', chatInputRun: 'chatInputHelp' },
    { name: 'create', chatInputRun: 'chatInputCreate' },
    { name: 'edit', chatInputRun: 'chatInputEdit' },
    { name: 'delete', chatInputRun: 'chatInputDelete' },
    { name: 'list', chatInputRun: 'chatInputList' },
    { name: 'reroll', chatInputRun: 'chatInputReroll' },
    { name: 'reset', chatInputRun: 'chatInputReset' }
  ]
})
export class GiveawayCommand extends Subcommand {
  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
          sub.setName('help').setDescription('Get help with giveaway commands')
        )
        .addSubcommand((sub) =>
          sub
            .setName('create')
            .setDescription('Create a new giveaway')
            .addStringOption((o) => o.setName('name').setDescription('Name of the giveaway').setRequired(true))
            .addChannelOption((o) => o.setName('channel').setDescription('Channel to post the giveaway in').setRequired(true))
            .addStringOption((o) => o.setName('duration').setDescription('Duration (e.g., 1d 12h 30m)').setRequired(true))
            .addIntegerOption((o) =>
              o.setName('winners').setDescription('Number of winners (1-9)').setRequired(true).setMinValue(1).setMaxValue(9)
            )
            .addUserOption((o) => o.setName('actual_winner1').setDescription('Predetermined winner 1').setRequired(true))
            .addUserOption((o) => o.setName('actual_winner2').setDescription('Predetermined winner 2').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner3').setDescription('Predetermined winner 3').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner4').setDescription('Predetermined winner 4').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner5').setDescription('Predetermined winner 5').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner6').setDescription('Predetermined winner 6').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner7').setDescription('Predetermined winner 7').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner8').setDescription('Predetermined winner 8').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner9').setDescription('Predetermined winner 9').setRequired(false))
            .addBooleanOption((o) => o.setName('ping').setDescription('Ping @everyone').setRequired(false))
        )
        .addSubcommand((sub) =>
          sub
            .setName('edit')
            .setDescription('Edit an existing giveaway')
            .addIntegerOption((o) => o.setName('id').setDescription('Giveaway ID').setRequired(true))
            .addStringOption((o) => o.setName('name').setDescription('New name').setRequired(false))
            .addChannelOption((o) => o.setName('channel').setDescription('New channel').setRequired(false))
            .addStringOption((o) => o.setName('duration').setDescription('New duration (e.g., 1d 12h 30m)').setRequired(false))
            .addIntegerOption((o) =>
              o.setName('winners').setDescription('New number of winners (1-9)').setRequired(false).setMinValue(1).setMaxValue(9)
            )
            .addUserOption((o) => o.setName('actual_winner1').setDescription('Predetermined winner 1').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner2').setDescription('Predetermined winner 2').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner3').setDescription('Predetermined winner 3').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner4').setDescription('Predetermined winner 4').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner5').setDescription('Predetermined winner 5').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner6').setDescription('Predetermined winner 6').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner7').setDescription('Predetermined winner 7').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner8').setDescription('Predetermined winner 8').setRequired(false))
            .addUserOption((o) => o.setName('actual_winner9').setDescription('Predetermined winner 9').setRequired(false))
            .addBooleanOption((o) => o.setName('ping').setDescription('Ping @everyone').setRequired(false))
        )
        .addSubcommand((sub) =>
          sub
            .setName('delete')
            .setDescription('Delete a giveaway')
            .addIntegerOption((o) => o.setName('id').setDescription('Giveaway ID').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('List all giveaways'))
        .addSubcommand((sub) =>
          sub
            .setName('reroll')
            .setDescription('Reroll a giveaway')
            .addIntegerOption((o) => o.setName('id').setDescription('Giveaway ID').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('reset').setDescription('Clear all giveaway data for this server'))
    );
  }

  public async chatInputHelp(interaction: Subcommand.ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('Giveaway Bot Commands')
      .setDescription('Here are the commands you can use:')
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: '/giveaway create', value: 'Create a new giveaway with predetermined winners.', inline: false },
        { name: '/giveaway edit', value: 'Edit an existing active giveaway by ID.', inline: false },
        { name: '/giveaway delete', value: 'Delete an active giveaway by ID.', inline: false },
        { name: '/giveaway list', value: 'List all active and recently ended giveaways.', inline: false },
        { name: '/giveaway reroll', value: 'Re-announce the winners of a giveaway.', inline: false },
        { name: '/giveaway reset', value: 'Clear all giveaway data for this server.', inline: false },
        { name: '/giveaway help', value: 'Show this help message.', inline: false }
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  public async chatInputCreate(interaction: Subcommand.ChatInputCommandInteraction) {
    const name = interaction.options.getString('name', true);
    const channel = interaction.options.getChannel('channel', true);
    const durationStr = interaction.options.getString('duration', true);
    const winnersCount = interaction.options.getInteger('winners', true);
    const ping = interaction.options.getBoolean('ping') ?? false;

    const durationMs = parseDuration(durationStr);
    if (durationMs <= 0) {
      return interaction.reply({
        content: 'Invalid duration. Use formats like `1d`, `12h`, `30m`, or `1d 12h 30m`.',
        flags: MessageFlags.Ephemeral
      });
    }

    const actualWinnerIds: string[] = [];
    for (let i = 1; i <= winnersCount; i++) {
      const winner = interaction.options.getUser(`actual_winner${i}`);
      if (winner) actualWinnerIds.push(winner.id);
    }

    if (actualWinnerIds.length !== winnersCount) {
      return interaction.reply({
        content: `Please specify exactly ${winnersCount} predetermined winner(s).`,
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await giveawayManager.create({
        guildId: interaction.guildId!,
        channelId: channel.id,
        name,
        hostId: interaction.user.id,
        winnersCount,
        actualWinnerIds,
        duration: durationStr,
        durationMs,
        ping
      });

      await interaction.reply({
        content: `Giveaway **${name}** created successfully!`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      await interaction.reply({
        content: `Failed to create giveaway: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  public async chatInputEdit(interaction: Subcommand.ChatInputCommandInteraction) {
    const id = interaction.options.getInteger('id', true);
    const name = interaction.options.getString('name') ?? undefined;
    const channel = interaction.options.getChannel('channel');
    const durationStr = interaction.options.getString('duration');
    const winnersCount = interaction.options.getInteger('winners') ?? undefined;
    const ping = interaction.options.getBoolean('ping') ?? undefined;

    let durationMs: number | undefined;
    if (durationStr) {
      durationMs = parseDuration(durationStr);
      if (durationMs <= 0) {
        return interaction.reply({
          content: 'Invalid duration format.',
          flags: MessageFlags.Ephemeral
        });
      }
    }

    let actualWinnerIds: string[] | undefined;
    if (winnersCount !== undefined) {
      actualWinnerIds = [];
      for (let i = 1; i <= winnersCount; i++) {
        const winner = interaction.options.getUser(`actual_winner${i}`);
        if (winner) actualWinnerIds.push(winner.id);
      }

      if (actualWinnerIds.length !== winnersCount) {
        return interaction.reply({
          content: `Please specify exactly ${winnersCount} predetermined winner(s).`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    try {
      const updated = await giveawayManager.edit(id, interaction.guildId!, {
        name,
        channelId: channel?.id,
        ping,
        duration: durationStr ?? undefined,
        durationMs,
        winnersCount,
        actualWinnerIds
      });

      await interaction.reply({
        content: `Giveaway **${updated.name}** edited successfully!`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      await interaction.reply({
        content: `Failed to edit giveaway: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  public async chatInputDelete(interaction: Subcommand.ChatInputCommandInteraction) {
    const id = interaction.options.getInteger('id', true);

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

  public async chatInputList(interaction: Subcommand.ChatInputCommandInteraction) {
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

  public async chatInputReroll(interaction: Subcommand.ChatInputCommandInteraction) {
    const id = interaction.options.getInteger('id', true);

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

  public async chatInputReset(interaction: Subcommand.ChatInputCommandInteraction) {
    try {
      const count = await giveawayManager.reset(interaction.guildId!);

      await interaction.reply({
        content: `Cleared ${count} giveaway(s) for this server.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      await interaction.reply({
        content: `Failed to reset giveaways: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}
