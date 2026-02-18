import { Precondition } from '@sapphire/framework';
import { type ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';

export class AdminOnlyPrecondition extends Precondition {
  public override chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return this.error({ message: 'You need the **Manage Server** permission to use this command.' });
    }

    return this.ok();
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    AdminOnly: never;
  }
}
