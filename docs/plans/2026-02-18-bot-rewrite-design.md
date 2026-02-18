# Fake Giveaway Bot - Full Rewrite Design

**Date:** 2026-02-18
**Status:** Approved

## Overview

Full rewrite of the Fake Giveaway Bot using TypeScript, Sapphire Framework, Prisma + PostgreSQL, and discord.js v14. Production-scale architecture with sharding support.

## Project Structure

```
src/
├── commands/
│   └── giveaway.ts                  # Subcommand class: create, edit, delete, list, reroll, reset, help
├── interaction-handlers/
│   ├── giveaway-enter.ts            # Button handler: enter giveaway
│   └── giveaway-leave.ts            # Button handler: leave giveaway
├── listeners/
│   ├── ready.ts                     # Bot ready + restore active giveaway timers
│   └── command-denied.ts            # Precondition denial handler
├── preconditions/
│   └── AdminOnly.ts                 # Checks for Manage Guild permission
├── services/
│   └── GiveawayManager.ts           # Business logic, timer management, embed building
├── lib/
│   ├── constants.ts                 # Embed colors, custom ID prefixes, limits
│   ├── env.ts                       # Zod-validated environment variables
│   ├── prisma.ts                    # Singleton Prisma client + container augmentation
│   └── setup.ts                     # Sapphire client config + intents
├── bot.ts                           # Shard entry point (SapphireClient login)
└── index.ts                         # ShardingManager entry point
prisma/
├── schema.prisma
└── migrations/
```

## Data Model

Single `Giveaway` table with `ended` boolean flag (replaces two separate tables):

- `id` (autoincrement PK)
- `guildId`, `channelId`, `messageId` (unique), `hostId`
- `name`, `winnersCount`, `actualWinnerIds[]`, `entries[]`
- `duration` (original string), `endsAt` (DateTime)
- `ping`, `ended` booleans
- Indexes on `guildId`, `ended`, `endsAt`

## Timer Management

- On create: store `endsAt` in DB + `setTimeout(endGiveaway, duration)`
- On restart: query active giveaways for this shard's guilds, restore timers
- Timer map: `Map<number, NodeJS.Timeout>` for cancel on edit/delete
- No external dependencies (no Redis/BullMQ)

## Key Improvements

- TypeScript with Sapphire Framework
- Prisma + PostgreSQL (production-scale)
- Sharding via ShardingManager
- DB-backed timer restoration on restart
- AdminOnly precondition on admin commands
- Stable button custom IDs (`giveaway-enter:{id}`)
- Zod env validation
- Proper `String[]` for entries/winners
- Single Giveaway table with `ended` flag

## Dependencies

- `@sapphire/framework`, `@sapphire/plugin-subcommands`, `@sapphire/decorators`
- `discord.js` v14, `@prisma/client`, `zod`, `ms`, `typescript`, `tsx`
