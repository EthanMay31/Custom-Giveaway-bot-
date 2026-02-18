# Fake Giveaway Bot Rewrite - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the Fake Giveaway Bot from scratch using TypeScript, Sapphire Framework, Prisma + PostgreSQL, and discord.js v14 with sharding support.

**Architecture:** Sapphire Framework provides class-based command/event/interaction handling with automatic file loading. A `GiveawayManager` service encapsulates all business logic and timer management. Prisma handles type-safe database access. A `ShardingManager` entry point spawns sharded bot instances that connect to a shared PostgreSQL database.

**Tech Stack:** TypeScript 5, discord.js 14, @sapphire/framework 5, @sapphire/plugin-subcommands 7, Prisma 6 + PostgreSQL, Zod 3, tsx (runtime)

**Note on testing:** Discord bots are inherently integration-heavy (they talk to the Discord API). The standard practice is type safety (TypeScript strict mode) + manual verification rather than mocked unit tests. Each task includes a verification step.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (overwrite existing)
- Create: `tsconfig.json`
- Modify: `.gitignore`
- Create: `.env.example`

**Step 1: Create package.json**

```json
{
  "name": "fake-giveaway-bot",
  "version": "2.0.0",
  "description": "A Discord bot that hosts giveaways with predetermined winners.",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "dev:bot": "tsx src/bot.ts",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "@sapphire/decorators": "^6.0.0",
    "@sapphire/discord.js-utilities": "^7.0.0",
    "@sapphire/framework": "^5.0.0",
    "@sapphire/plugin-subcommands": "^7.0.0",
    "discord.js": "^14.16.0",
    "ms": "^2.1.3",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/ms": "^2.1.0",
    "@types/node": "^22.0.0",
    "prisma": "^6.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Update .gitignore**

Append to existing .gitignore:
```
# Build output
dist/

