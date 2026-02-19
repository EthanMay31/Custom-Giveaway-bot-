import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { COLORS } from '../lib/constants.js';

export class GHelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'ghelp', description: 'Shows the available commands' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('ghelp').setDescription('Shows the available commands')
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('GiveawayBot Commands')
      .setColor(COLORS.PRIMARY)
      .addFields(
        { name: '/ghelp', value: 'Shows the available commands.', inline: false },
        { name: '/gabout', value: 'Shows information about the bot.', inline: false },
        { name: '/ginvite', value: 'Shows a link to add the bot to your server.', inline: false },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '/gcreate', value: 'Creates a giveaway (interactive setup).', inline: false },
        {
          name: '/gstart `<time>` `<winners>` `<prize>`',
          value:
            'Starts a giveaway with the provided options. For example, `/gstart 30s 2 Steam Code` would start a 30-second giveaway for a Steam Code with 2 winners! To use minutes/hours/days instead of seconds, simply include an "m", "h", or "d" in the time.',
          inline: false
        },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '/gend `<giveaway_id>`', value: 'Ends the specified giveaway and picks winners immediately.', inline: false },
        { name: '/gdelete `<giveaway_id>`', value: 'Deletes the specified giveaway without picking winners.', inline: false },
        { name: '/glist', value: 'Lists all currently-running giveaways on the server.', inline: false },
        {
          name: '/greroll `<giveaway_id>`',
          value: 'Picks a new winner from the specified giveaway. You can also right-click on an ended giveaway and select Apps > Reroll Giveaway.',
          inline: false
        },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '/gsettings show', value: "Shows GiveawayBot's settings on the server.", inline: false },
        { name: '/gsettings set color `<hex_code>`', value: 'Sets the color of the embed used for giveaways.', inline: false },
        { name: '/gsettings set emoji `<emoji>`', value: 'Sets the emoji or text used on the button to enter giveaways.', inline: false }
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
