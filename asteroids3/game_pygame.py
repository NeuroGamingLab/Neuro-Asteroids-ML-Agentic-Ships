
##// ============================================
##// Designer Tuệ Hoàng, Eng. 
##// ============================================

#!/usr/bin/env python3
"""
Asteroids Game - Full Python Desktop Application
Converted from JavaScript to Python using Pygame

Designed by Tuệ Hoàng, Eng.
Hayden and Hugo, Game Designers
"""

import pygame
import math
import random
import sys
from typing import List, Optional, Tuple, Dict
import numpy as np
from menu_pygame import Menu

# Initialize Pygame
pygame.init()
pygame.mixer.init()

# Constants
SCREEN_WIDTH = 1200
SCREEN_HEIGHT = 600
FPS = 60

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
YELLOW = (255, 255, 0)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
ORANGE = (255, 165, 0)
GOLD = (255, 215, 0)
LIGHT_GRAY = (192, 192, 192)

# Game state
game_running = True
score = 0
player_ship_active = True
anchor_player_ship = False
anchor_alpha_ship = False

# Game objects
asteroids = []
bullets = []
enemy_bullets = []
ai_ships = []
enemy_ships = []

# Settings
num_ai_ships = 1
num_enemy_ships = 2  # Basic and advanced enemy ships
num_boss_ships = 1  # Boss ships
alpha_attack_enabled = False
formation_type = "arrowhead"
auto_assign_roles = True
adaptive_formation_enabled = False
multi_target_mode = "focus"
escort_mode = "none"
tactical_sequences_enabled = True
formation_transitions_enabled = True
advanced_flanking_enabled = True
ml_enabled = False
ml_mode = "parameters"
marl_enabled = False
marl_training = False

class Ship:
    """Player ship class"""
    def __init__(self, x=None, y=None):
        self.x = x if x is not None else SCREEN_WIDTH / 2
        self.y = y if y is not None else SCREEN_HEIGHT / 2
        self.angle = 0  # Rotation angle in radians
        self.velocity_x = 0.0
        self.velocity_y = 0.0
        self.rotation_speed = 0.1
        self.thrust_power = 0.15
        self.friction = 0.98  # Momentum decay
        self.max_velocity = 8.0  # Maximum velocity limit
        self.size = 20
        self.radius = 15  # For collision detection
        self.shield_active = False
        self.shield_radius = 40  # Shield force field radius
        self.shield_force = 0.5  # Force strength to repel asteroids
    
    def rotate(self, direction):
        """Rotate ship: direction 1 for right, -1 for left"""
        self.angle += direction * self.rotation_speed
    
    def thrust(self, power=1.0):
        """Apply thrust in the direction the ship is facing"""
        self.velocity_x += math.cos(self.angle) * self.thrust_power * power
        self.velocity_y += math.sin(self.angle) * self.thrust_power * power
    
    def move_backward(self):
        """Move backward (opposite direction)"""
        self.velocity_x -= math.cos(self.angle) * self.thrust_power * 0.5
        self.velocity_y -= math.sin(self.angle) * self.thrust_power * 0.5
    
    def move_left(self):
        """Strafe left"""
        self.velocity_x -= math.cos(self.angle - math.pi / 2) * self.thrust_power * 0.7
        self.velocity_y -= math.sin(self.angle - math.pi / 2) * self.thrust_power * 0.7
    
    def move_right(self):
        """Strafe right"""
        self.velocity_x -= math.cos(self.angle + math.pi / 2) * self.thrust_power * 0.7
        self.velocity_y -= math.sin(self.angle + math.pi / 2) * self.thrust_power * 0.7
    
    def update(self):
        """Update ship position and physics"""
        global anchor_player_ship
        
        # Apply friction (momentum decay)
        self.velocity_x *= self.friction
        self.velocity_y *= self.friction
        
        # Limit maximum velocity
        current_speed = math.sqrt(self.velocity_x ** 2 + self.velocity_y ** 2)
        if current_speed > self.max_velocity:
            ratio = self.max_velocity / current_speed
            self.velocity_x *= ratio
            self.velocity_y *= ratio
        
        # ANCHOR PLAYER SHIP: Keep player ship at center when anchored
        if anchor_player_ship:
            # Force position to center
            self.x = SCREEN_WIDTH / 2
            self.y = SCREEN_HEIGHT / 2
            # Reset velocity to prevent drift
            self.velocity_x = 0
            self.velocity_y = 0
        else:
            # Update position
            self.x += self.velocity_x
            self.y += self.velocity_y
            
            # Wrap around screen edges
            if self.x < 0:
                self.x = SCREEN_WIDTH
            elif self.x > SCREEN_WIDTH:
                self.x = 0
            if self.y < 0:
                self.y = SCREEN_HEIGHT
            elif self.y > SCREEN_HEIGHT:
                self.y = 0
    
    def hyperspace(self):
        """Teleport to random location"""
        self.x = random.random() * SCREEN_WIDTH
        self.y = random.random() * SCREEN_HEIGHT
        # Small chance of self-destruction (10% chance)
        if random.random() < 0.1:
            self.velocity_x = 0
            self.velocity_y = 0
    
    def draw(self, screen):
        """Draw the ship on the screen"""
        # Ship is a triangle pointing in the direction of angle
        # Calculate triangle points
        nose_x = self.x + math.cos(self.angle) * self.size
        nose_y = self.y + math.sin(self.angle) * self.size
        
        left_x = self.x - math.cos(self.angle - 2.5) * self.size * 0.6
        left_y = self.y - math.sin(self.angle - 2.5) * self.size * 0.6
        
        right_x = self.x - math.cos(self.angle + 2.5) * self.size * 0.6
        right_y = self.y - math.sin(self.angle + 2.5) * self.size * 0.6
        
        # Draw ship triangle
        points = [(nose_x, nose_y), (left_x, left_y), (right_x, right_y)]
        pygame.draw.polygon(screen, GREEN, points)
        pygame.draw.polygon(screen, WHITE, points, 2)  # Outline
        
        # Draw shield if active
        if self.shield_active:
            pygame.draw.circle(screen, GREEN, (int(self.x), int(self.y)), 
                             self.shield_radius, 2)
    
    def get_position(self):
        """Get position for collision detection"""
        return {
            'x': self.x,
            'y': self.y,
            'radius': self.radius
        }

