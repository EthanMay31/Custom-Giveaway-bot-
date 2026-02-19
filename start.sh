#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Check .env exists
if [ ! -f .env ]; then
  echo "No .env file found. Creating from .env.example..."
  cp .env.example .env
  echo "Please edit .env and set DISCORD_TOKEN and CLIENT_ID, then re-run this script."
  exit 1
fi

# Check Homebrew is installed
if ! command -v brew &>/dev/null; then
  echo "Homebrew is not installed. Installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Docker CLI + Docker Compose plugin + Colima if needed
if ! command -v docker &>/dev/null; then
  echo "Installing Docker CLI..."
  brew install docker
fi

if ! command -v colima &>/dev/null; then
  echo "Installing Colima (lightweight Docker runtime)..."
  brew install colima
fi

# Ensure docker-compose plugin is available
if ! docker compose version &>/dev/null 2>&1 && ! command -v docker-compose &>/dev/null; then
  echo "Installing Docker Compose..."
  brew install docker-compose
fi

# Start Colima if Docker daemon isn't running
if ! docker info &>/dev/null 2>&1; then
  echo "Starting Colima..."
  colima start
fi

# Pick the right compose command
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

# Build and start
echo "Starting Fake Giveaway Bot..."
$COMPOSE up -d --build

echo ""
echo "Bot is starting. View logs with:"
echo "  $COMPOSE logs -f bot"