# Prisma
prisma/*.db
prisma/*.db-journal
```

**Step 4: Create .env.example**

```env
# Discord Bot Token (from Discord Developer Portal)
DISCORD_TOKEN=your-bot-token-here

# Discord Application Client ID
CLIENT_ID=your-client-id-here

# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/giveaway_bot

# Node environment
NODE_ENV=development
```

**Step 5: Install dependencies**

Run: `npm install`
Expected: Clean install with no errors.

**Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore .env.example
git commit -m "chore: scaffold TypeScript project with Sapphire + Prisma deps"
```

---

### Task 2: Prisma Schema & Database Setup

**Files:**
- Create: `prisma/schema.prisma`

**Step 1: Create Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Giveaway {
  id              Int      @id @default(autoincrement())
  guildId         String
  channelId       String
  messageId       String   @unique
  name            String
  hostId          String
  winnersCount    Int
  actualWinnerIds String[]
  entries         String[]
  duration        String
  endsAt          DateTime
  ping            Boolean  @default(false)
  ended           Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([guildId])
  @@index([ended])
  @@index([endsAt])
  @@index([guildId, ended])
}
```

**Step 2: Generate Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" message.

**Step 3: Run initial migration (requires running PostgreSQL)**

Run: `npx prisma migrate dev --name init`
Expected: Migration created successfully.

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add Prisma schema with Giveaway model"
```

---

### Task 3: Core Library Files

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/constants.ts`
- Create: `src/lib/prisma.ts`
- Create: `src/lib/setup.ts`

**Step 1: Create environment validation (src/lib/env.ts)**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
```

**Step 2: Create constants (src/lib/constants.ts)**

```typescript
export const COLORS = {
  PRIMARY: 0x5865f2,
  SUCCESS: 0x57f287,
  DANGER: 0xed4245,
  ENDED: 0x2f3136
} as const;

export const CUSTOM_IDS = {
  GIVEAWAY_ENTER: 'giveaway-enter',
  GIVEAWAY_LEAVE: 'giveaway-leave'
} as const;

export const LIMITS = {
  MAX_WINNERS: 9,
  MIN_WINNERS: 1,
  PURGE_AFTER_DAYS: 7
} as const;

export const EMOJIS = {
  GIVEAWAY: '\uD83C\uDF89' // party popper
} as const;
```

**Step 3: Create Prisma singleton (src/lib/prisma.ts)**

```typescript
import { PrismaClient } from '@prisma/client';
import { container } from '@sapphire/framework';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

declare module '@sapphire/pieces' {
  interface Container {
    prisma: PrismaClient;
  }
}

container.prisma = prisma;
```

**Step 4: Create Sapphire setup (src/lib/setup.ts)**

This file is imported for side effects before anything else.

```typescript
import '@sapphire/plugin-subcommands/register';

import './env.js';
import './prisma.js';
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/lib/
git commit -m "feat: add core library files (env, constants, prisma, setup)"
```

---

### Task 4: GiveawayManager Service

**Files:**
- Create: `src/services/GiveawayManager.ts`

**Step 1: Create the service**

This is the core business logic class. It handles:
- Creating/editing/deleting giveaways (DB + Discord message)
- Building embeds
- Timer management (setTimeout with Map for cancellation)
- Ending giveaways (updating embed, announcing winners, moving to ended state)
- Restoring timers on restart
- Purging old completed giveaways

```typescript
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  type TextChannel
} from 'discord.js';
import { container } from '@sapphire/framework';
import { COLORS, CUSTOM_IDS, EMOJIS, LIMITS } from '../lib/constants.js';
import type { Giveaway } from '@prisma/client';

export class GiveawayManager {
  private timers = new Map<number, NodeJS.Timeout>();

  /**
   * Restore timers for all active giveaways belonging to guilds this shard can see.
   * Called on the `ready` event.
   */
  public async restoreTimers(client: Client<true>): Promise<void> {
    const guildIds = client.guilds.cache.map((g) => g.id);

    const activeGiveaways = await container.prisma.giveaway.findMany({
      where: {
        ended: false,
        guildId: { in: guildIds }
      }
    });

    const now = Date.now();

    for (const giveaway of activeGiveaways) {
      const remaining = giveaway.endsAt.getTime() - now;

      if (remaining <= 0) {
        // Already expired while bot was offline
        await this.endGiveaway(giveaway.id);
      } else {
        this.scheduleEnd(giveaway.id, remaining);
      }
    }

    container.logger.info(
      `Restored timers for ${activeGiveaways.length} active giveaways across ${guildIds.length} guilds.`
    );
  }

  /**
   * Create a new giveaway: send the embed, store in DB, schedule end.
   */
  public async create(options: {
    guildId: string;
    channelId: string;
    name: string;
    hostId: string;
    winnersCount: number;
    actualWinnerIds: string[];
    duration: string;
    durationMs: number;
    ping: boolean;
  }): Promise<Giveaway> {
    const channel = await container.client.channels.fetch(options.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error('Invalid text channel.');
    }

    const endsAt = new Date(Date.now() + options.durationMs);
    const embed = this.buildActiveEmbed({
      name: options.name,
      hostId: options.hostId,
      winnersCount: options.winnersCount,
      entriesCount: 0,
      endsAt
    });

    const row = this.buildEnterRow('pending'); // We'll update the custom ID after we have the DB id

    const message = await (channel as TextChannel).send({
      content: options.ping ? '@everyone' : undefined,
      embeds: [embed],
      components: [row]
    });

    const giveaway = await container.prisma.giveaway.create({
      data: {
        guildId: options.guildId,
        channelId: options.channelId,
        messageId: message.id,
        name: options.name,
        hostId: options.hostId,
        winnersCount: options.winnersCount,
        actualWinnerIds: options.actualWinnerIds,
        entries: [],
        duration: options.duration,
        endsAt,
        ping: options.ping
      }
    });

    // Update the button custom ID to use the real giveaway ID
    const updatedRow = this.buildEnterRow(giveaway.id.toString());
    await message.edit({ components: [updatedRow] });

    this.scheduleEnd(giveaway.id, options.durationMs);

    return giveaway;
  }

  /**
   * Edit an existing active giveaway.
   */
  public async edit(
    id: number,
    guildId: string,
    updates: {
      name?: string;
      channelId?: string;
      ping?: boolean;
      duration?: string;
      durationMs?: number;
      winnersCount?: number;
      actualWinnerIds?: string[];
    }
  ): Promise<Giveaway> {
    const giveaway = await container.prisma.giveaway.findFirst({
      where: { id, guildId, ended: false }
    });

    if (!giveaway) throw new Error('Active giveaway not found.');

    // Calculate new end time if duration changed
    const newEndsAt = updates.durationMs
      ? new Date(Date.now() + updates.durationMs)
      : giveaway.endsAt;

    const updated = await container.prisma.giveaway.update({
      where: { id },
      data: {
        name: updates.name ?? giveaway.name,
        channelId: updates.channelId ?? giveaway.channelId,
        ping: updates.ping ?? giveaway.ping,
        duration: updates.duration ?? giveaway.duration,
        winnersCount: updates.winnersCount ?? giveaway.winnersCount,
        actualWinnerIds: updates.actualWinnerIds ?? giveaway.actualWinnerIds,
        endsAt: newEndsAt
      }
    });

    // Delete old message, post new one
    try {
      const oldChannel = await container.client.channels.fetch(giveaway.channelId);
      if (oldChannel?.isTextBased()) {
        const oldMessage = await (oldChannel as TextChannel).messages.fetch(giveaway.messageId);
        await oldMessage.delete();
      }
    } catch {
      // Old message may already be deleted
    }

    const newChannel = await container.client.channels.fetch(updated.channelId);
    if (!newChannel || newChannel.type !== ChannelType.GuildText) {
      throw new Error('Invalid text channel.');
    }

    const embed = this.buildActiveEmbed({
      name: updated.name,
      hostId: updated.hostId,
      winnersCount: updated.winnersCount,
      entriesCount: updated.entries.length,
      endsAt: newEndsAt
    });

    const row = this.buildEnterRow(updated.id.toString());

    const newMessage = await (newChannel as TextChannel).send({
      content: updated.ping ? '@everyone' : undefined,
      embeds: [embed],
      components: [row]
    });

    await container.prisma.giveaway.update({
      where: { id },
      data: { messageId: newMessage.id }
    });

    // Reschedule timer
    this.cancelTimer(id);
    const remaining = newEndsAt.getTime() - Date.now();
    if (remaining > 0) {
      this.scheduleEnd(id, remaining);
    }

    return updated;
  }

  /**
   * Delete an active giveaway.
   */
  public async delete(id: number, guildId: string): Promise<Giveaway> {
    const giveaway = await container.prisma.giveaway.findFirst({
      where: { id, guildId, ended: false }
    });

    if (!giveaway) throw new Error('Active giveaway not found.');

    // Delete the Discord message
    try {
      const channel = await container.client.channels.fetch(giveaway.channelId);
      if (channel?.isTextBased()) {
        const message = await (channel as TextChannel).messages.fetch(giveaway.messageId);
        await message.delete();
      }
    } catch {
      // Message may already be deleted
    }

    this.cancelTimer(id);

    return container.prisma.giveaway.delete({ where: { id } });
  }

  /**
   * List giveaways for a guild.
   */
  public async list(guildId: string): Promise<{ active: Giveaway[]; ended: Giveaway[] }> {
    const [active, ended] = await Promise.all([
      container.prisma.giveaway.findMany({
        where: { guildId, ended: false },
        orderBy: { endsAt: 'asc' }
      }),
      container.prisma.giveaway.findMany({
        where: { guildId, ended: true },
        orderBy: { endsAt: 'desc' },
        take: 10
      })
    ]);

    return { active, ended };
  }

  /**
   * Add a user entry to a giveaway.
   */
  public async addEntry(giveawayId: number, userId: string): Promise<{ alreadyEntered: boolean; entriesCount: number }> {
    const giveaway = await container.prisma.giveaway.findUnique({
      where: { id: giveawayId }
    });

    if (!giveaway || giveaway.ended) throw new Error('Giveaway not found or already ended.');

    if (giveaway.entries.includes(userId)) {
      return { alreadyEntered: true, entriesCount: giveaway.entries.length };
    }

    const updated = await container.prisma.giveaway.update({
      where: { id: giveawayId },
      data: { entries: { push: userId } }
    });

    // Update the embed entry count
    await this.updateEntryCount(updated);

    return { alreadyEntered: false, entriesCount: updated.entries.length };
  }

  /**
   * Remove a user entry from a giveaway.
   */
  public async removeEntry(giveawayId: number, userId: string): Promise<{ wasEntered: boolean; entriesCount: number }> {
    const giveaway = await container.prisma.giveaway.findUnique({
      where: { id: giveawayId }
    });

    if (!giveaway || giveaway.ended) throw new Error('Giveaway not found or already ended.');

    if (!giveaway.entries.includes(userId)) {
      return { wasEntered: false, entriesCount: giveaway.entries.length };
    }

    const newEntries = giveaway.entries.filter((e) => e !== userId);

    const updated = await container.prisma.giveaway.update({
      where: { id: giveawayId },
      data: { entries: newEntries }
    });

    await this.updateEntryCount(updated);

    return { wasEntered: true, entriesCount: updated.entries.length };
  }

  /**
   * End a giveaway: update embed, announce winners, mark as ended.
   */
  public async endGiveaway(giveawayId: number): Promise<void> {
    const giveaway = await container.prisma.giveaway.findUnique({
      where: { id: giveawayId }
    });

    if (!giveaway || giveaway.ended) return;

    this.cancelTimer(giveawayId);

    // Mark as ended in DB
    await container.prisma.giveaway.update({
      where: { id: giveawayId },
      data: { ended: true }
    });

    try {
      const channel = await container.client.channels.fetch(giveaway.channelId);
      if (!channel?.isTextBased()) return;

      const textChannel = channel as TextChannel;
      const message = await textChannel.messages.fetch(giveaway.messageId);

      // Build ended embed
      const endedEmbed = this.buildEndedEmbed(giveaway);

      // Remove the enter button, keep no components (or add a link button)
      await message.edit({
        embeds: [endedEmbed],
        components: []
      });

      // Announce winners
      const winnerMentions = giveaway.actualWinnerIds.map((id) => `<@${id}>`).join(', ');
      await textChannel.send({
        content: `Congratulations ${winnerMentions}! You won the **${giveaway.name}**!`,
        reply: { messageReference: message.id }
      });
    } catch (error) {
      container.logger.error(`Failed to end giveaway ${giveawayId}: ${error}`);
    }
  }

  /**
   * Reroll a giveaway (re-announce winners).
   */
  public async reroll(id: number, guildId: string): Promise<void> {
    const giveaway = await container.prisma.giveaway.findFirst({
      where: { id, guildId }
    });

    if (!giveaway) throw new Error('Giveaway not found.');

    try {
      const channel = await container.client.channels.fetch(giveaway.channelId);
      if (!channel?.isTextBased()) throw new Error('Channel not found.');

      const textChannel = channel as TextChannel;
      const winnerMentions = giveaway.actualWinnerIds.map((id) => `<@${id}>`).join(', ');

      await textChannel.send({
        content: `\uD83C\uDF89 The giveaway for **${giveaway.name}** has been rerolled! New winners: ${winnerMentions}`
      });
    } catch (error) {
      throw new Error(`Failed to reroll giveaway: ${error}`);
    }
  }

  /**
   * Reset all giveaway data for a guild.
   */
  public async reset(guildId: string): Promise<number> {
    // Cancel all timers for this guild's active giveaways
    const activeGiveaways = await container.prisma.giveaway.findMany({
      where: { guildId, ended: false }
    });

    for (const g of activeGiveaways) {
      this.cancelTimer(g.id);
    }

    const result = await container.prisma.giveaway.deleteMany({
      where: { guildId }
    });

    return result.count;
  }

  /**
   * Purge completed giveaways older than PURGE_AFTER_DAYS.
   */
  public async purgeOld(): Promise<number> {
    const cutoff = new Date(Date.now() - LIMITS.PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);

    const result = await container.prisma.giveaway.deleteMany({
      where: {
        ended: true,
        endsAt: { lte: cutoff }
      }
    });

    if (result.count > 0) {
      container.logger.info(`Purged ${result.count} completed giveaways older than ${LIMITS.PURGE_AFTER_DAYS} days.`);
    }

    return result.count;
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private scheduleEnd(giveawayId: number, delayMs: number): void {
    // Cap setTimeout to ~24.8 days (max safe 32-bit int). For longer durations,
    // the ready event will re-schedule on restart.
    const MAX_TIMEOUT = 2_147_483_647;
    const capped = Math.min(delayMs, MAX_TIMEOUT);

    const timeout = setTimeout(async () => {
      await this.endGiveaway(giveawayId);
    }, capped);

    this.timers.set(giveawayId, timeout);
  }

  private cancelTimer(giveawayId: number): void {
    const timeout = this.timers.get(giveawayId);
    if (timeout) {
      clearTimeout(timeout);
      this.timers.delete(giveawayId);
    }
  }

  private async updateEntryCount(giveaway: Giveaway): Promise<void> {
    try {
      const channel = await container.client.channels.fetch(giveaway.channelId);
      if (!channel?.isTextBased()) return;

      const message = await (channel as TextChannel).messages.fetch(giveaway.messageId);
      const embed = message.embeds[0];
      if (!embed) return;

      const updatedEmbed = EmbedBuilder.from(embed).setDescription(
        embed.description?.replace(
          /Entries: \*\*\d+\*\*/,
          `Entries: **${giveaway.entries.length}**`
        ) ?? ''
      );

      await message.edit({ embeds: [updatedEmbed] });
    } catch {
      // Message may be deleted
    }
  }

  private buildActiveEmbed(options: {
    name: string;
    hostId: string;
    winnersCount: number;
    entriesCount: number;
    endsAt: Date;
  }): EmbedBuilder {
    const timestamp = Math.floor(options.endsAt.getTime() / 1000);

    return new EmbedBuilder()
      .setTitle(options.name)
      .setDescription(
        [
          `Ends: <t:${timestamp}:R> (<t:${timestamp}:f>)`,
          `Hosted by: <@${options.hostId}>`,
          `Entries: **${options.entriesCount}**`,
          `Winners: **${options.winnersCount}**`
        ].join('\n')
      )
      .setColor(COLORS.PRIMARY)
      .setTimestamp(options.endsAt);
  }

  private buildEndedEmbed(giveaway: Giveaway): EmbedBuilder {
    const timestamp = Math.floor(giveaway.endsAt.getTime() / 1000);
    const winnerMentions = giveaway.actualWinnerIds.map((id) => `<@${id}>`).join(', ');

    return new EmbedBuilder()
      .setTitle(giveaway.name)
      .setDescription(
        [
          `Ended: <t:${timestamp}:R> (<t:${timestamp}:f>)`,
          `Hosted by: <@${giveaway.hostId}>`,
          `Entries: **${giveaway.entries.length}**`,
          `Winners: ${winnerMentions}`
        ].join('\n')
      )
      .setColor(COLORS.ENDED)
      .setTimestamp(giveaway.endsAt);
  }

  private buildEnterRow(giveawayId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.GIVEAWAY_ENTER}:${giveawayId}`)
        .setEmoji(EMOJIS.GIVEAWAY)
        .setStyle(ButtonStyle.Primary)
    );
  }
}
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/services/
git commit -m "feat: add GiveawayManager service with full business logic"
```

---

### Task 5: AdminOnly Precondition

**Files:**
- Create: `src/preconditions/AdminOnly.ts`

**Step 1: Create precondition**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/preconditions/
git commit -m "feat: add AdminOnly precondition"
```

---

### Task 6: Giveaway Subcommand

**Files:**
- Create: `src/commands/giveaway.ts`

**Step 1: Create the subcommand class**

This uses `@sapphire/plugin-subcommands` to handle all `/giveaway <subcommand>` interactions in a single class.

```typescript
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import ms from 'ms';
import { GiveawayManager } from '../services/GiveawayManager.js';
import { COLORS, LIMITS } from '../lib/constants.js';

const giveawayManager = new GiveawayManager();

// Export for use in listeners (timer restoration)
export { giveawayManager };

function parseDuration(durationStr: string): number {
  const parts = durationStr.trim().split(/\s+/);
  let total = 0;

  for (const part of parts) {
    const parsed = ms(part);
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
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/commands/
git commit -m "feat: add giveaway subcommand with all operations"
```

---

### Task 7: Interaction Handlers (Buttons)

**Files:**
- Create: `src/interaction-handlers/giveaway-enter.ts`
- Create: `src/interaction-handlers/giveaway-leave.ts`

**Step 1: Create giveaway enter handler**

```typescript
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, type ButtonInteraction } from 'discord.js';
import { CUSTOM_IDS } from '../lib/constants.js';
import { giveawayManager } from '../commands/giveaway.js';

export class GiveawayEnterHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(`${CUSTOM_IDS.GIVEAWAY_ENTER}:`)) {
      return this.none();
    }

    const giveawayId = parseInt(interaction.customId.split(':')[1], 10);
    if (isNaN(giveawayId)) return this.none();

    return this.some({ giveawayId });
  }

  public async run(interaction: ButtonInteraction, data: { giveawayId: number }) {
    try {
      const result = await giveawayManager.addEntry(data.giveawayId, interaction.user.id);

      if (result.alreadyEntered) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`${CUSTOM_IDS.GIVEAWAY_LEAVE}:${data.giveawayId}`)
            .setLabel('Leave Giveaway')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          content: 'You have already entered this giveaway!',
          components: [row],
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferUpdate();
    } catch (error) {
      await interaction.reply({
        content: `Failed to enter giveaway: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}
```

**Step 2: Create giveaway leave handler**

```typescript
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { CUSTOM_IDS } from '../lib/constants.js';
import { giveawayManager } from '../commands/giveaway.js';

export class GiveawayLeaveHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith(`${CUSTOM_IDS.GIVEAWAY_LEAVE}:`)) {
      return this.none();
    }

    const giveawayId = parseInt(interaction.customId.split(':')[1], 10);
    if (isNaN(giveawayId)) return this.none();

    return this.some({ giveawayId });
  }

  public async run(interaction: ButtonInteraction, data: { giveawayId: number }) {
    try {
      const result = await giveawayManager.removeEntry(data.giveawayId, interaction.user.id);

      if (!result.wasEntered) {
        return interaction.reply({
          content: 'You are not entered in this giveaway!',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.update({
        content: 'You have left the giveaway.',
        components: []
      });
    } catch (error) {
      await interaction.reply({
        content: `Failed to leave giveaway: ${error}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}
```

**Step 3: Commit**

```bash
git add src/interaction-handlers/
git commit -m "feat: add button interaction handlers for giveaway enter/leave"
```

---

### Task 8: Event Listeners

**Files:**
- Create: `src/listeners/ready.ts`
- Create: `src/listeners/command-denied.ts`

**Step 1: Create ready listener**

```typescript
import { Listener } from '@sapphire/framework';
import { type Client, Events } from 'discord.js';
import { giveawayManager } from '../commands/giveaway.js';

export class ReadyListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: Events.ClientReady
    });
  }

  public async run(client: Client<true>) {
    this.container.logger.info(`Logged in as ${client.user.tag} (${client.guilds.cache.size} guilds)`);

    // Restore giveaway timers for active giveaways
    await giveawayManager.restoreTimers(client);

    // Purge old completed giveaways
    await giveawayManager.purgeOld();
  }
}
```

**Step 2: Create command denied listener**

```typescript
import { Events, Listener, type ChatInputCommandDeniedPayload, type UserError } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';