class AIShip(Ship):
    """AI-controlled ship that extends Ship"""
    def __init__(self, x=None, y=None):
        super().__init__(x, y)
        self.x = x if x is not None else SCREEN_WIDTH * 0.25
        self.y = y if y is not None else SCREEN_HEIGHT * 0.25
        self.angle = math.pi / 2  # Start facing up
        self.detection_radius = 100
        self.avoidance_force = 0.3
        self.thrust_frequency = 0.02
        self.target_angle = self.angle
        self.shoot_cooldown = 0
        self.firing_range = 200
        self.imminent_threat_distance = 80
        self.collision_angle_threshold = math.pi / 3
        self.min_asteroid_size = 15
        self.rapid_fire_cooldown = 3
        self.enemy_detection_radius = 300
        self.enemy_firing_range = 250
        
        # Flocking parameters
        self.flock_radius = 150
        self.separation_distance = 60
        self.alignment_radius = 100
        self.cohesion_radius = 120
        self.flock_weight = 0.3
        
        # Health system
        self.max_health = 3
        self.health = self.max_health
        self.shield_cooldown = 0
        self.shield_duration = 0
        
        # Alpha ship properties
        self.is_alpha = False
        self.alpha_ship = None
        self.formation_position = None
        self.formation_angle = 0
        self.formation_distance = 80
        self.formation_spread = math.radians(60)
        self.alpha_attack_target = None
        self.alpha_attack_cooldown = 0
        self.alpha_attack_cooldown_max = 300
        
        # Formation type
        self.formation_type = "arrowhead"
        
        # Role specialization
        self.role = None
        self.role_abilities = {
            'scout': {'speed': 1.3, 'detection': 1.5, 'health': 0.9},
            'tank': {'speed': 0.8, 'detection': 0.9, 'health': 1.5, 'shield': 1.3},
            'support': {'speed': 1.0, 'detection': 1.2, 'health': 1.1, 'healing': 1.5},
            'dps': {'speed': 1.1, 'detection': 1.0, 'health': 0.9, 'damage': 1.5, 'fireRate': 1.3},
            'interceptor': {'speed': 1.4, 'detection': 1.3, 'health': 0.95}
        }
    
    def normalize_angle(self, angle):
        """Normalize angle to -π to π"""
        while angle > math.pi:
            angle -= 2 * math.pi
        while angle < -math.pi:
            angle += 2 * math.pi
        return angle
    
    def find_nearest_asteroid(self, asteroids):
        """Find nearest asteroid in path"""
        nearest = None
        nearest_distance = float('inf')
        
        for asteroid in asteroids:
            dx = asteroid.x - self.x
            dy = asteroid.y - self.y
            distance = math.sqrt(dx ** 2 + dy ** 2)
            
            if distance < self.detection_radius:
                angle_to_asteroid = math.atan2(dy, dx)
                angle_diff = abs(self.normalize_angle(angle_to_asteroid - self.angle))
                
                if angle_diff < math.pi / 2 and distance < nearest_distance:
                    nearest = asteroid
                    nearest_distance = distance
        
        return nearest
    
    def find_nearest_enemy(self, enemies):
        """Find nearest enemy ship"""
        nearest = None
        nearest_distance = float('inf')
        
        for enemy in enemies:
            dx = enemy.x - self.x
            dy = enemy.y - self.y
            distance = math.sqrt(dx ** 2 + dy ** 2)
            
            if distance < self.enemy_detection_radius and distance < nearest_distance:
                nearest = enemy
                nearest_distance = distance
        
        return nearest
    
    def make_decision(self, asteroids_list, enemy_ships_list, ai_ships_list, player_ship):
        """Make AI decision for movement and firing"""
        global anchor_alpha_ship
        
        # ANCHOR ALPHA SHIP: Skip movement if anchored
        if self.is_alpha and anchor_alpha_ship:
            # Still allow rotation and firing, but no thrust
            pass
        else:
            # Find nearest asteroid
            nearest_asteroid = self.find_nearest_asteroid(asteroids_list)
            
            # Find nearest enemy
            nearest_enemy = self.find_nearest_enemy(enemy_ships_list)
            
            # Priority 1: Avoid asteroids
            if nearest_asteroid:
                dx = nearest_asteroid.x - self.x
                dy = nearest_asteroid.y - self.y
                distance = math.sqrt(dx ** 2 + dy ** 2)
                
                if distance < self.detection_radius:
                    # Calculate avoidance angle
                    avoid_angle = math.atan2(-dy, -dx)
                    angle_diff = self.normalize_angle(avoid_angle - self.angle)
                    
                    # Rotate towards avoidance direction
                    if abs(angle_diff) > 0.1:
                        if angle_diff > 0:
                            self.rotate(1)
                        else:
                            self.rotate(-1)
                    
                    # Thrust away from asteroid
                    if not (self.is_alpha and anchor_alpha_ship):
                        self.thrust(0.5)
            
            # Priority 2: Attack enemies
            elif nearest_enemy:
                dx = nearest_enemy.x - self.x
                dy = nearest_enemy.y - self.y
                distance = math.sqrt(dx ** 2 + dy ** 2)
                
                angle_to_enemy = math.atan2(dy, dx)
                angle_diff = self.normalize_angle(angle_to_enemy - self.angle)
                
                # Rotate towards enemy
                if abs(angle_diff) > 0.1:
                    if angle_diff > 0:
                        self.rotate(1)
                    else:
                        self.rotate(-1)
                
                # Thrust towards enemy
                if not (self.is_alpha and anchor_alpha_ship):
                    self.thrust(0.7)
            
            # Priority 3: Random navigation
            elif random.random() < self.thrust_frequency:
                if not (self.is_alpha and anchor_alpha_ship):
                    self.thrust()
                # Random rotation
                if random.random() < 0.1:
                    self.rotate(1 if random.random() < 0.5 else -1)
        
        # Firing logic
        self.shoot_cooldown = max(0, self.shoot_cooldown - 1)
        
        # Fire at enemies
        if nearest_enemy and self.shoot_cooldown <= 0:
            dx = nearest_enemy.x - self.x
            dy = nearest_enemy.y - self.y
            distance = math.sqrt(dx ** 2 + dy ** 2)
            
            if distance < self.enemy_firing_range:
                angle_to_enemy = math.atan2(dy, dx)
                angle_diff = abs(self.normalize_angle(angle_to_enemy - self.angle))
                
                if angle_diff < self.collision_angle_threshold:
                    # Fire bullet
                    bullet_x = self.x + math.cos(self.angle) * self.size
                    bullet_y = self.y + math.sin(self.angle) * self.size
                    bullets.append(Bullet(bullet_x, bullet_y, self.angle, YELLOW))
                    self.shoot_cooldown = self.rapid_fire_cooldown
        
        # Fire at asteroids
        elif nearest_asteroid and self.shoot_cooldown <= 0:
            dx = nearest_asteroid.x - self.x
            dy = nearest_asteroid.y - self.y
            distance = math.sqrt(dx ** 2 + dy ** 2)
            
            if distance < self.firing_range and nearest_asteroid.size >= self.min_asteroid_size:
                angle_to_asteroid = math.atan2(dy, dx)
                angle_diff = abs(self.normalize_angle(angle_to_asteroid - self.angle))
                
                if angle_diff < self.collision_angle_threshold or distance < self.imminent_threat_distance:
                    # Fire bullet
                    bullet_x = self.x + math.cos(self.angle) * self.size
                    bullet_y = self.y + math.sin(self.angle) * self.size
                    bullets.append(Bullet(bullet_x, bullet_y, self.angle, YELLOW))
                    self.shoot_cooldown = self.rapid_fire_cooldown
    
    def update(self):
        """Update AI ship (override parent)"""
        global anchor_alpha_ship
        
        # ANCHOR ALPHA SHIP: Keep alpha ship at center when anchored
        if self.is_alpha and anchor_alpha_ship:
            self.x = SCREEN_WIDTH / 2
            self.y = SCREEN_HEIGHT / 2
            self.velocity_x = 0
            self.velocity_y = 0
        else:
            # Call parent update
            super().update()
    
    def draw(self, screen):
        """Draw AI ship (yellow color)"""
        # Ship is a triangle pointing in the direction of angle
        nose_x = self.x + math.cos(self.angle) * self.size
        nose_y = self.y + math.sin(self.angle) * self.size
        
        left_x = self.x - math.cos(self.angle - 2.5) * self.size * 0.6
        left_y = self.y - math.sin(self.angle - 2.5) * self.size * 0.6
        
        right_x = self.x - math.cos(self.angle + 2.5) * self.size * 0.6
        right_y = self.y - math.sin(self.angle + 2.5) * self.size * 0.6
        
        # Draw ship triangle (yellow for AI ships)
        points = [(nose_x, nose_y), (left_x, left_y), (right_x, right_y)]
        pygame.draw.polygon(screen, YELLOW, points)
        pygame.draw.polygon(screen, ORANGE, points, 2)  # Outline
        
        # Draw shield if active
        if self.shield_active:
            pygame.draw.circle(screen, YELLOW, (int(self.x), int(self.y)), 
                             self.shield_radius, 2)
        
        # Draw health bar
        if self.health < self.max_health:
            bar_width = 30
            bar_height = 4
            bar_x = self.x - bar_width / 2
            bar_y = self.y - self.size - 10
            
            # Background
            pygame.draw.rect(screen, RED, (bar_x, bar_y, bar_width, bar_height))
            # Health
            health_width = bar_width * (self.health / self.max_health)
            pygame.draw.rect(screen, GREEN, (bar_x, bar_y, health_width, bar_height))

