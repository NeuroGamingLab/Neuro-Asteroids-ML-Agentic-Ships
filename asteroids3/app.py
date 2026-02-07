##// ============================================
##// Designer Tuệ Hoàng, Eng. 
##// ============================================

import streamlit as st
import streamlit.components.v1 as components

# Page configuration
st.set_page_config(
    page_title="Asteroids Arcade Game",
    page_icon="",
    layout="centered"
)

# Custom CSS to hide Streamlit elements and style the page
st.markdown("""
    <style>
    .main > div {
        padding-top: 1rem;
        padding-left: 1rem;
        padding-right: 1rem;
    }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .stApp {
        max-width: 100%;
        overflow-x: visible !important;
    }
    /* Make ASTEROIDS title span full browser width without breaking layout */
    h1 {
        width: 100% !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
        text-align: center !important;
        box-sizing: border-box !important;
        position: relative !important;
    }
    /* Ensure main container allows full width */
    .main {
        max-width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
    }
    /* Ensure content is visible and not cut off */
    .block-container {
        max-width: 100% !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
    }
    /* Prevent horizontal overflow */
    body {
        overflow-x: visible !important;
    }
    
    /* Sidebar toggle button */
    .sidebar-toggle {
        position: fixed;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        z-index: 999;
        background: rgba(14, 17, 23, 0.9);
        border: 1px solid rgba(250, 250, 250, 0.2);
        border-left: none;
        border-radius: 0 8px 8px 0;
        padding: 10px 5px;
        cursor: pointer;
        transition: all 0.3s ease;
        color: #fafafa;
        font-size: 16px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 30px;
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.2);
    }
    
    .sidebar-toggle:hover {
        background: rgba(14, 17, 23, 1);
        border-color: rgba(250, 250, 250, 0.4);
    }
    
    .sidebar-toggle.collapsed {
        left: 0;
    }
    
    .sidebar-toggle.expanded {
        left: 21rem; /* Approximate sidebar width when open */
    }
    
    /* Hide toggle when sidebar is collapsed by Streamlit */
    [data-testid="stSidebar"][aria-expanded="false"] ~ .sidebar-toggle {
        left: 0;
    }
    
    [data-testid="stSidebar"][aria-expanded="true"] ~ .sidebar-toggle {
        left: 21rem;
    }
    </style>
    <script>
    // Add sidebar toggle button
    function addSidebarToggle() {
        // Remove existing toggle if any
        const existingToggle = document.querySelector('.sidebar-toggle');
        if (existingToggle) {
            existingToggle.remove();
        }
        
        // Create toggle button
        const toggle = document.createElement('div');
        toggle.className = 'sidebar-toggle';
        toggle.innerHTML = '&lt;';
        toggle.title = 'Toggle Sidebar';
        
        // Check initial sidebar state
        const sidebar = document.querySelector('[data-testid="stSidebar"]');
        if (sidebar) {
            const isExpanded = sidebar.getAttribute('aria-expanded') === 'true';
            toggle.innerHTML = isExpanded ? '&lt;' : '&gt;';
            toggle.className = isExpanded ? 'sidebar-toggle expanded' : 'sidebar-toggle collapsed';
        }
        
        // Add click handler
        toggle.addEventListener('click', function() {
            const sidebar = document.querySelector('[data-testid="stSidebar"]');
            if (sidebar) {
                const isExpanded = sidebar.getAttribute('aria-expanded') === 'true';
                
                // Toggle sidebar by clicking the overlay or using Streamlit's method
                if (isExpanded) {
                    // Collapse: click outside sidebar
                    const overlay = document.querySelector('.stApp > div:first-child');
                    if (overlay) {
                        overlay.click();
                    }
                    toggle.innerHTML = '&gt;';
                    toggle.className = 'sidebar-toggle collapsed';
                } else {
                    // Expand: trigger sidebar open (this is tricky in Streamlit)
                    // We'll use a workaround by clicking a button in the sidebar
                    const sidebarButton = sidebar.querySelector('button, [role="button"]');
                    if (sidebarButton) {
                        sidebarButton.click();
                    }
                    toggle.innerHTML = '&lt;';
                    toggle.className = 'sidebar-toggle expanded';
                }
            }
        });
        
        // Monitor sidebar state changes
        const observer = new MutationObserver(function(mutations) {
            const sidebar = document.querySelector('[data-testid="stSidebar"]');
            if (sidebar) {
                const isExpanded = sidebar.getAttribute('aria-expanded') === 'true';
                toggle.innerHTML = isExpanded ? '&lt;' : '&gt;';
                toggle.className = isExpanded ? 'sidebar-toggle expanded' : 'sidebar-toggle collapsed';
            }
        });
        
        if (sidebar) {
            observer.observe(sidebar, { attributes: true, attributeFilter: ['aria-expanded'] });
        }
        
        document.body.appendChild(toggle);
    }
    
    // Add toggle when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addSidebarToggle);
    } else {
        addSidebarToggle();
    }
    
    // Also add after Streamlit renders
    setTimeout(addSidebarToggle, 1000);
    </script>
    """, unsafe_allow_html=True)

