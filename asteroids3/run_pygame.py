#!/usr/bin/env python3
"""
Launcher script for Pygame version of Asteroids
"""

import sys
import subprocess

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import pygame
        import numpy
        print("✓ All dependencies found")
        return True
    except ImportError as e:
        print(f"✗ Missing dependency: {e.name}")
        print("\nTo install dependencies, run:")
        print("  pip install -r requirements_pygame.txt")
        return False

def main():
    """Launch the game"""
    if not check_dependencies():
        sys.exit(1)
    
    print("Launching Asteroids (Pygame Edition)...")
    print("Controls:")
    print("  Arrow Keys: Move/Rotate")
    print("  Space: Fire")
    print("  H: Hyperspace")
    print("  F: Shield (hold)")
    print("  ESC: Quit")
    print()
    
    try:
        from game_pygame import main as game_main
        game_main()
    except KeyboardInterrupt:
        print("\nGame interrupted by user")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