class EnemyBullet:
    """Enemy bullet class (red bullets)"""
    def __init__(self, x, y, angle):
        self.x = x
        self.y = y
        self.angle = angle
        self.speed = 7.0
        self.velocity_x = math.cos(angle) * self.speed
        self.velocity_y = math.sin(angle) * self.speed
        self.radius = 3
        self.lifetime = 90
        self.color = RED
    
    def update(self):
        """Update bullet position"""
        self.x += self.velocity_x
        self.y += self.velocity_y
        self.lifetime -= 1
        
        # Wrap around screen edges
        if self.x < 0:
            self.x = SCREEN_WIDTH
        elif self.x > SCREEN_WIDTH:
            self.x = 0
        if self.y < 0:
            self.y = SCREEN_HEIGHT
        elif self.y > SCREEN_HEIGHT:
            self.y = 0
    
    def is_alive(self):
        """Check if bullet is still alive"""
        return self.lifetime > 0
    
    def draw(self, screen):
        """Draw the enemy bullet (red)"""
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), self.radius)
        # Add glow effect
        pygame.draw.circle(screen, ORANGE, (int(self.x), int(self.y)), self.radius - 1)
    
    def get_position(self):
        """Get position for collision detection"""
        return {
            'x': self.x,
            'y': self.y,
            'radius': self.radius
        }

