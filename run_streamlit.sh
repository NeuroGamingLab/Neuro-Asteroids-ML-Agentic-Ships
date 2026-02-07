#!/usr/bin/env bash
#
# Asteroids3 (Streamlit) launcher
# Run from the project root: ./run_streamlit.sh
#
# This script:
#   1. Changes into the asteroids3 game directory
#   2. Activates the dedicated Python venv (.venv)
#   3. Ensures Streamlit is installed (from requirements.txt if missing)
#   4. Starts the web app with: streamlit run app.py
#
# The game opens in your browser at http://localhost:8501 (default).
# Use --server.port N to change the port.
#

set -e

# Resolve project root: directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
GAME_DIR="${SCRIPT_DIR}/asteroids3"
VENV_ACTIVATE="${GAME_DIR}/.venv/bin/activate"
STREAMLIT_APP="${GAME_DIR}/app.py"
REQUIREMENTS_STREAMLIT="${GAME_DIR}/requirements.txt"

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
if [[ ! -f "$STREAMLIT_APP" ]]; then
  echo "Error: Streamlit app not found: $STREAMLIT_APP" >&2
  exit 1
fi

# Enter game directory and activate venv
cd "$GAME_DIR"
# shellcheck disable=SC1090 -- path is built above; safe to source
source "$VENV_ACTIVATE"

# Install Streamlit if not present (requirements.txt has streamlit>=1.28.0)
if ! python3 -c "import streamlit" 2>/dev/null; then
  echo "Streamlit not found in venv. Installing from requirements.txt..."
  pip install -r "$REQUIREMENTS_STREAMLIT"
fi

# Launch Streamlit (pass through any script args, e.g. --server.port 8502)
exec streamlit run app.py "$@"
