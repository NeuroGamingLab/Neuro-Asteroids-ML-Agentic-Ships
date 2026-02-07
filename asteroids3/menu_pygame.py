#!/usr/bin/env python3
"""
Menu System for Asteroids Game
Provides all controls from the Streamlit version
"""

import pygame
from typing import Dict, Any, Callable

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
YELLOW = (255, 255, 0)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
GRAY = (128, 128, 128)
DARK_GRAY = (64, 64, 64)
LIGHT_GRAY = (192, 192, 192)
GOLD = (255, 215, 0)

class MenuItem:
    """Base class for menu items"""
    def __init__(self, label: str, value: Any, callback: Callable = None):
        self.label = label
        self.value = value
        self.callback = callback
    
    def draw(self, screen, x, y, width, font, selected=False):
        """Draw menu item"""
        color = YELLOW if selected else WHITE
        text = font.render(f"{self.label}: {self.value}", True, color)
        screen.blit(text, (x, y))
        return y + 30

class SliderItem(MenuItem):
    """Slider menu item"""
    def __init__(self, label: str, value: int, min_val: int, max_val: int, 
                 callback: Callable = None, step: int = 1):
        super().__init__(label, value, callback)
        self.min_val = min_val
        self.max_val = max_val
        self.step = step
    
    def increase(self):
        """Increase value"""
        self.value = min(self.max_val, self.value + self.step)
        if self.callback:
            self.callback(self.value)
    
    def decrease(self):
        """Decrease value"""
        self.value = max(self.min_val, self.value - self.step)
        if self.callback:
            self.callback(self.value)
    
    def draw(self, screen, x, y, width, font, selected=False):
        """Draw slider"""
        color = YELLOW if selected else WHITE
        text = font.render(f"{self.label}: {self.value}", True, color)
        screen.blit(text, (x, y))
        
        # Draw slider bar
        bar_x = x + 200
        bar_y = y + 10
        bar_width = 200
        bar_height = 10
        pygame.draw.rect(screen, DARK_GRAY, (bar_x, bar_y, bar_width, bar_height))
        
        # Draw slider position
        pos = int((self.value - self.min_val) / (self.max_val - self.min_val) * bar_width)
        pygame.draw.rect(screen, GREEN, (bar_x, bar_y, pos, bar_height))
        
        # Draw arrows
        arrow_font = pygame.font.Font(None, 24)
        left_arrow = arrow_font.render("<", True, color)
        right_arrow = arrow_font.render(">", True, color)
        screen.blit(left_arrow, (bar_x - 20, bar_y - 2))
        screen.blit(right_arrow, (bar_x + bar_width + 5, bar_y - 2))
        
        return y + 30

class ToggleItem(MenuItem):
    """Toggle menu item"""
    def __init__(self, label: str, value: bool, callback: Callable = None):
        super().__init__(label, value, callback)
    
    def toggle(self):
        """Toggle value"""
        self.value = not self.value
        if self.callback:
            self.callback(self.value)
    
    def draw(self, screen, x, y, width, font, selected=False):
        """Draw toggle"""
        color = YELLOW if selected else WHITE
        status = "ON" if self.value else "OFF"
        status_color = GREEN if self.value else RED
        text = font.render(f"{self.label}:", True, color)
        status_text = font.render(status, True, status_color)
        screen.blit(text, (x, y))
        screen.blit(status_text, (x + 200, y))
        return y + 30

class SelectItem(MenuItem):
    """Select menu item"""
    def __init__(self, label: str, value: str, options: list, callback: Callable = None):
        super().__init__(label, value, callback)
        self.options = options
    
    def next(self):
        """Next option"""
        idx = self.options.index(self.value)
        idx = (idx + 1) % len(self.options)
        self.value = self.options[idx]
        if self.callback:
            self.callback(self.value)
    
    def prev(self):
        """Previous option"""
        idx = self.options.index(self.value)
        idx = (idx - 1) % len(self.options)
        self.value = self.options[idx]
        if self.callback:
            self.callback(self.value)
    
    def draw(self, screen, x, y, width, font, selected=False):
        """Draw select"""
        color = YELLOW if selected else WHITE
        text = font.render(f"{self.label}: {self.value}", True, color)
        screen.blit(text, (x, y))
        
        # Draw arrows
        arrow_font = pygame.font.Font(None, 24)
        left_arrow = arrow_font.render("<", True, color)
        right_arrow = arrow_font.render(">", True, color)
        screen.blit(left_arrow, (x + 300, y))
        screen.blit(right_arrow, (x + 350, y))
        
        return y + 30