class EnemyShip:
    """Enemy ship class - Hostile AI ships that attack the player"""
    def __init__(self, x=None, y=None, ship_type='basic'):
        # Spawn at edge of screen if position not provided
        if x is None or y is None:
            side = random.randint(0, 3)
            if side == 0:  # Top
                self.x = random.random() * SCREEN_WIDTH
                self.y = 0
            elif side == 1:  # Right
                self.x = SCREEN_WIDTH
                self.y = random.random() * SCREEN_HEIGHT
            elif side == 2:  # Bottom
                self.x = random.random() * SCREEN_WIDTH
                self.y = SCREEN_HEIGHT
            else:  # Left
                self.x = 0
                self.y = random.random() * SCREEN_HEIGHT
        else:
            self.x = x
            self.y = y
        
        self.type = ship_type
        self.velocity_x = 0.0
        self.velocity_y = 0.0
        self.angle = random.random() * math.pi * 2
        self.rotation_speed = 0.08
        self.thrust_power = 0.12
        self.friction = 0.98
        self.max_velocity = 6.0
        self.health = self.get_max_health()
        self.max_health = self.health
        self.fire_cooldown = 0
        self.fire_rate = self.get_fire_rate()
        self.bullet_speed = 7.0
        self.attack_range = 300
        self.detection_radius = 400
        self.evasion_radius = 80
        self.behavior_state = 'pursuit'
        self.target = None
        self.predicted_position = None
        self.cover_asteroid = None
        self.flank_angle = 0
        self.size = self.get_size()
        self.radius = self.size * 0.75
        self.color = self.get_color()
        self.target_angle = self.angle
        
        # Burst fire state
        self.target_score = 0
        self.burst_fire_active = False
        self.burst_fire_timer = 0
        self.burst_fire_count = 0
        self.burst_fire_base_angle = 0
        self.burst_fire_spread = 0
        
        # Shield system for basic and advanced
        if self.type in ['basic', 'advanced']:
            self.shield_active = False
            self.shield_cooldown = 0
            self.shield_duration = 0
            self.shield_radius = 40
            self.shield_force = 0.5
            self.shield_cooldown_max = 300
        
        # Boss-specific properties
        if self.type == 'boss':
            self.boss_phase = 1  # 1, 2, or 3
            self.shield_active = False
            self.shield_cooldown = 0
            self.shield_duration = 0
            self.teleport_cooldown = 0
            self.attack_pattern = 'normal'  # normal, spread, rapid, circular
            self.attack_pattern_timer = 0
            self.rapid_fire_burst = 0
            self.rapid_fire_burst_count = 0
            self.erratic_movement_timer = 0
            self.phase_transition_timer = 0
    
    def get_max_health(self):
        """Get max health based on type"""
        if self.type == 'basic':
            return 1
        elif self.type == 'advanced':
            return 2
        elif self.type == 'boss':
            return 5
        return 1
    
    def get_fire_rate(self):
        """Get fire rate based on type"""
        if self.type == 'basic':
            return 30
        elif self.type == 'advanced':
            return 20
        elif self.type == 'boss':
            return 10
        return 30
    
    def get_size(self):
        """Get size based on type"""
        if self.type == 'basic':
            return 18
        elif self.type == 'advanced':
            return 22
        elif self.type == 'boss':
            return 35
        return 18
    
    def get_color(self):
        """Get color based on type"""
        if self.type == 'basic':
            return (255, 68, 68)  # Red
        elif self.type == 'advanced':
            return (170, 68, 255)  # Purple
        elif self.type == 'boss':
            return (255, 0, 0)  # Bright red
        return (255, 68, 68)
    
    def normalize_angle(self, angle):
        """Normalize angle to -π to π"""
        while angle > math.pi:
            angle -= 2 * math.pi
        while angle < -math.pi:
            angle += 2 * math.pi
        return angle
    
    def score_target(self, target_ship):
        """Score target based on multiple factors"""
        if not target_ship:
            return 0
        
        score = 0
        
        # Low health priority
        if hasattr(target_ship, 'health') and hasattr(target_ship, 'max_health'):
            health_ratio = target_ship.health / target_ship.max_health
            score += (1.0 - health_ratio) * 100
        
        # Alpha ship priority
        if hasattr(target_ship, 'is_alpha') and target_ship.is_alpha:
            score += 150
        
        # Shield penalty
        if hasattr(target_ship, 'shield_active') and target_ship.shield_active:
            score -= 100
        
        return score
    
    def find_target(self, ai_ships, player_ship):
        """Find best target using smart prioritization"""
        best_target = None
        best_score = float('-inf')
        
        # Check player ship
        if player_ship:
            dx = player_ship.x - self.x
            dy = player_ship.y - self.y
            distance = math.sqrt(dx ** 2 + dy ** 2)
            if distance < self.detection_radius:
                base_score = 50
                distance_factor = 1.0 / (distance + 1)
                total_score = base_score * distance_factor
                if total_score > best_score:
                    best_score = total_score
                    best_target = {
                        'ship': player_ship,
                        'distance': distance,
                        'angle': math.atan2(dy, dx),
                        'is_player': True,
                        'score': total_score
                    }
        
        # Check AI ships
        for ai_ship in ai_ships:
            if not ai_ship:
                continue
            dx = ai_ship.x - self.x
            dy = ai_ship.y - self.y
            distance = math.sqrt(dx ** 2 + dy ** 2)
            if distance < self.detection_radius:
                target_score = self.score_target(ai_ship)
                distance_factor = 1.0 / (distance + 1)
                total_score = target_score * distance_factor
                if total_score > best_score:
                    best_score = total_score
                    best_target = {
                        'ship': ai_ship,
                        'distance': distance,
                        'angle': math.atan2(dy, dx),
                        'is_player': False,
                        'score': total_score
                    }
        
        return best_target
    
    def predict_target_position(self, target):
        """Predict target position for leading shots"""
        if not target or 'ship' not in target:
            return None
        dx = target['ship'].x - self.x
        dy = target['ship'].y - self.y
        distance = math.sqrt(dx ** 2 + dy ** 2)
        if distance > self.attack_range:
            return None
        time_to_reach = distance / self.bullet_speed
        predicted_x = target['ship'].x + target['ship'].velocity_x * time_to_reach
        predicted_y = target['ship'].y + target['ship'].velocity_y * time_to_reach
        # Wrap coordinates
        predicted_x = ((predicted_x % SCREEN_WIDTH) + SCREEN_WIDTH) % SCREEN_WIDTH
        predicted_y = ((predicted_y % SCREEN_HEIGHT) + SCREEN_HEIGHT) % SCREEN_HEIGHT
        return {
            'x': predicted_x,
            'y': predicted_y,
            'angle': math.atan2(predicted_y - self.y, predicted_x - self.x)
        }
    
    def fire_at_angle(self, angle, enemy_bullets):
        """Fire bullet at specific angle"""
        bullet_x = self.x + math.cos(angle) * self.size
        bullet_y = self.y + math.sin(angle) * self.size
        enemy_bullets.append(EnemyBullet(bullet_x, bullet_y, angle))
    
    def fire_burst(self, target, count, enemy_bullets):
        """Burst fire pattern"""
        if not target:
            return
        predicted = self.predict_target_position(target)
        base_angle = self.angle
        if predicted:
            base_angle = predicted['angle']
        elif 'angle' in target:
            base_angle = target['angle']
        
        spread = math.pi / 12  # 15 degrees
        self.burst_fire_active = True
        self.burst_fire_timer = 0
        self.burst_fire_count = count
        self.burst_fire_base_angle = base_angle
        self.burst_fire_spread = spread
        
        # Fire first shot immediately
        self.fire_at_angle(base_angle, enemy_bullets)
        self.fire_cooldown = self.fire_rate
    
    def update_burst_fire(self, enemy_bullets):
        """Update burst fire (called from make_decision)"""
        if not self.burst_fire_active:
            return
        self.burst_fire_timer += 1
        
        # Fire next shot every 2 frames
        if self.burst_fire_timer % 2 == 0 and self.burst_fire_timer // 2 < self.burst_fire_count:
            shot_index = self.burst_fire_timer // 2
            if 0 < shot_index < self.burst_fire_count:
                angle = self.burst_fire_base_angle + \
                    (shot_index - self.burst_fire_count / 2) * \
                    (self.burst_fire_spread / (self.burst_fire_count - 1))
                self.fire_at_angle(angle, enemy_bullets)
        
        # End burst after all shots
        if self.burst_fire_timer >= self.burst_fire_count * 2:
            self.burst_fire_active = False
            self.burst_fire_timer = 0
    
    def fire_boss_pattern(self, target, ai_ships, enemy_bullets):
        """Boss-specific firing patterns"""
        predicted = self.predict_target_position(target)
        base_angle = self.angle
        if predicted:
            base_angle = predicted['angle']
        elif target:
            base_angle = target.get('angle', self.angle)
        
        if self.attack_pattern == 'spread':
            # Spread shot: 5 bullets in a cone
            spread_angle = math.pi / 6  # 30 degrees
            for i in range(5):
                angle = base_angle - spread_angle / 2 + (spread_angle / 4) * i
                self.fire_at_angle(angle, enemy_bullets)
            self.fire_cooldown = int(self.fire_rate * 1.5)
        elif self.attack_pattern == 'rapid':
            # Rapid fire: 3 bullets in quick succession
            if self.rapid_fire_burst_count < 3:
                self.fire_at_angle(base_angle, enemy_bullets)
                self.rapid_fire_burst_count += 1
                self.fire_cooldown = 5
            else:
                self.rapid_fire_burst_count = 0
                self.fire_cooldown = int(self.fire_rate * 2)
                self.attack_pattern_timer = 0
        elif self.attack_pattern == 'circular':
            # Circular pattern: 8 bullets in all directions
            for i in range(8):
                angle = (i * math.pi * 2) / 8
                self.fire_at_angle(angle, enemy_bullets)
            self.fire_cooldown = int(self.fire_rate * 2)
        else:  # normal
            # Normal single shot
            self.fire_at_angle(base_angle, enemy_bullets)
            self.fire_cooldown = self.fire_rate
    
    def fire(self, ai_ships, player_ship, enemy_bullets):
        """Fire at target"""
        if self.fire_cooldown > 0:
            return
        target = self.find_target(ai_ships, player_ship)
        if not target:
            return
        
        # Boss enemies use complex attack patterns
        if self.type == 'boss':
            self.fire_boss_pattern(target, ai_ships, enemy_bullets)
            return
        
        # Advanced enemies use burst fire
        if self.type == 'advanced':
            rand = random.random()
            if rand < 0.3:
                self.fire_burst(target, 3, enemy_bullets)
                return
            elif rand < 0.5:
                # Predictive spread
                predicted = self.predict_target_position(target)
                base_angle = predicted['angle'] if predicted else target['angle']
                spread = math.pi / 8
                for i in range(3):
                    angle = base_angle + (i - 1) * (spread / 2)
                    self.fire_at_angle(angle, enemy_bullets)
                self.fire_cooldown = self.fire_rate
                return
        
        # Basic enemies occasionally use burst
        if self.type == 'basic' and random.random() < 0.1:
            self.fire_burst(target, 2, enemy_bullets)
            return
        
        # Normal firing
        predicted = self.predict_target_position(target)
        fire_angle = predicted['angle'] if predicted else target['angle']
        self.fire_at_angle(fire_angle, enemy_bullets)
        self.fire_cooldown = self.fire_rate
    
    def update_boss_phase(self):
        """Update boss phase based on health"""
        if self.type != 'boss':
            return
        health_percent = self.health / self.max_health
        old_phase = self.boss_phase
        
        if health_percent > 0.6:
            self.boss_phase = 1
        elif health_percent > 0.3:
            self.boss_phase = 2
        else:
            self.boss_phase = 3
        
        # Phase transition effects
        if old_phase != self.boss_phase:
            self.phase_transition_timer = 60
            self.shield_active = True
            self.shield_duration = 30
    
    def update_boss_attack_pattern(self):
        """Update boss attack pattern based on phase"""
        if self.type != 'boss':
            return
        self.attack_pattern_timer += 1
        
        # Change pattern periodically
        if self.attack_pattern_timer > 120:
            self.attack_pattern_timer = 0
            if self.boss_phase == 1:
                self.attack_pattern = 'spread' if random.random() < 0.3 else 'normal'
            elif self.boss_phase == 2:
                self.attack_pattern = random.choice(['spread', 'rapid', 'normal'])
            else:  # phase 3
                self.attack_pattern = random.choice(['spread', 'rapid', 'circular', 'normal'])
    
    def update_enemy_shield(self):
        """Update shield for basic and advanced enemy ships"""
        if self.type == 'boss':
            self.update_boss_shield()
            return
        if self.type not in ['basic', 'advanced']:
            return
        
        # Update shield duration
        if self.shield_duration > 0:
            self.shield_duration -= 1
            self.shield_active = True
        else:
            self.shield_active = False
        
        # Update cooldown
        if self.shield_cooldown > 0:
            self.shield_cooldown -= 1
        
        # Activate shield periodically
        if self.shield_cooldown <= 0 and not self.shield_active:
            shield_chance = 0.01 if self.type == 'advanced' else 0.005
            if random.random() < shield_chance:
                self.shield_active = True
                self.shield_duration = 60
                self.shield_cooldown = self.shield_cooldown_max
    
    def update_boss_shield(self):
        """Boss shield system"""
        if self.type != 'boss':
            return
        if self.shield_duration > 0:
            self.shield_duration -= 1
            self.shield_active = True
        else:
            self.shield_active = False
        if self.shield_cooldown > 0:
            self.shield_cooldown -= 1
        elif self.boss_phase >= 2 and not self.shield_active and random.random() < 0.01:
            self.shield_active = True
            self.shield_duration = 90
            self.shield_cooldown = 300
    
    def boss_teleport(self):
        """Boss teleportation ability"""
        if self.type != 'boss' or self.teleport_cooldown > 0:
            return False
        if self.boss_phase == 3 and self.health <= 1 and random.random() < 0.02:
            self.x = random.random() * SCREEN_WIDTH
            self.y = random.random() * SCREEN_HEIGHT
            self.teleport_cooldown = 180
            return True
        return False
    
    def apply_erratic_movement(self):
        """Boss erratic movement in phase 3"""
        if self.type != 'boss' or self.boss_phase != 3:
            return
        self.erratic_movement_timer += 1
        if self.erratic_movement_timer > 10:
            self.erratic_movement_timer = 0
            if random.random() < 0.3:
                self.target_angle += (random.random() - 0.5) * math.pi
    
    def detect_incoming_bullets(self, bullets):
        """Detect incoming bullets for evasion"""
        nearest_bullet = None
        nearest_distance = float('inf')
        for bullet in bullets:
            dx = bullet.x - self.x
            dy = bullet.y - self.y
            distance = math.sqrt(dx ** 2 + dy ** 2)
            if distance < self.evasion_radius and distance < nearest_distance:
                angle_to_bullet = math.atan2(dy, dx)
                angle_diff = abs(self.normalize_angle(angle_to_bullet - bullet.angle))
                if angle_diff < math.pi / 3:
                    nearest_bullet = {'bullet': bullet, 'distance': distance, 'angle': angle_to_bullet}
                    nearest_distance = distance
        return nearest_bullet
    
    def evade_bullets(self, bullets):
        """Evade incoming bullets"""
        incoming = self.detect_incoming_bullets(bullets)
        if incoming and incoming['distance'] < self.evasion_radius:
            evasion_angle = incoming['angle'] + math.pi / 2 + (random.random() - 0.5) * math.pi / 2
            self.target_angle = evasion_angle
            self.behavior_state = 'evade'
            return True
        return False
    
    def check_health(self):
        """Check health and update behavior state"""
        health_percent = self.health / self.max_health
        if self.type == 'boss':
            self.update_boss_phase()
        else:
            if health_percent < 0.3:
                self.behavior_state = 'retreat'
            elif health_percent < 0.6:
                if self.behavior_state == 'pursuit':
                    self.behavior_state = 'evade'
    
    def rotate(self, direction):
        """Rotate ship"""
        self.angle += direction * self.rotation_speed
    
    def thrust(self, power=1.0):
        """Apply thrust"""
        self.velocity_x += math.cos(self.angle) * self.thrust_power * power
        self.velocity_y += math.sin(self.angle) * self.thrust_power * power
        speed = math.sqrt(self.velocity_x ** 2 + self.velocity_y ** 2)
        if speed > self.max_velocity:
            self.velocity_x = (self.velocity_x / speed) * self.max_velocity
            self.velocity_y = (self.velocity_y / speed) * self.max_velocity
    
    def make_decision(self, asteroids, enemy_ships, ai_ships, player_ship, bullets, enemy_bullets):
        """Make AI decision for enemy ship"""
        if self.fire_cooldown > 0:
            self.fire_cooldown -= 1
        if self.type == 'boss' and self.teleport_cooldown > 0:
            self.teleport_cooldown -= 1
        
        # Update burst fire
        if self.burst_fire_active:
            self.update_burst_fire(enemy_bullets)
        
        # Update shield
        if self.type in ['basic', 'advanced']:
            self.update_enemy_shield()
        
        self.check_health()
        
        # Boss-specific updates
        if self.type == 'boss':
            self.update_boss_attack_pattern()
            self.update_boss_shield()
            self.apply_erratic_movement()
            if self.boss_teleport():
                return  # Teleported, skip movement
        
        # Find target
        target = self.find_target(ai_ships, player_ship)
        if target:
            self.target_score = target.get('score', 0)
        
        # Evade bullets
        if self.evade_bullets(bullets):
            pass
        elif target:
            if self.behavior_state == 'retreat' and self.type != 'boss':
                self.target_angle = target['angle'] + math.pi
            else:
                if target['distance'] < self.attack_range:
                    self.behavior_state = 'attack'
                    predicted = self.predict_target_position(target)
                    if predicted:
                        self.target_angle = predicted['angle']
                    else:
                        self.target_angle = target['angle']
                else:
                    self.behavior_state = 'pursuit'
                    self.target_angle = target['angle']
        else:
            if random.random() < 0.01:
                self.target_angle = random.random() * math.pi * 2
        
        # Rotate towards target angle
        angle_diff = self.normalize_angle(self.target_angle - self.angle)
        if abs(angle_diff) > 0.1:
            self.rotate(1 if angle_diff > 0 else -1)
        
        # Movement based on type and phase
        if self.type == 'boss':
            if self.boss_phase == 1:
                if random.random() < 0.3:
                    self.thrust()
            elif self.boss_phase == 2:
                if random.random() < 0.4:
                    self.thrust(1.2)
            else:  # phase 3
                if random.random() < 0.5:
                    self.thrust(1.5)
        else:
            if self.behavior_state != 'retreat' and random.random() < 0.3:
                self.thrust()
            elif self.behavior_state == 'retreat' and random.random() < 0.5:
                self.thrust(1.5)
        
        # Fire
        if self.fire_cooldown <= 0:
            target = self.find_target(ai_ships, player_ship)
            if target and target['distance'] < self.attack_range:
                self.fire(ai_ships, player_ship, enemy_bullets)
    
    def update(self):
        """Update enemy ship position"""
        self.velocity_x *= self.friction
        self.velocity_y *= self.friction
        self.x += self.velocity_x
        self.y += self.velocity_y
        
        # Wrap around screen edges
        if self.x < 0:
            self.x = SCREEN_WIDTH
        elif self.x > SCREEN_WIDTH:
            self.x = 0
        if self.y < 0:
            self.y = SCREEN_HEIGHT
        elif self.y > SCREEN_HEIGHT:
            self.y = 0
    
    def draw(self, screen):
        """Draw enemy ship"""
        # Draw shield if active
        if self.shield_active:
            if self.type == 'boss':
                shield_radius = self.size + 10
                pygame.draw.circle(screen, YELLOW, (int(self.x), int(self.y)), 
                                 int(shield_radius), 3)
            else:
                shield_radius = self.shield_radius
                pygame.draw.circle(screen, RED, (int(self.x), int(self.y)), 
                                 int(shield_radius), 2)
        
        # Phase transition effect for boss
        if self.type == 'boss' and self.phase_transition_timer > 0:
            pygame.draw.circle(screen, WHITE, (int(self.x), int(self.y)), 
                             int(self.size + 15), 4)
            self.phase_transition_timer -= 1
        
        # Draw ship (triangle)
        nose_x = self.x + math.cos(self.angle) * self.size
        nose_y = self.y + math.sin(self.angle) * self.size
        
        left_x = self.x - math.cos(self.angle - 2.5) * self.size * 0.6
        left_y = self.y - math.sin(self.angle - 2.5) * self.size * 0.6
        
        right_x = self.x - math.cos(self.angle + 2.5) * self.size * 0.6
        right_y = self.y + math.sin(self.angle + 2.5) * self.size * 0.6
        
        points = [(nose_x, nose_y), (left_x, left_y), (right_x, right_y)]
        
        if self.type == 'boss':
            # Boss: Hexagonal shape
            hex_points = []
            for i in range(6):
                angle_hex = (i * math.pi) / 3 + self.angle
                hex_x = self.x + math.cos(angle_hex) * self.size
                hex_y = self.y + math.sin(angle_hex) * self.size
                hex_points.append((hex_x, hex_y))
            pygame.draw.polygon(screen, self.color, hex_points)
            pygame.draw.polygon(screen, WHITE, hex_points, 2)
        else:
            pygame.draw.polygon(screen, self.color, points)
            pygame.draw.polygon(screen, WHITE, points, 2)
        
        # Draw health bar
        if self.health < self.max_health:
            bar_width = 30
            bar_height = 4
            bar_x = self.x - bar_width / 2
            bar_y = self.y - self.size - 10
            
            # Background
            pygame.draw.rect(screen, RED, (bar_x, bar_y, bar_width, bar_height))
            # Health
            health_width = bar_width * (self.health / self.max_health)
            health_color = GREEN if self.health > self.max_health * 0.5 else YELLOW
            pygame.draw.rect(screen, health_color, (bar_x, bar_y, health_width, bar_height))
    
    def get_position(self):
        """Get position for collision detection"""
        return {
            'x': self.x,
            'y': self.y,
            'radius': self.radius
        }