# Title
st.title("ASTEROIDS")
st.markdown("---")

# Sidebar with controls (defined before game HTML so value is available)
with st.sidebar:
    st.header("AI Ship Control")
    num_ai_ships = st.slider(
        "Number of AI Ships",
        min_value=0,
        max_value=10,
        value=1,
        step=1,
        help="Adjust the number of AI-controlled ships. New ships spawn at random locations."
    )
    
    st.markdown("---")
    st.header("Enemy Ship Control")
    num_enemy_ships = st.slider(
        "Number of Enemy Ships",
        min_value=0,
        max_value=10,
        value=1,
        step=1,
        help="Adjust the number of enemy ships. Enemies spawn at screen edges and attack the player."
    )
    
    num_boss_ships = st.slider(
        "Number of Boss Ships",
        min_value=0,
        max_value=10,
        value=1,
        step=1,
        help="Adjust the number of boss enemy ships. Boss ships have multiple phases, complex attack patterns, and special abilities."
    )
    
    st.markdown("---")
    st.header("Screen Size Control")
    canvas_width = st.slider(
        "Canvas Width",
        min_value=400,
        max_value=1920,
        value=1200,
        step=100,
        help="Adjust the width of the playing area"
    )
    canvas_height = st.slider(
        "Canvas Height",
        min_value=600,
        max_value=2000,
        value=600,
        step=100,
        help="Adjust the height of the playing area"
    )
    
    st.markdown("---")
    st.header("Player Ship Control")
    player_ship_active = st.toggle(
        "Player Ship Active",
        value=False,
        help="Toggle to activate/deactivate the player ship. When inactive, the ship won't respond to controls."
    )
    
    anchor_player_ship = st.toggle(
        "Anchor Player Ship",
        value=False,
        help="Toggle to anchor the player ship at the center location. When enabled, the ship will stay at the center and cannot move."
    )
    
    st.markdown("---")
    st.header("Attack Patterns")
    alpha_attack_enabled = st.toggle(
        "Alpha Attack Pattern",
        value=False,
        help="Enable coordinated V-formation attacks. One ship (alpha) leads the attack, others follow in formation. Alpha ship is highlighted in gold."
    )
    
    anchor_alpha_ship = st.toggle(
        "Anchor Alpha Ship",
        value=False,
        help="Toggle to anchor the yellow alpha ship at the center location. When enabled, the alpha ship will stay at the center and cannot move."
    )
    
    # Initialize formation settings with defaults
    formation_type = "arrowhead"
    auto_assign_roles = True
    
    if alpha_attack_enabled:
        # PHASE 1: Formation Type Selector
        formation_type = st.selectbox(
            "Formation Type",
            ["arrowhead", "line", "circle", "diamond", "wedge"],
            index=0,
            help="Select formation pattern: Arrowhead (V), Line (horizontal), Circle (defensive), Diamond (4-point), Wedge (tight)"
        )
        
        # PHASE 2: Role Assignment
        auto_assign_roles = st.toggle(
            "Auto-Assign Roles",
            value=True,
            help="Automatically assign roles (Scout, Tank, Support, DPS, Interceptor) to ships based on position. Disable for manual assignment."
        )
        
        st.info("**Phase 2 Features Active:**\n- Flanking maneuvers\n- Role specialization\n- Formation abilities (shield, boost, heal, radar)")
    
    st.markdown("---")
    st.subheader("Phase 3: Advanced Features")
    
    adaptive_formation_value = st.toggle(
        "Adaptive Formations",
        value=False,
        key="adaptive_formation",
        help="Automatically switch formations based on threat level, enemy count, and ship health"
    )
    
    multi_target_mode_value = st.selectbox(
        "Multi-Target Mode",
        ["focus", "split", "prioritize"],
        index=0,
        key="multi_target_mode",
        help="Focus: All ships target same enemy | Split: Ships target different enemies | Prioritize: Assign targets by priority"
    )
    
    escort_mode_value = st.selectbox(
        "Escort & Protection Mode",
        ["none", "escort", "guard", "patrol", "intercept", "cover"],
        index=0,
        key="escort_mode",
        help="Escort: Follow player | Guard: Defend target | Patrol: Circle area | Intercept: Stop threats | Cover: Provide covering fire"
    )
    
    if adaptive_formation_value or multi_target_mode_value != "focus" or escort_mode_value != "none":
        st.info("**Phase 3 Active:** Advanced coordination features enabled.")
    
    st.markdown("---")
    st.subheader("Advanced Attack Patterns")
    
    tactical_sequences_enabled = st.toggle(
        "Tactical Attack Sequences",
        value=True,
        key="tactical_sequences",
        help="Enable Alpha Strike Combo and Wave Attack patterns for coordinated sequential attacks"
    )
    
    formation_transitions_enabled = st.toggle(
        "Dynamic Formation Transitions",
        value=True,
        key="formation_transitions",
        help="Enable Formation Morphing and Split & Merge for dynamic formation changes during combat"
    )
    
    advanced_flanking_enabled = st.toggle(
        "Advanced Flanking Patterns",
        value=True,
        key="advanced_flanking",
        help="Enable Hammer & Anvil and Scissors Attack for advanced tactical flanking maneuvers"
    )
    
    if tactical_sequences_enabled or formation_transitions_enabled or advanced_flanking_enabled:
        st.info("**Advanced Patterns Active:** High-impact tactical attack patterns enabled.")
    
    st.markdown("---")
    st.header("ML/AI Integration")
    ml_enabled = st.toggle(
        "Enable ML Mode",
        value=False,
        help="Enable machine learning enhancements for AI ships."
    )
    
    ml_mode = "parameters"
    if ml_enabled:
        ml_mode = st.selectbox(
            "ML Mode",
            ["parameters", "priorities", "both", "full"],
            index=0,
            help="Select ML integration level: Parameters (Phase 5.1), Priorities (Phase 5.2), Both, or Full (Phase 5.3)"
        )
        
        if ml_mode == "parameters":
            st.info("Phase 5.1: ML Parameter Tuning adapts AI ship parameters dynamically based on threat level, enemy count, and flock density.")
        elif ml_mode == "priorities":
            st.info("Phase 5.2: ML Priority Weights adapts decision-making priorities based on game state. AI ships will prioritize actions more intelligently.")
        elif ml_mode == "both":
            st.info("Phase 5.1 + 5.2: Both ML Parameter Tuning and Priority Weights are active. AI ships will adapt both parameters and decision priorities.")
        else:
            st.info("Phase 5.3: Full ML Decision Making - AI ships use ML model to predict actions directly with safety validation. Rule-based system provides fallback.")
    
    st.markdown("---")
    st.header("Multi-Agent RL (MARL)")
    marl_enabled = st.toggle(
        "Enable MARL Cooperative AI",
        value=False,
        help="Enable Multi-Agent Reinforcement Learning for cooperative behaviors. AI ships will learn to coordinate and work together."
    )
    marl_training = False
    if marl_enabled:
        marl_training = st.toggle(
            "Training Mode",
            value=False,
            help="Enable training mode to collect experiences and update the policy. Disable for inference with trained model."
        )
        st.info("MARL enables AI ships to learn cooperative behaviors like formation flying, target coordination, and mutual protection through reinforcement learning.")
    
    st.markdown("---")
    st.header("3D Mode (Experimental)")
    use_3d = st.toggle(
        "Enable 3D Rendering",
        value=False,
        help="Switch to 3D rendering using Three.js. This is a proof of concept - basic 3D ship with movement."
    )
    # st.info("3D mode is experimental. Currently shows a 3D ship with basic movement. Full 3D conversion in progress.")
    
    st.markdown("---")
    st.markdown("**Designed by Tuệ Hoàng, *AI/ML Eng.***")
    st.markdown("**Hayden (14) and Hugo (10) — *Gaming Specialists***")
    st.caption("*With assistance from multi-LLM.*")