export class ChatInputCommandDenied extends Listener<typeof Events.ChatInputCommandDenied> {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.ChatInputCommandDenied
    });
  }

  public run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({ content: error.message });
    }

    return interaction.reply({
      content: error.message,
      flags: MessageFlags.Ephemeral
    });
  }
}
```

**Step 3: Commit**

```bash
git add src/listeners/
git commit -m "feat: add ready and command-denied listeners"
```

---

### Task 9: Entry Points (Bot + Sharding Manager)

**Files:**
- Create: `src/bot.ts`
- Create: `src/index.ts`

**Step 1: Create bot.ts (per-shard entry point)**

```typescript
import './lib/setup.js';

import { SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import { env } from './lib/env.js';

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  loadDefaultErrorListeners: true,
  logger: {
    level: env.NODE_ENV === 'development' ? 20 : 30 // Debug in dev, Info in prod
  }
});

async function main() {
  try {
    client.logger.info('Logging in...');
    await client.login(env.DISCORD_TOKEN);
  } catch (error) {
    client.logger.fatal(error);
    await client.destroy();
    process.exit(1);
  }
}

void main();
```

**Step 2: Create index.ts (sharding manager entry point)**

```typescript
import { ShardingManager } from 'discord.js';
import { env } from './lib/env.js';