class Asteroid:
    """Asteroid class"""
    def __init__(self, x=None, y=None):
        # Random position if not provided
        if x is None or y is None:
            # Spawn at edge of screen
            side = random.randint(0, 3)
            if side == 0:  # Top
                self.x = random.random() * SCREEN_WIDTH
                self.y = 0
            elif side == 1:  # Right
                self.x = SCREEN_WIDTH
                self.y = random.random() * SCREEN_HEIGHT
            elif side == 2:  # Bottom
                self.x = random.random() * SCREEN_WIDTH
                self.y = SCREEN_HEIGHT
            else:  # Left
                self.x = 0
                self.y = random.random() * SCREEN_HEIGHT
        else:
            self.x = x
            self.y = y
        
        # Random velocity in all directions
        speed = 1 + random.random() * 2
        angle = random.random() * math.pi * 2
        self.velocity_x = math.cos(angle) * speed
        self.velocity_y = math.sin(angle) * speed
        
        self.size = 30 + random.random() * 30
        self.radius = self.size / 2
        self.rotation = 0
        self.rotation_speed = (random.random() - 0.5) * 0.1
        self.vertices = self.generate_vertices()
    
    def generate_vertices(self):
        """Generate irregular polygon vertices"""
        vertices = []
        num_vertices = 8 + random.randint(0, 3)
        for i in range(num_vertices):
            angle = (math.pi * 2 * i) / num_vertices
            distance = self.size / 2 + (random.random() - 0.5) * 10
            vertices.append((
                math.cos(angle) * distance,
                math.sin(angle) * distance
            ))
        return vertices
    
    def update(self):
        """Update asteroid position"""
        self.x += self.velocity_x
        self.y += self.velocity_y
        self.rotation += self.rotation_speed
        
        # Wrap around screen edges
        if self.x < -self.size:
            self.x = SCREEN_WIDTH + self.size
        elif self.x > SCREEN_WIDTH + self.size:
            self.x = -self.size
        if self.y < -self.size:
            self.y = SCREEN_HEIGHT + self.size
        elif self.y > SCREEN_HEIGHT + self.size:
            self.y = -self.size
    
    def draw(self, screen):
        """Draw the asteroid"""
        # Draw irregular polygon
        points = []
        for vx, vy in self.vertices:
            rotated_x = vx * math.cos(self.rotation) - vy * math.sin(self.rotation)
            rotated_y = vx * math.sin(self.rotation) + vy * math.cos(self.rotation)
            points.append((self.x + rotated_x, self.y + rotated_y))
        
        if len(points) > 2:
            pygame.draw.polygon(screen, GREEN, points)
            pygame.draw.polygon(screen, WHITE, points, 1)
    
    def get_position(self):
        """Get position for collision detection"""
        return {
            'x': self.x,
            'y': self.y,
            'radius': self.radius
        }

