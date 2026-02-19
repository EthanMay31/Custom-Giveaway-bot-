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

That's it. Docker Compose will automatically:
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