const manager = new ShardingManager('./dist/bot.js', {
  token: env.DISCORD_TOKEN,
  totalShards: 'auto'
});

manager.on('shardCreate', (shard) => {
  console.log(`[ShardManager] Launched shard ${shard.id}`);

  shard.on('death', () => {
    console.error(`[ShardManager] Shard ${shard.id} died. It will be respawned automatically.`);
  });
});

manager.spawn().catch((error) => {
  console.error('[ShardManager] Failed to spawn shards:', error);
  process.exit(1);
});
```

**Step 3: Verify full compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/bot.ts src/index.ts
git commit -m "feat: add bot and sharding manager entry points"
```

---

### Task 10: Clean Up Old Files

**Files:**
- Delete: `bot.js`
- Delete: `run.js`
- Delete: `modules/giveaway.js`
- Delete: `utils/database.js`
- Delete: `utils/logger.js`

**Step 1: Remove old source files**

```bash
rm bot.js run.js
rm -rf modules/ utils/
```

**Step 2: Verify no old files remain**

Run: `ls *.js modules/ utils/`
Expected: Files not found (confirms deletion).

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old JavaScript source files"
```

---

### Task 11: Update README and .env.example

**Files:**
- Modify: `README.md`

**Step 1: Update README.md**

```markdown
# Fake Giveaway Bot