class Bullet:
    """Bullet class"""
    def __init__(self, x, y, angle, color=YELLOW):
        self.x = x
        self.y = y
        self.angle = angle
        self.speed = 8.0
        self.velocity_x = math.cos(angle) * self.speed
        self.velocity_y = math.sin(angle) * self.speed
        self.radius = 3
        self.lifetime = 60  # Frames before bullet disappears
        self.color = color
    
    def update(self):
        """Update bullet position"""
        self.x += self.velocity_x
        self.y += self.velocity_y
        self.lifetime -= 1
        
        # Wrap around screen edges
        if self.x < 0:
            self.x = SCREEN_WIDTH
        elif self.x > SCREEN_WIDTH:
            self.x = 0
        if self.y < 0:
            self.y = SCREEN_HEIGHT
        elif self.y > SCREEN_HEIGHT:
            self.y = 0
    
    def is_alive(self):
        """Check if bullet is still alive"""
        return self.lifetime > 0
    
    def draw(self, screen):
        """Draw the bullet"""
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), self.radius)
    
    def get_position(self):
        """Get position for collision detection"""
        return {
            'x': self.x,
            'y': self.y,
            'radius': self.radius
        }

def check_collision(obj1, obj2):
    """Check collision between two objects"""
    pos1 = obj1.get_position()
    pos2 = obj2.get_position()
    dx = pos1['x'] - pos2['x']
    dy = pos1['y'] - pos2['y']
    distance = math.sqrt(dx ** 2 + dy ** 2)
    return distance < (pos1['radius'] + pos2['radius'])

