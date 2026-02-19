# Fake Giveaway Bot

A Discord bot that mimics [GiveawayBot](https://giveawaybot.party/) but with predetermined winners. Uses identical slash commands so it looks legitimate to server members. Built with TypeScript, Sapphire Framework, and Prisma.

## Features

- Matches real GiveawayBot command names (`/gstart`, `/gcreate`, `/gend`, etc.)
- Predetermined winners are selected privately after running a command — other users only see normal-looking giveaway setup
- No online presence indicator — the bot sits in the server without showing a green/idle/DND dot
- Per-server customizable embed color and button emoji
- Right-click context menu to reroll giveaways
- Automatic timer restoration on restart

## Commands

### General

| Command | Description |
|---------|-------------|
| `/ghelp` | Shows the available commands |
| `/gabout` | Shows information about the bot |
| `/ginvite` | Shows a link to add the bot to your server |

### Giveaway Management

| Command | Description |
|---------|-------------|
| `/gcreate` | Creates a giveaway via interactive modal setup |
| `/gstart <time> <winners> <prize>` | Quick-starts a giveaway (e.g. `/gstart 30s 2 Steam Code`) |
| `/gend <giveaway_id>` | Ends a running giveaway and picks winners immediately |
| `/gdelete <giveaway_id>` | Deletes a giveaway without picking winners |
| `/glist` | Lists all currently-running giveaways on the server |
| `/greroll <giveaway_id>` | Re-announces winners for a giveaway |

For `/gstart` time values, use `s` for seconds, `m` for minutes, `h` for hours, `d` for days (e.g. `30s`, `5m`, `1h`, `2d`).

You can also right-click (or long-press on mobile) on an ended giveaway message and select **Apps > Reroll Giveaway**.

### Settings

| Command | Description |
|---------|-------------|
| `/gsettings show` | Shows GiveawayBot's settings on the server |
| `/gsettings set color <hex_code>` | Sets the embed color for giveaways |
| `/gsettings set emoji <emoji>` | Sets the emoji on the enter button |

## How It Works

1. An admin runs `/gstart` or `/gcreate` — the slash command looks identical to the real GiveawayBot
2. The bot privately (ephemeral) asks the admin to select the predetermined winner(s)
3. A normal-looking giveaway embed is posted in the channel with an enter button
4. Users enter by clicking the button — entries are tracked but don't affect the outcome
5. When the timer ends, the predetermined winners are announced

## Tech Stack

- **Runtime:** Node.js 22+
- **Language:** TypeScript 5
- **Framework:** [Sapphire](https://sapphirejs.dev/) + [discord.js](https://discord.js.org/) v14
- **Database:** PostgreSQL 16 via [Prisma](https://www.prisma.io/)
- **Sharding:** Built-in via discord.js ShardingManager

## Quick Start (Docker)

The fastest way to run the bot. Requires only Docker.

1. Clone the repository
2. Copy `.env.example` to `.env` and add your bot token and client ID:
   ```bash
   cp .env.example .env
   ```
3. Start everything:
   ```bash
   docker compose up -d
   ```

Docker Compose will automatically:
- Start a PostgreSQL database
- Run database migrations
- Build and launch the bot with sharding

To view logs:
```bash
docker compose logs -f bot
```

To stop:
```bash
docker compose down
```

To stop and delete all data:
```bash
docker compose down -v
```

## Manual Setup

If you prefer to run without Docker.

### Prerequisites

- Node.js 22+
- PostgreSQL database
- Discord bot token ([Developer Portal](https://discord.com/developers/applications))

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your values (uncomment and set `DATABASE_URL`):
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

## Project Structure

```
src/
├── commands/              # Slash command handlers (/g* commands)
├── interaction-handlers/  # Button, select menu, and modal handlers
├── listeners/             # Event listeners (ready, command denied)
├── preconditions/         # Command preconditions (admin check)
├── services/              # Business logic (GiveawayManager)
├── lib/                   # Shared utilities, config, and singletons
├── bot.ts                 # Per-shard entry point
└── index.ts               # Sharding manager entry point
```

## License

See [LICENSE](LICENSE) for details.
