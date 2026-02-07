# Asteroids Game - Python Desktop Application

Full Python conversion of the Asteroids game using Pygame. Same design intent as the [Streamlit/HTML5 version](../README.md): agentic ML-style AI ships, formations, and enemy combat.

## How to run

**From project root (recommended):**

```bash
./run.sh
```

**From this directory** (with venv active):

```bash
cd asteroids3
source .venv/bin/activate   # macOS/Linux
python3 run_pygame.py
# or
python3 game_pygame.py
```

To run the **web (Streamlit)** version instead, use `./run_streamlit.sh` from the project root.

## Dedicated environment

A Python virtual environment for this game lives in `asteroids3/.venv`.

**Create (if needed) and activate:**

```bash
cd asteroids3
python3 -m venv .venv
source .venv/bin/activate   # macOS/Linux
# or:  .venv\Scripts\activate   # Windows
pip install -r requirements_pygame.txt
```

Or run without activating: `asteroids3/.venv/bin/python run_pygame.py` (from project root, or use the full path to `run_pygame.py`).

## Features

- **Player Ship**: Arrow keys to rotate, thrust, and move backward; fire, shield (F), hyperspace (H)
- **AI Ships**: Yellow AI-controlled ships with health (3), shield, asteroid avoidance, flocking, and optional alpha-attack formations
- **Enemy Ships**: Basic (red, 1 health), Advanced (tactical, 2 health), and Boss (phases, special abilities, 5 health)
- **Asteroids**: Navigate and shoot; screen wrap and momentum physics
- **Combat**: Bullets, enemy bullets, shields; collision detection
- **Anchor**: Option to anchor player ship or alpha ship at center (e.g. for observing AI)

## Installation

1. Install dependencies (from `asteroids3/` with venv active):
```bash
pip install -r requirements_pygame.txt
```

This installs pygame, numpy, and optional ML dependencies (e.g. TensorFlow). For a minimal install you can use `pip install pygame numpy`; some options (e.g. ML mode) may require the full requirements.

## Controls

- **Arrow Keys**: 
  - Left/Right: Rotate ship
  - Up: Thrust forward
  - Down: Move backward
- **Space**: Fire bullets
- **H**: Hyperspace (teleport to random location)
- **F**: Activate shield (hold)
- **ESC** or **M**: Toggle in-game menu

## Game Settings

Edit `game_pygame.py` to modify:
- `num_ai_ships`: Number of AI ships (default: 1)
- `num_enemy_ships`, `num_boss_ships`: Enemy and boss counts
- `alpha_attack_enabled`, `formation_type`: Alpha-attack formations
- `SCREEN_WIDTH`, `SCREEN_HEIGHT`: Screen dimensions
- `FPS`: Frame rate

## Architecture

- `game_pygame.py`: Main game file with all classes and game loop
- `run_pygame.py`: Launcher script with dependency checking
- `menu_pygame.py`: In-game menu
- `requirements_pygame.txt`: Python dependencies

## Classes

- **Ship**: Player-controlled ship
- **AIShip**: AI-controlled ship (extends Ship); health, shield, formations
- **EnemyShip**: Basic, advanced, and boss enemy types
- **EnemyBullet**: Enemy projectiles
- **Asteroid**: Asteroids to avoid/destroy
- **Bullet**: Projectiles fired by ships

## Future Enhancements

- [ ] MARL (Multi-Agent Reinforcement Learning) integration
- [ ] GUI menu system (PyQt/Tkinter)
- [ ] 3D mode (Panda3D)
- [ ] Sound effects

## Credits

Designed by Tuệ Hoàng, *AI/ML Eng.*  
Hayden (14) and Hugo (10) — *Gaming Specialists*  
*With assistance from multi-LLM.*

