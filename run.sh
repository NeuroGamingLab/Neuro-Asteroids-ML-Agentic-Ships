#!/usr/bin/env bash
#
# Asteroids3 (Pygame) launcher
# Run from the project root: ./run.sh
#
# This script:
#   1. Changes into the asteroids3 game directory
#   2. Activates the dedicated Python venv (.venv)
#   3. Starts the game via run_pygame.py (which launches game_pygame)
#

set -e

# Resolve project root: directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
GAME_DIR="${SCRIPT_DIR}/asteroids3"
VENV_ACTIVATE="${GAME_DIR}/.venv/bin/activate"
LAUNCHER="${GAME_DIR}/run_pygame.py"

# Ensure we have the game directory and venv
if [[ ! -d "$GAME_DIR" ]]; then
  echo "Error: Game directory not found: $GAME_DIR" >&2
  exit 1
fi
if [[ ! -f "$VENV_ACTIVATE" ]]; then
  echo "Error: Virtual environment not found. Create it with:" >&2
  echo "  cd $GAME_DIR && python3 -m venv .venv && .venv/bin/pip install -r requirements_pygame.txt" >&2
  exit 1
fi
if [[ ! -f "$LAUNCHER" ]]; then
  echo "Error: Game launcher not found: $LAUNCHER" >&2
  exit 1
fi

# Enter game directory, activate venv, and run the game
cd "$GAME_DIR"
# shellcheck disable=SC1090 -- path is built above; safe to source
source "$VENV_ACTIVATE"
exec python3 run_pygame.py