# Read the game files and combine them
def get_game_html(num_ai_ships, num_enemy_ships, num_boss_ships, canvas_width, canvas_height, player_ship_active, ml_enabled, anchor_player_ship=False, ml_mode="parameters", marl_enabled=False, marl_training=False, use_3d=False, alpha_attack_enabled=False, anchor_alpha_ship=False, formation_type="arrowhead", auto_assign_roles=True, adaptive_formation=False, multi_target_mode="focus", escort_mode="none", tactical_sequences=True, formation_transitions=True, advanced_flanking=True):
    # Read CSS
    with open('style.css', 'r') as f:
        css = f.read()
    
    # Read JavaScript (2D or 3D based on toggle)
    if use_3d:
        # Read 3D game JavaScript
        try:
            with open('game3d.js', 'r') as f:
                js = f.read()
        except FileNotFoundError:
            # Fallback to 2D if 3D file doesn't exist
            with open('game.js', 'r') as f:
                js = f.read()
    else:
        # Read 2D game JavaScript
        with open('game.js', 'r') as f:
            js = f.read()
    
    # Read MARL JavaScript files if MARL is enabled
    marl_js = ""
    if marl_enabled:
        try:
            with open('marl_environment.js', 'r') as f:
                marl_js += f.read() + "\n"
            with open('marl_system.js', 'r') as f:
                marl_js += f.read() + "\n"
            with open('marl_integration.js', 'r') as f:
                marl_js += f.read() + "\n"
        except FileNotFoundError as e:
            print(f"Warning: MARL file not found: {e}")
            marl_js = "// MARL files not found\n"
    
    # Combine into single HTML
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        {f"<script src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'></script>" if use_3d else ""}
        <style>
        {css}
        body {{
            margin: 0;
            padding: 0;
            overflow: hidden;
            width: {canvas_width}px;
            max-width: {canvas_width}px;
        }}
        .game-container {{
            padding: 10px;
            width: {canvas_width}px;
            max-width: {canvas_width}px;
            margin: 0 auto;
            box-sizing: border-box;
        }}
        #gameCanvas {{
            cursor: crosshair;
            width: {canvas_width}px !important;
            height: {canvas_height}px !important;
            display: block;
            margin: 0 auto;
            /* GPU Hardware Acceleration Hints */
            transform: translateZ(0);
            will-change: contents;
            -webkit-transform: translateZ(0);
            -moz-transform: translateZ(0);
            -ms-transform: translateZ(0);
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
        }}
        #gameCanvas:-webkit-full-screen {{
            width: 100%;
            height: 100%;
        }}
        #gameCanvas:-moz-full-screen {{
            width: 100%;
            height: 100%;
        }}
        #gameCanvas:-ms-fullscreen {{
            width: 100%;
            height: 100%;
        }}
        #gameCanvas:fullscreen {{
            width: 100%;
            height: 100%;
        }}
        .focus-hint {{
            color: #00ff00;
            font-size: 0.9em;
            margin-top: 10px;
            margin-bottom: 10px;
            padding: 5px;
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
        }}
        #score, #aiShipCount, #enemyShipCount, #bossShipCount {{
            color: #ffff00;
            font-weight: bold;
        }}
        </style>
    </head>
    <body>
        <div class="game-container">
            <div class="focus-hint">
                Click on the game area to focus and use arrow keys<br>
                Score: <span id="score">0</span><br>
                Active AI Ships: <span id="aiShipCount">0</span><br>
                Active AI Enemy Ships: <span id="enemyShipCount">0</span><br>
                Active Boss AI Ships: <span id="bossShipCount">0</span><br>
                Designed by Tuệ Hoàng, <em>AI/ML Eng.</em><br>
                Hayden (14) and Hugo (10) — <em>Gaming Specialists</em><br>
                <em>With assistance from multi-LLM.</em>
            </div>
            <div id="debug3d-status" style="background: rgba(255, 255, 0, 0.2); border: 1px solid #ffff00; padding: 5px; margin: 5px 0; font-size: 0.85em; color: #ffff00;">
                <strong>3D Debug Status:</strong> Not initialized
            </div>
            <canvas id="gameCanvas"></canvas>
            <div class="controls">
                <p><strong>Controls:</strong></p>
                <p>Arrow Keys: Move ship (↑ forward, ↓ back, ← left, → right)</p>
                <p>Space: Fire / Speed Boost</p>
                <p>F: Shield Force</p>
                <p>H: Hyperspace</p>
                <p>ESC: Toggle Fullscreen</p>
                <br>
                <p style="margin-top: 20px; text-align: center; color: #888; font-size: 0.9em;">
                    Designed by Tuệ Hoàng, <em>AI/ML Eng.</em><br>
                    Hayden (14) and Hugo (10) — <em>Gaming Specialists</em><br>
                    <em>With assistance from multi-LLM.</em>
                </p>
            </div>
            <div class="score">Score: <span id="score">0</span></div>
        </div>
        <script>
        {marl_js}
        {js}
        // Set number of AI ships from Streamlit
        (function() {{
            const targetCount = {num_ai_ships};
            if (typeof setNumAIShips === 'function') {{
                setNumAIShips(targetCount);
            }} else {{
                // Wait for function to be available
                setTimeout(function() {{
                    if (typeof setNumAIShips === 'function') {{
                        setNumAIShips(targetCount);
                    }}
                }}, 100);
            }}
        }})();
        
        // Set number of enemy ships from Streamlit
        (function() {{
            const targetCount = {num_enemy_ships};
            if (typeof setNumEnemyShips === 'function') {{
                setNumEnemyShips(targetCount);
            }} else {{
                // Wait for function to be available
                setTimeout(function() {{
                    if (typeof setNumEnemyShips === 'function') {{
                        setNumEnemyShips(targetCount);
                    }}
                }}, 100);
            }}
        }})();
        
        // Set number of boss ships from Streamlit
        (function() {{
            const targetCount = {num_boss_ships};
            if (typeof setNumBossShips === 'function') {{
                setNumBossShips(targetCount);
            }} else {{
                // Wait for function to be available
                setTimeout(function() {{
                    if (typeof setNumBossShips === 'function') {{
                        setNumBossShips(targetCount);
                    }}
                }}, 100);
            }}
        }})();
        
        // Set canvas size from Streamlit
        (function() {{
            const width = {canvas_width};
            const height = {canvas_height};
            if (typeof setCanvasSize === 'function') {{
                setCanvasSize(width, height);
            }} else {{
                // Wait for function to be available
                setTimeout(function() {{
                    if (typeof setCanvasSize === 'function') {{
                        setCanvasSize(width, height);
                    }}
                }}, 100);
            }}
        }})();
        
        // Set player ship active state from Streamlit
        (function() {{
            // Default to true if not explicitly set
            const activeState = {str(player_ship_active).lower()};
            const isActive = activeState === 'true' || activeState === true;
            
            // Set state immediately if function is available
            if (typeof setPlayerShipActive === 'function') {{
                setPlayerShipActive(isActive);
            }}
            
            // Ensure function is called after game initialization
            function setActiveState() {{
                if (typeof setPlayerShipActive === 'function') {{
                    setPlayerShipActive(isActive);
                }} else {{
                    setTimeout(setActiveState, 100);
                }}
            }}
            
            // Wait for game to initialize, then set state again to ensure it sticks
            setTimeout(setActiveState, 300);
            
            // Also set it periodically to override any resets (but less frequently)
            setInterval(function() {{
                if (typeof setPlayerShipActive === 'function') {{
                    setPlayerShipActive(isActive);
                }}
            }}, 2000);
        }})();
        
        // Set anchor player ship state from Streamlit
        (function() {{
            const anchorState = {str(anchor_player_ship).lower()};
            const isAnchored = anchorState === 'true' || anchorState === true;
            
            // Set state immediately if function is available
            if (typeof setAnchorPlayerShip === 'function') {{
                setAnchorPlayerShip(isAnchored);
            }}
            
            // Ensure function is called after game initialization
            function setAnchorState() {{
                if (typeof setAnchorPlayerShip === 'function') {{
                    setAnchorPlayerShip(isAnchored);
                }} else {{
                    setTimeout(setAnchorState, 100);
                }}
            }}
            
            // Wait for game to initialize, then set state again to ensure it sticks
            setTimeout(setAnchorState, 300);
            
            // Also set it periodically to override any resets (but less frequently)
            setInterval(function() {{
                if (typeof setAnchorPlayerShip === 'function') {{
                    setAnchorPlayerShip(isAnchored);
                }}
            }}, 2000);
        }})();
        
        // Set ML mode from Streamlit
        (function() {{
            const mlState = {str(ml_enabled).lower()};
            const mlEnabled = mlState === 'true' || mlState === true;
            const mlMode = '{ml_mode}';
            
            // Set state immediately if function is available
            if (typeof setMLMode === 'function') {{
                setMLMode(mlEnabled, mlMode);
            }}
            
            // Ensure function is called after game initialization
            function setMLState() {{
                if (typeof setMLMode === 'function') {{
                    setMLMode(mlEnabled, mlMode);
                }} else {{
                    setTimeout(setMLState, 100);
                }}
            }}
            
            // Wait for game to initialize, then set state again to ensure it sticks
            setTimeout(setMLState, 300);
            
            // Also set it periodically to override any resets (but less frequently)
            setInterval(function() {{
                if (typeof setMLMode === 'function') {{
                    setMLMode(mlEnabled);
                }}
            }}, 2000);
        }})();
        
        // Set MARL mode from Streamlit
        (function() {{
            const marlState = {str(marl_enabled).lower()};
            const marlTrainingState = {str(marl_training).lower()};
            const marlEnabled = marlState === 'true' || marlState === true;
            const marlTraining = marlTrainingState === 'true' || marlTrainingState === true;
            
            // Set state immediately if function is available
            if (typeof setMARLMode === 'function') {{
                setMARLMode(marlEnabled, marlTraining);
            }}
            
            // Ensure function is called after game initialization
            function setMARLState() {{
                if (typeof setMARLMode === 'function') {{
                    setMARLMode(marlEnabled, marlTraining);
                }} else {{
                    setTimeout(setMARLState, 100);
                }}
            }}
            
            // Wait for game to initialize, then set state again to ensure it sticks
            setTimeout(setMARLState, 500);
            
            // Also set it periodically to override any resets (but less frequently)
            setInterval(function() {{
                if (typeof setMARLMode === 'function') {{
                    setMARLMode(marlEnabled, marlTraining);
                }}
            }}, 2000);
        }})();
        
        // Set Alpha Attack mode from Streamlit
        (function() {{
            const alphaState = {str(alpha_attack_enabled).lower()};
            const alphaEnabled = alphaState === 'true' || alphaState === true;
            
            // Set state immediately if function is available
            if (typeof setAlphaAttackEnabled === 'function') {{
                setAlphaAttackEnabled(alphaEnabled);
            }}
            
            // Ensure function is called after game initialization
            function setAlphaState() {{
                if (typeof setAlphaAttackEnabled === 'function') {{
                    setAlphaAttackEnabled(alphaEnabled);
                }} else {{
                    setTimeout(setAlphaState, 100);
                }}
            }}
            
            setTimeout(setAlphaState, 300);
            
            // Also set it periodically to ensure it sticks
            setInterval(function() {{
                if (typeof setAlphaAttackEnabled === 'function') {{
                    setAlphaAttackEnabled(alphaEnabled);
                }}
            }}, 2000);
        }})();
        
        // Set anchor alpha ship state from Streamlit
        (function() {{
            const anchorState = {str(anchor_alpha_ship).lower()};
            const isAnchored = anchorState === 'true' || anchorState === true;
            
            // Set state immediately if function is available
            if (typeof setAnchorAlphaShip === 'function') {{
                setAnchorAlphaShip(isAnchored);
            }}
            
            // Ensure function is called after game initialization
            function setAnchorState() {{
                if (typeof setAnchorAlphaShip === 'function') {{
                    setAnchorAlphaShip(isAnchored);
                }} else {{
                    setTimeout(setAnchorState, 100);
                }}
            }}
            
            // Wait for game to initialize, then set state again to ensure it sticks
            setTimeout(setAnchorState, 300);
            
            // Also set it periodically to override any resets (but less frequently)
            setInterval(function() {{
                if (typeof setAnchorAlphaShip === 'function') {{
                    setAnchorAlphaShip(isAnchored);
                }}
            }}, 2000);
        }})();
        
        // PHASE 1 & 2: Set Formation Type and Role Assignment
        (function() {{
            const formationType = '{formation_type}';
            const autoAssignRoles = {str(auto_assign_roles).lower()};
            const adaptiveFormation = {str(adaptive_formation).lower()};
            const multiTargetMode = '{multi_target_mode}';
            const escortMode = '{escort_mode}';
            const tacticalSequences = {str(tactical_sequences).lower()};
            const formationTransitions = {str(formation_transitions).lower()};
            const advancedFlanking = {str(advanced_flanking).lower()};
            
            // Set formation type
            if (typeof setFormationType === 'function') {{
                setFormationType(formationType);
            }}
            
            // Set auto-assign roles
            if (typeof setAutoAssignRoles === 'function') {{
                setAutoAssignRoles(autoAssignRoles === 'true' || autoAssignRoles === true);
            }}
            
            // PHASE 3: Set adaptive formation
            if (typeof setAdaptiveFormation === 'function') {{
                setAdaptiveFormation(adaptiveFormation === 'true' || adaptiveFormation === true);
            }}
            
            // PHASE 3: Set multi-target mode
            if (typeof setMultiTargetMode === 'function') {{
                setMultiTargetMode(multiTargetMode);
            }}
            
            // PHASE 3: Set escort mode
            if (typeof setEscortMode === 'function') {{
                setEscortMode(escortMode);
            }}
            
            // Ensure functions are called after game initialization
            function setFormationState() {{
                if (typeof setFormationType === 'function') {{
                    setFormationType(formationType);
                }} else {{
                    setTimeout(setFormationState, 100);
                }}
            }}
            
            function setRoleState() {{
                if (typeof setAutoAssignRoles === 'function') {{
                    setAutoAssignRoles(autoAssignRoles === 'true' || autoAssignRoles === true);
                }} else {{
                    setTimeout(setRoleState, 100);
                }}
            }}
            
            setTimeout(setFormationState, 300);
            setTimeout(setRoleState, 300);
            
            // Also set periodically to ensure they stick
            setInterval(function() {{
                if (typeof setFormationType === 'function') {{
                    setFormationType(formationType);
                }}
                if (typeof setAutoAssignRoles === 'function') {{
                    setAutoAssignRoles(autoAssignRoles === 'true' || autoAssignRoles === true);
                }}
                if (typeof setAdaptiveFormation === 'function') {{
                    setAdaptiveFormation(adaptiveFormation === 'true' || adaptiveFormation === true);
                }}
                if (typeof setMultiTargetMode === 'function') {{
                    setMultiTargetMode(multiTargetMode);
                }}
                if (typeof setEscortMode === 'function') {{
                    setEscortMode(escortMode);
                }}
                if (typeof setTacticalSequences === 'function') {{
                    setTacticalSequences(tacticalSequences === 'true' || tacticalSequences === true);
                }}
                if (typeof setFormationTransitions === 'function') {{
                    setFormationTransitions(formationTransitions === 'true' || formationTransitions === true);
                }}
                if (typeof setAdvancedFlanking === 'function') {{
                    setAdvancedFlanking(advancedFlanking === 'true' || advancedFlanking === true);
                }}
            }}, 2000);
        }})();
        </script>
        {"<script>setTimeout(function() {{ if (typeof initGame3D === 'function' && typeof THREE !== 'undefined') {{ initGame3D(); }} else {{ console.error('3D initialization failed - Three.js or initGame3D not available'); }} }}, 500);</script>" if use_3d else ""}
    </body>
    </html>
    """
    return html

# Embed the game
formation_type_value = formation_type if alpha_attack_enabled else "arrowhead"
auto_assign_roles_value = auto_assign_roles if alpha_attack_enabled else True
game_html = get_game_html(num_ai_ships, num_enemy_ships, num_boss_ships, canvas_width, canvas_height, player_ship_active, ml_enabled, anchor_player_ship, ml_mode, marl_enabled, marl_training, use_3d, alpha_attack_enabled, anchor_alpha_ship, formation_type_value, auto_assign_roles_value, adaptive_formation_value, multi_target_mode_value, escort_mode_value, tactical_sequences_enabled, formation_transitions_enabled, advanced_flanking_enabled)
# Adjust component dimensions to match canvas + UI elements
# Height: canvas height + status bar (~40px) + controls section (~150px) + padding (~20px)
# Removed 1200px cap to allow full canvas height
component_height = canvas_height + 210
# Note: components.html() doesn't support width parameter, width is controlled via CSS
components.html(game_html, height=component_height, scrolling=False)