def init_game():
    """Initialize game state"""
    global asteroids, bullets, enemy_bullets, enemy_ships, ai_ships, score, num_enemy_ships, num_boss_ships
    
    asteroids = []
    for _ in range(5):
        asteroids.append(Asteroid())
    
    bullets = []
    enemy_bullets = []
    enemy_ships = []
    ai_ships = []
    
    # Spawn enemy ships
    for _ in range(num_enemy_ships):
        enemy_type = 'advanced' if random.random() < 0.3 else 'basic'
        enemy_ships.append(EnemyShip(ship_type=enemy_type))
    
    # Spawn boss ships
    for _ in range(num_boss_ships):
        enemy_ships.append(EnemyShip(ship_type='boss'))
    
    score = 0

def main():
    """Main game loop"""
    global game_running, score, player_ship_active, num_ai_ships, ai_ships, bullets, asteroids, enemy_ships, enemy_bullets
    global anchor_player_ship, anchor_alpha_ship, num_enemy_ships, num_boss_ships
    global SCREEN_WIDTH, SCREEN_HEIGHT
    
    # Initialize screen
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("ASTEROIDS - Python Edition | Press ESC or M for Menu")
    clock = pygame.time.Clock()
    
    # Initialize menu
    menu = Menu(SCREEN_WIDTH, SCREEN_HEIGHT)
    
    # Initialize game
    ship = Ship()
    init_game()
    
    # Initialize AI ships
    if num_ai_ships > 0:
        ai_ships = []
        for i in range(num_ai_ships):
            ai_ship = AIShip()
            if i == 0:
                ai_ship.is_alpha = True
            ai_ships.append(ai_ship)
    
    # Keyboard state
    keys_pressed = {}
    keys_just_pressed = {}
    
    shoot_cooldown = 0
    
    # Main game loop
    while game_running:
        # Handle events
        menu_toggled_this_frame = False
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                game_running = False
            elif event.type == pygame.KEYDOWN:
                # Toggle menu with ESC or M (prevent ESC from exiting)
                if event.key in [pygame.K_ESCAPE, pygame.K_m]:
                    menu.toggle()
                    menu_toggled_this_frame = True
                    # Don't add these keys to keys_pressed when toggling menu
                    # This prevents them from being processed elsewhere
                    continue
                keys_pressed[event.key] = True
                keys_just_pressed[event.key] = True
            elif event.type == pygame.KEYUP:
                # Don't process key up for ESC/M if we just toggled menu
                if event.key in [pygame.K_ESCAPE, pygame.K_m] and menu_toggled_this_frame:
                    continue
                keys_pressed[event.key] = False
                keys_just_pressed[event.key] = False
        
        # Handle menu input
        if menu.visible:
            # Use just_pressed for menu navigation (one action per key press)
            menu_keys = {}
            for key in keys_just_pressed:
                if keys_just_pressed.get(key, False):
                    menu_keys[key] = True
            menu.handle_input(menu_keys)
            
            # Clear just_pressed flags after menu handles them
            keys_just_pressed.clear()
            
            # Update game settings from menu
            settings = menu.get_settings()
            num_ai_ships = settings['num_ai_ships']
            num_enemy_ships = settings['num_enemy_ships']
            num_boss_ships = settings['num_boss_ships']
            player_ship_active = settings['player_ship_active']
            anchor_player_ship = settings['anchor_player_ship']
            anchor_alpha_ship = settings['anchor_alpha_ship']
            
            # Update screen size if changed
            new_width = settings['canvas_width']
            new_height = settings['canvas_height']
            if new_width != SCREEN_WIDTH or new_height != SCREEN_HEIGHT:
                SCREEN_WIDTH = new_width
                SCREEN_HEIGHT = new_height
                screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
                menu.screen_width = SCREEN_WIDTH
                menu.screen_height = SCREEN_HEIGHT
            
            # Skip game updates when menu is open
            menu.draw(screen)
            pygame.display.flip()
            clock.tick(FPS)
            continue
        
        # Handle input
        if player_ship_active:
            if keys_pressed.get(pygame.K_LEFT, False):
                ship.rotate(-1)
            if keys_pressed.get(pygame.K_RIGHT, False):
                ship.rotate(1)
            if keys_pressed.get(pygame.K_UP, False):
                ship.thrust()
            if keys_pressed.get(pygame.K_DOWN, False):
                ship.move_backward()
            if keys_pressed.get(pygame.K_SPACE, False) and shoot_cooldown <= 0:
                # Fire bullet
                bullet_x = ship.x + math.cos(ship.angle) * ship.size
                bullet_y = ship.y + math.sin(ship.angle) * ship.size
                bullets.append(Bullet(bullet_x, bullet_y, ship.angle))
                shoot_cooldown = 10
            if keys_pressed.get(pygame.K_h, False):
                ship.hyperspace()
            if keys_pressed.get(pygame.K_f, False):
                ship.shield_active = True
            else:
                ship.shield_active = False
        
        if shoot_cooldown > 0:
            shoot_cooldown -= 1
        
        # Update game objects
        if player_ship_active:
            ship.update()
        
        # Update AI ships count based on settings
        while len(ai_ships) < num_ai_ships:
            ai_ship = AIShip()
            if len(ai_ships) == 0:
                ai_ship.is_alpha = True
            ai_ships.append(ai_ship)
        while len(ai_ships) > num_ai_ships:
            ai_ships.pop()
        
        # Update enemy ships count based on settings
        basic_enemies = [e for e in enemy_ships if e.type == 'basic']
        advanced_enemies = [e for e in enemy_ships if e.type == 'advanced']
        boss_enemies = [e for e in enemy_ships if e.type == 'boss']
        
        total_enemies = len(basic_enemies) + len(advanced_enemies)
        while total_enemies < num_enemy_ships:
            enemy_type = 'advanced' if random.random() < 0.3 else 'basic'
            enemy_ships.append(EnemyShip(ship_type=enemy_type))
            total_enemies += 1
        
        while total_enemies > num_enemy_ships:
            if basic_enemies:
                enemy_ships.remove(basic_enemies.pop())
            elif advanced_enemies:
                enemy_ships.remove(advanced_enemies.pop())
            total_enemies -= 1
        
        while len(boss_enemies) < num_boss_ships:
            enemy_ships.append(EnemyShip(ship_type='boss'))
            boss_enemies.append(enemy_ships[-1])
        
        while len(boss_enemies) > num_boss_ships:
            enemy_ships.remove(boss_enemies.pop())
        
        # Update AI ships
        for ai_ship in ai_ships:
            ai_ship.make_decision(asteroids, enemy_ships, ai_ships, ship if player_ship_active else None)
            ai_ship.update()
        
        # Update asteroids
        for asteroid in asteroids:
            asteroid.update()
        
        # Update enemy ships
        for enemy_ship in enemy_ships[:]:
            enemy_ship.make_decision(asteroids, enemy_ships, ai_ships, 
                                   ship if player_ship_active else None, 
                                   bullets, enemy_bullets)
            enemy_ship.update()
        
        # Update bullets
        bullets = [b for b in bullets if b.is_alive()]
        for bullet in bullets:
            bullet.update()
        
        # Update enemy bullets
        enemy_bullets = [b for b in enemy_bullets if b.is_alive()]
        for bullet in enemy_bullets:
            bullet.update()
        
        # Check bullet-asteroid collisions
        for bullet in bullets[:]:
            for asteroid in asteroids[:]:
                if check_collision(bullet, asteroid):
                    bullets.remove(bullet)
                    asteroids.remove(asteroid)
                    score += 100
                    break
        
        # Check bullet-enemy ship collisions
        for bullet in bullets[:]:
            for enemy_ship in enemy_ships[:]:
                if check_collision(bullet, enemy_ship):
                    bullets.remove(bullet)
                    enemy_ship.health -= 1
                    if enemy_ship.health <= 0:
                        # Award points based on enemy type
                        if enemy_ship.type == 'boss':
                            score += 500
                        elif enemy_ship.type == 'advanced':
                            score += 200
                        else:
                            score += 100
                        enemy_ships.remove(enemy_ship)
                    break
        
        # Check AI bullet-enemy ship collisions
        for ai_ship in ai_ships:
            # AI ships fire bullets that are in the bullets array
            pass  # Already handled above
        
        # Check enemy bullet-player ship collisions
        if player_ship_active:
            for bullet in enemy_bullets[:]:
                if check_collision(bullet, ship):
                    if not ship.shield_active:
                        print(f"Game Over! Final Score: {score}")
                        init_game()
                        ship = Ship()
                        break
                    else:
                        enemy_bullets.remove(bullet)
        
        # Check enemy bullet-AI ship collisions
        for bullet in enemy_bullets[:]:
            for ai_ship in ai_ships[:]:
                if check_collision(bullet, ai_ship):
                    enemy_bullets.remove(bullet)
                    if not ai_ship.shield_active:
                        ai_ship.health -= 1
                        if ai_ship.health <= 0:
                            ai_ships.remove(ai_ship)
                    break
        
        # Check ship-asteroid collisions
        if player_ship_active:
            for asteroid in asteroids:
                if check_collision(ship, asteroid):
                    if not ship.shield_active:
                        print(f"Game Over! Final Score: {score}")
                        init_game()
                        ship = Ship()
                        break
        
        # Check enemy ship-player ship collisions
        if player_ship_active:
            for enemy_ship in enemy_ships:
                if check_collision(ship, enemy_ship):
                    if not ship.shield_active:
                        print(f"Game Over! Final Score: {score}")
                        init_game()
                        ship = Ship()
                        break
        
        # Draw everything
        screen.fill(BLACK)
        
        # Draw asteroids
        for asteroid in asteroids:
            asteroid.draw(screen)
        
        # Draw bullets
        for bullet in bullets:
            bullet.draw(screen)
        
        # Draw enemy bullets
        for bullet in enemy_bullets:
            bullet.draw(screen)
        
        # Draw enemy ships
        for enemy_ship in enemy_ships:
            enemy_ship.draw(screen)
        
        # Draw AI ships
        for ai_ship in ai_ships:
            ai_ship.draw(screen)
        
        # Draw ship
        if player_ship_active:
            ship.draw(screen)
        
        # Draw score
        font = pygame.font.Font(None, 36)
        score_text = font.render(f"Score: {score}", True, YELLOW)
        screen.blit(score_text, (10, 10))
        
        # Draw menu hint
        if not menu.visible:
            hint_font = pygame.font.Font(None, 24)
            hint_text = hint_font.render("Press ESC or M for Menu | Close Window to Exit", True, LIGHT_GRAY)
            screen.blit(hint_text, (10, SCREEN_HEIGHT - 25))
        
        pygame.display.flip()
        clock.tick(FPS)
    
    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()