class Menu:
    """Menu system for game settings"""
    def __init__(self, screen_width: int, screen_height: int):
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.visible = False
        self.selected_index = 0
        self.scroll_offset = 0  # Scroll offset for menu items
        self.items = []
        self.sections = []
        self.settings = {}
        
        # Initialize settings with defaults
        self._init_settings()
        self._create_menu_items()
    
    def _init_settings(self):
        """Initialize default settings"""
        self.settings = {
            # AI Ship Control
            'num_ai_ships': 1,
            # Enemy Ship Control
            'num_enemy_ships': 2,
            'num_boss_ships': 1,
            # Screen Size Control
            'canvas_width': 1200,
            'canvas_height': 600,
            # Player Ship Control
            'player_ship_active': True,
            'anchor_player_ship': False,
            # Attack Patterns
            'alpha_attack_enabled': False,
            'anchor_alpha_ship': False,
            'formation_type': 'arrowhead',
            'auto_assign_roles': True,
            # Phase 3 Features
            'adaptive_formation': False,
            'multi_target_mode': 'focus',
            'escort_mode': 'none',
            # Advanced Attack Patterns
            'tactical_sequences': True,
            'formation_transitions': True,
            'advanced_flanking': True,
            # ML/AI Integration
            'ml_enabled': False,
            'ml_mode': 'parameters',
            # MARL
            'marl_enabled': False,
            'marl_training': False,
            # 3D Mode
            'use_3d': False,
        }
    
    def _create_menu_items(self):
        """Create menu items"""
        self.items = []
        self.sections = []
        
        # AI Ship Control
        self.sections.append(("AI Ship Control", len(self.items)))
        self.items.append(SliderItem("Number of AI Ships", self.settings['num_ai_ships'], 
                                    0, 10, lambda v: self._update_setting('num_ai_ships', v)))
        
        # Enemy Ship Control
        self.sections.append(("Enemy Ship Control", len(self.items)))
        self.items.append(SliderItem("Number of Enemy Ships", self.settings['num_enemy_ships'],
                                    0, 10, lambda v: self._update_setting('num_enemy_ships', v)))
        self.items.append(SliderItem("Number of Boss Ships", self.settings['num_boss_ships'],
                                    0, 10, lambda v: self._update_setting('num_boss_ships', v)))
        
        # Screen Size Control
        self.sections.append(("Screen Size Control", len(self.items)))
        self.items.append(SliderItem("Canvas Width", self.settings['canvas_width'],
                                    400, 1920, lambda v: self._update_setting('canvas_width', v), 100))
        self.items.append(SliderItem("Canvas Height", self.settings['canvas_height'],
                                    600, 2000, lambda v: self._update_setting('canvas_height', v), 100))
        
        # Player Ship Control
        self.sections.append(("Player Ship Control", len(self.items)))
        self.items.append(ToggleItem("Player Ship Active", self.settings['player_ship_active'],
                                    lambda v: self._update_setting('player_ship_active', v)))
        self.items.append(ToggleItem("Anchor Player Ship", self.settings['anchor_player_ship'],
                                    lambda v: self._update_setting('anchor_player_ship', v)))
        
        # Attack Patterns
        self.sections.append(("Attack Patterns", len(self.items)))
        self.items.append(ToggleItem("Alpha Attack Pattern", self.settings['alpha_attack_enabled'],
                                    lambda v: self._update_setting('alpha_attack_enabled', v)))
        self.items.append(ToggleItem("Anchor Alpha Ship", self.settings['anchor_alpha_ship'],
                                    lambda v: self._update_setting('anchor_alpha_ship', v)))
        self.items.append(SelectItem("Formation Type", self.settings['formation_type'],
                                    ['arrowhead', 'line', 'circle', 'diamond', 'wedge'],
                                    lambda v: self._update_setting('formation_type', v)))
        self.items.append(ToggleItem("Auto-Assign Roles", self.settings['auto_assign_roles'],
                                    lambda v: self._update_setting('auto_assign_roles', v)))
        
        # Phase 3 Features
        self.sections.append(("Phase 3: Advanced Features", len(self.items)))
        self.items.append(ToggleItem("Adaptive Formations", self.settings['adaptive_formation'],
                                    lambda v: self._update_setting('adaptive_formation', v)))
        self.items.append(SelectItem("Multi-Target Mode", self.settings['multi_target_mode'],
                                    ['focus', 'split', 'prioritize'],
                                    lambda v: self._update_setting('multi_target_mode', v)))
        self.items.append(SelectItem("Escort & Protection Mode", self.settings['escort_mode'],
                                    ['none', 'escort', 'guard', 'patrol', 'intercept', 'cover'],
                                    lambda v: self._update_setting('escort_mode', v)))
        
        # Advanced Attack Patterns
        self.sections.append(("Advanced Attack Patterns", len(self.items)))
        self.items.append(ToggleItem("Tactical Attack Sequences", self.settings['tactical_sequences'],
                                    lambda v: self._update_setting('tactical_sequences', v)))
        self.items.append(ToggleItem("Dynamic Formation Transitions", self.settings['formation_transitions'],
                                    lambda v: self._update_setting('formation_transitions', v)))
        self.items.append(ToggleItem("Advanced Flanking Patterns", self.settings['advanced_flanking'],
                                    lambda v: self._update_setting('advanced_flanking', v)))
        
        # ML/AI Integration
        self.sections.append(("ML/AI Integration", len(self.items)))
        self.items.append(ToggleItem("Enable ML Mode", self.settings['ml_enabled'],
                                    lambda v: self._update_setting('ml_enabled', v)))
        self.items.append(SelectItem("ML Mode", self.settings['ml_mode'],
                                    ['parameters', 'priorities', 'both', 'full'],
                                    lambda v: self._update_setting('ml_mode', v)))
        
        # MARL
        self.sections.append(("Multi-Agent RL (MARL)", len(self.items)))
        self.items.append(ToggleItem("Enable MARL Cooperative AI", self.settings['marl_enabled'],
                                    lambda v: self._update_setting('marl_enabled', v)))
        self.items.append(ToggleItem("Training Mode", self.settings['marl_training'],
                                    lambda v: self._update_setting('marl_training', v)))
        
        # 3D Mode
        self.sections.append(("3D Mode (Experimental)", len(self.items)))
        self.items.append(ToggleItem("Enable 3D Rendering", self.settings['use_3d'],
                                    lambda v: self._update_setting('use_3d', v)))
    
    def _update_setting(self, key: str, value: Any):
        """Update setting"""
        self.settings[key] = value
    
    def _update_scroll(self):
        """Update scroll offset to keep selected item visible"""
        max_items_visible = 18  # Number of items that can fit on screen
        if self.selected_index < self.scroll_offset:
            self.scroll_offset = self.selected_index
        elif self.selected_index >= self.scroll_offset + max_items_visible:
            self.scroll_offset = self.selected_index - max_items_visible + 1
    
    def toggle(self):
        """Toggle menu visibility"""
        self.visible = not self.visible
        if self.visible:
            self.selected_index = 0
            self.scroll_offset = 0
    
    def handle_input(self, keys_pressed):
        """Handle menu input"""
        if not self.visible:
            return
        
        # Navigation (only move if key was just pressed)
        if keys_pressed.get(pygame.K_UP, False):
            self.selected_index = max(0, self.selected_index - 1)
            # Auto-scroll to keep selected item visible
            self._update_scroll()
        if keys_pressed.get(pygame.K_DOWN, False):
            self.selected_index = min(len(self.items) - 1, self.selected_index + 1)
            # Auto-scroll to keep selected item visible
            self._update_scroll()
        
        # Selection
        if keys_pressed.get(pygame.K_RIGHT, False) or keys_pressed.get(pygame.K_RETURN, False):
            item = self.items[self.selected_index]
            if isinstance(item, SliderItem):
                item.increase()
            elif isinstance(item, ToggleItem):
                item.toggle()
            elif isinstance(item, SelectItem):
                item.next()
        
        if keys_pressed.get(pygame.K_LEFT, False):
            item = self.items[self.selected_index]
            if isinstance(item, SliderItem):
                item.decrease()
            elif isinstance(item, SelectItem):
                item.prev()
    
    def draw(self, screen):
        """Draw menu"""
        if not self.visible:
            return
        
        # Semi-transparent overlay
        overlay = pygame.Surface((self.screen_width, self.screen_height))
        overlay.set_alpha(200)
        overlay.fill(BLACK)
        screen.blit(overlay, (0, 0))
        
        # Menu panel - make it taller to show more items
        panel_width = 650
        panel_height = min(900, self.screen_height - 20)
        panel_x = (self.screen_width - panel_width) // 2
        panel_y = (self.screen_height - panel_height) // 2
        
        # Draw panel background
        pygame.draw.rect(screen, DARK_GRAY, (panel_x, panel_y, panel_width, panel_height))
        pygame.draw.rect(screen, WHITE, (panel_x, panel_y, panel_width, panel_height), 2)
        
        # Title
        title_font = pygame.font.Font(None, 48)
        title_text = title_font.render("GAME SETTINGS", True, YELLOW)
        title_rect = title_text.get_rect(center=(self.screen_width // 2, panel_y + 30))
        screen.blit(title_text, title_rect)
        
        # Instructions
        font = pygame.font.Font(None, 24)
        inst_text = font.render("Arrow Keys: Navigate | Enter/Right: Increase/Select | Left: Decrease | ESC/M: Close Menu", 
                               True, LIGHT_GRAY)
        screen.blit(inst_text, (panel_x + 10, panel_y + 60))
        
        # Menu items
        item_font = pygame.font.Font(None, 28)
        y = panel_y + 100
        max_items_visible = (panel_height - 140) // 30  # More space for items
        
        # Use scroll_offset to determine visible range
        visible_start = self.scroll_offset
        visible_end = min(len(self.items), visible_start + max_items_visible)
        
        # Draw sections and items
        current_section = None
        for i in range(visible_start, visible_end):
            item = self.items[i]
            
            # Check if we need to draw a section header
            for section_name, section_start in self.sections:
                if i == section_start:
                    section_font = pygame.font.Font(None, 32)
                    section_text = section_font.render(section_name, True, GOLD)
                    screen.blit(section_text, (panel_x + 20, y))
                    y += 35
                    break
            
            # Draw item
            selected = (i == self.selected_index)
            y = item.draw(screen, panel_x + 30, y, panel_width - 60, item_font, selected)
        
        # Draw scroll indicators
        if self.scroll_offset > 0:
            # Show "↑" at top if scrolled down
            scroll_font = pygame.font.Font(None, 36)
            up_arrow = scroll_font.render("↑", True, YELLOW)
            screen.blit(up_arrow, (panel_x + panel_width - 30, panel_y + 100))
        
        if visible_end < len(self.items):
            # Show "↓" at bottom if more items below
            scroll_font = pygame.font.Font(None, 36)
            down_arrow = scroll_font.render("↓", True, YELLOW)
            screen.blit(down_arrow, (panel_x + panel_width - 30, panel_y + panel_height - 50))
        
        # Credits
        credit_font = pygame.font.Font(None, 20)
        credit_text = credit_font.render("Designed by Tuệ Hoàng, AI/ML Eng. | Hayden & Hugo, Gaming Specialists | With assistance from multi-LLM", 
                                        True, LIGHT_GRAY)
        credit_rect = credit_text.get_rect(center=(self.screen_width // 2, panel_y + panel_height - 20))
        screen.blit(credit_text, credit_rect)
    
    def get_settings(self) -> Dict[str, Any]:
        """Get current settings"""
        return self.settings.copy()