A Discord bot that hosts giveaways with predetermined winners. Built with TypeScript, Sapphire Framework, and Prisma.

## Features

- `/giveaway create` - Create giveaways with predetermined winners
- `/giveaway edit` - Edit active giveaways
- `/giveaway delete` - Delete active giveaways
- `/giveaway list` - List all active and recently ended giveaways
- `/giveaway reroll` - Re-announce giveaway winners
- `/giveaway reset` - Clear all giveaway data for a server
- `/giveaway help` - Show help message

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5
- **Framework:** [Sapphire](https://sapphirejs.dev/) + [discord.js](https://discord.js.org/) v14
- **Database:** PostgreSQL via [Prisma](https://www.prisma.io/)
- **Sharding:** Built-in via discord.js ShardingManager

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Discord bot token ([Developer Portal](https://discord.com/developers/applications))

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
4. Run database migrations:
   ```bash
   npm run db:migrate
   ```

### Development

Run a single bot instance (no sharding):
```bash
npm run dev:bot
```

### Production

Build and run with sharding:
```bash
npm run build
npm start
```

Or use PM2:
```bash
pm2 start dist/index.js --name giveaway-bot
```

## Project Structure

```
src/
├── commands/              # Slash command handlers
├── interaction-handlers/  # Button interaction handlers
├── listeners/             # Event listeners
├── preconditions/         # Command preconditions
├── services/              # Business logic
├── lib/                   # Shared utilities and config
├── bot.ts                 # Per-shard entry point
└── index.ts               # Sharding manager entry point
```

## License

See [LICENSE](LICENSE) for details.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for v2 rewrite"
```

---

### Task 12: Build & Verify

**Step 1: Full TypeScript build**

Run: `npm run build`
Expected: Compiles to `dist/` with no errors.

**Step 2: Verify dist output**

Run: `ls dist/`
Expected: `bot.js`, `index.js`, and all subdirectories matching `src/`.

**Step 3: Verify .env is configured**

Ensure `.env` file exists with valid values for `DISCORD_TOKEN`, `CLIENT_ID`, `DATABASE_URL`.

**Step 4: Run database migration**

Run: `npm run db:migrate`
Expected: Migration applied successfully.

**Step 5: Start in development mode**

Run: `npm run dev:bot`
Expected: Bot logs in, reports guild count, restores timers (0 on fresh DB), and registers slash commands.

**Step 6: Test in Discord**

Manual verification checklist:
- [ ] `/giveaway help` shows help embed
- [ ] `/giveaway create` creates a giveaway with enter button
- [ ] Clicking the enter button adds an entry and updates the count
- [ ] Clicking enter again shows "already entered" with leave button
- [ ] Clicking leave button removes entry and updates count
- [ ] `/giveaway list` shows the active giveaway
- [ ] `/giveaway edit` updates the giveaway
- [ ] `/giveaway reroll` re-announces winners
- [ ] `/giveaway delete` removes the giveaway
- [ ] `/giveaway reset` clears all data
- [ ] Giveaway auto-ends after duration expires
- [ ] Non-admin users cannot use commands

**Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete v2 rewrite with TypeScript, Sapphire, Prisma"
```
