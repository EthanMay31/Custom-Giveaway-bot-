#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Resolve compose command ──
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

# ── Helpers ──
banner() {
  clear
  echo -e "${CYAN}${BOLD}"
  echo "  ╔══════════════════════════════════════╗"
  echo "  ║       Fake Giveaway Bot Manager      ║"
  echo "  ╚══════════════════════════════════════╝"
  echo -e "${NC}"
}

status() {
  local bot_status db_status
  bot_status=$($COMPOSE ps --format '{{.State}}' bot 2>/dev/null || echo "not running")
  db_status=$($COMPOSE ps --format '{{.State}}' db 2>/dev/null || echo "not running")

  echo -e "  Bot: $(colorize_status "$bot_status")    DB: $(colorize_status "$db_status")"
  echo ""
}

colorize_status() {
  case "$1" in
    running) echo -e "${GREEN}${BOLD}running${NC}" ;;
    *)       echo -e "${RED}${BOLD}$1${NC}" ;;
  esac
}

menu() {
  echo -e "  ${BOLD}Commands:${NC}"
  echo -e "    ${CYAN}s${NC} - Start bot"
  echo -e "    ${CYAN}r${NC} - Restart bot"
  echo -e "    ${CYAN}b${NC} - Rebuild & restart bot"
  echo -e "    ${CYAN}d${NC} - Stop bot (keep DB running)"
  echo -e "    ${CYAN}l${NC} - View bot logs (live)"
  echo -e "    ${CYAN}q${NC} - Quit (stops everything)"
  echo ""
}

ensure_env() {
  if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}Please edit .env and set DISCORD_TOKEN and CLIENT_ID, then re-run.${NC}"
    exit 1
  fi
}

ensure_docker() {
  if ! docker info &>/dev/null 2>&1; then
    echo -e "${YELLOW}Docker daemon not running. Starting Colima...${NC}"
    colima start
  fi
}

# ── Actions ──
do_start() {
  echo -e "${CYAN}Starting containers...${NC}"
  $COMPOSE up -d --build
  echo -e "${GREEN}Done.${NC}"
  sleep 1
}

do_restart() {
  echo -e "${CYAN}Restarting bot...${NC}"
  $COMPOSE restart bot
  echo -e "${GREEN}Done.${NC}"
  sleep 1
}

do_rebuild() {
  echo -e "${CYAN}Rebuilding and restarting bot...${NC}"
  $COMPOSE up -d --build bot
  echo -e "${GREEN}Done.${NC}"
  sleep 1
}

do_stop_bot() {
  echo -e "${YELLOW}Stopping bot container...${NC}"
  $COMPOSE stop bot
  echo -e "${GREEN}Bot stopped. DB still running.${NC}"
  sleep 1
}

do_logs() {
  echo -e "${CYAN}Showing bot logs (Ctrl+C to return to menu)...${NC}"
  $COMPOSE logs -f bot || true
}

do_quit() {
  echo -e "${YELLOW}Shutting down all containers...${NC}"
  $COMPOSE down
  echo -e "${GREEN}Goodbye.${NC}"
  exit 0
}

# ── Main ──
ensure_env
ensure_docker

trap do_quit INT

# Initial start
do_start

while true; do
  banner
  status
  menu
  read -rp "  > " cmd
  case "$cmd" in
    s) do_start ;;
    r) do_restart ;;
    b) do_rebuild ;;
    d) do_stop_bot ;;
    l) do_logs ;;
    q) do_quit ;;
    *) echo -e "${RED}  Unknown command: $cmd${NC}"; sleep 1 ;;
  esac
done
