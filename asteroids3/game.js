// ============================================
// Designer Tuệ Hoàng, Eng. 
// ============================================

// Game Canvas Setup
const canvas = document.getElementById('gameCanvas');
// Try to get hardware-accelerated 2D context, fallback to regular 2D
let ctx = null;
try {
    // Request hardware acceleration hints
    ctx = canvas.getContext('2d', {
        alpha: false, // Opaque background for better performance
        desynchronized: false, // Keep synchronized for better compatibility
        willReadFrequently: false // Optimize for rendering, not reading
    });
    
    // Enable hardware acceleration if available
    if (ctx && ctx.imageSmoothingEnabled !== undefined) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    }
    
    console.log('[GPU] 2D Canvas context initialized with hardware acceleration hints');
} catch (e) {
    // Fallback to regular 2D context
    ctx = canvas.getContext('2d');
    console.log('[GPU] Using standard 2D context (hardware acceleration may not be available)');
}
const scoreElement = document.getElementById('score');
const aiShipCountElement = document.getElementById('aiShipCount');
const enemyShipCountElement = document.getElementById('enemyShipCount');
const bossShipCountElement = document.getElementById('bossShipCount');

// Audio Context for sound effects
let audioContext = null;
let audioContextResumed = false;

// Initialize audio context
function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
            return;
        }
    }
    
    // Resume audio context if suspended (required by browsers)
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            audioContextResumed = true;
            console.log('Audio context resumed');
        }).catch(err => {
            console.log('Could not resume audio context:', err);
        });
    } else {
        audioContextResumed = true;
    }
}

// Resume audio on user interaction
canvas.addEventListener('click', () => {
    if (!audioContextResumed) {
        initAudioContext();
    }
}, { once: false });

// Also try to resume on key press
document.addEventListener('keydown', () => {
    if (!audioContextResumed) {
        initAudioContext();
    }
}, { once: false });

// Initialize audio context on page load
initAudioContext();

// Sound effects functions
function playFireSound(isAIBullet = false) {
    if (!audioContext || !audioContextResumed) {
        // Try to resume if not already resumed
        if (audioContext && audioContext.state === 'suspended') {
            initAudioContext();
        }
        return;
    }
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different frequencies for player vs AI
        if (isAIBullet) {
            // AI ship sound - slightly lower pitch
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.05);
        } else {
            // Player ship sound - higher pitch
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.05);
        }
        
        oscillator.type = 'square'; // Square wave for sharper sound
        
        // Envelope for quick attack and decay (increased volume)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01); // Increased from 0.1 to 0.2
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
    } catch (e) {
        console.log('Error playing sound:', e);
    }
}

// Set canvas size
let defaultWidth = 1200;
let defaultHeight = 600;
canvas.width = defaultWidth;
canvas.height = defaultHeight;

// Function to set canvas size (called from Streamlit)
window.setCanvasSize = function(width, height) {
    defaultWidth = width;
    defaultHeight = height;
    canvas.width = width;
    canvas.height = height;
    
    // Reposition player ship to center if needed
    if (ship) {
        ship.x = canvas.width / 2;
        ship.y = canvas.height / 2;
    }
    
    // Update AI ships positions if needed
    if (aiShips && aiShips.length > 0) {
        aiShips.forEach(aiShip => {
            if (aiShip) {
                // Keep ships within bounds
                if (aiShip.x > canvas.width) aiShip.x = canvas.width * 0.25;
                if (aiShip.y > canvas.height) aiShip.y = canvas.height * 0.25;
            }
        });
    }
};

// Fullscreen state
let isFullscreen = false;

// Fullscreen functions
function enterFullscreen() {
    const elem = canvas;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

function toggleFullscreen() {
    if (!isFullscreen) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}

// Handle fullscreen change events
function handleFullscreenChange() {
    isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                     document.mozFullScreenElement || document.msFullscreenElement);
    
    if (isFullscreen) {
        // Resize canvas to fullscreen
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        // Restore default size
        canvas.width = defaultWidth;
        canvas.height = defaultHeight;
    }
}

// Listen for fullscreen changes
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

// Game state
let score = 0;
let gameRunning = true;
let playerShipActive = true; // Player ship active state
let anchorPlayerShip = false; // Anchor player ship at center
let anchorAlphaShip = false; // Anchor alpha ship at center

// Function to set player ship active state (called from Streamlit)
window.setPlayerShipActive = function(isActive) {
    playerShipActive = isActive;
    console.log('Player ship active state changed to:', isActive);
};

// Function to set anchor player ship state (called from Streamlit)
window.setAnchorPlayerShip = function(isAnchored) {
    anchorPlayerShip = isAnchored;
    console.log('Anchor player ship state changed to:', isAnchored);
    // If anchoring, immediately reset ship to center and stop velocity
    if (isAnchored && ship) {
        ship.x = canvas.width / 2;
        ship.y = canvas.height / 2;
        ship.velocityX = 0;
        ship.velocityY = 0;
    }
};

// Function to set anchor alpha ship state (called from Streamlit)
window.setAnchorAlphaShip = function(isAnchored) {
    anchorAlphaShip = isAnchored;
    console.log('Anchor alpha ship state changed to:', isAnchored);
    // If anchoring, immediately reset alpha ship to center and stop velocity
    if (isAnchored) {
        aiShips.forEach(aiShip => {
            if (aiShip && aiShip.isAlpha) {
                aiShip.x = canvas.width / 2;
                aiShip.y = canvas.height / 2;
                aiShip.velocityX = 0;
                aiShip.velocityY = 0;
            }
        });
    }
};

// Ship class
class Ship {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.angle = 0; // Rotation angle in radians
        this.velocityX = 0;
        this.velocityY = 0;
        this.rotationSpeed = 0.1;
        this.thrustPower = 0.15;
        this.friction = 0.98; // Momentum decay
        this.maxVelocity = 8; // Maximum velocity limit
        this.size = 20;
        this.radius = 15; // For collision detection
        this.shieldActive = false;
        this.shieldRadius = 40; // Shield force field radius
        this.shieldForce = 0.5; // Force strength to repel asteroids
    }

    rotate(direction) {
        // direction: 1 for right, -1 for left
        this.angle += direction * this.rotationSpeed;
    }

    thrust(power = 1) {
        // Apply thrust in the direction the ship is facing
        this.velocityX += Math.cos(this.angle) * this.thrustPower * power;
        this.velocityY += Math.sin(this.angle) * this.thrustPower * power;
    }

    moveBackward() {
        // Move backward (opposite direction)
        this.velocityX -= Math.cos(this.angle) * this.thrustPower * 0.5;
        this.velocityY -= Math.sin(this.angle) * this.thrustPower * 0.5;
    }

    moveLeft() {
        // Strafe left
        this.velocityX -= Math.cos(this.angle - Math.PI / 2) * this.thrustPower * 0.7;
        this.velocityY -= Math.sin(this.angle - Math.PI / 2) * this.thrustPower * 0.7;
    }

    moveRight() {
        // Strafe right
        this.velocityX -= Math.cos(this.angle + Math.PI / 2) * this.thrustPower * 0.7;
        this.velocityY -= Math.sin(this.angle + Math.PI / 2) * this.thrustPower * 0.7;
    }

    update() {
        // Apply friction (momentum decay)
        this.velocityX *= this.friction;
        this.velocityY *= this.friction;

        // Limit maximum velocity
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (currentSpeed > this.maxVelocity) {
            const ratio = this.maxVelocity / currentSpeed;
            this.velocityX *= ratio;
            this.velocityY *= ratio;
        }

        // ANCHOR PLAYER SHIP: Keep player ship at center when anchored
        if (this === ship && anchorPlayerShip) {
            // Force position to center
            this.x = canvas.width / 2;
            this.y = canvas.height / 2;
            // Reset velocity to prevent drift
            this.velocityX = 0;
            this.velocityY = 0;
        }
        // ALPHA SHIP: Keep alpha ship at center when anchor toggle is enabled
        else if (this.isAlpha && anchorAlphaShip) {
            // Force position to center
            this.x = canvas.width / 2;
            this.y = canvas.height / 2;
            // Reset velocity to prevent drift
            this.velocityX = 0;
            this.velocityY = 0;
        } else {
            // Normal update for non-alpha ships
            // Update position
            this.x += this.velocityX;
            this.y += this.velocityY;

            // Wrap around screen edges
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }
    }

    hyperspace() {
        // Teleport to random location
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        // Small chance of self-destruction (10% chance)
        if (Math.random() < 0.1) {
            this.velocityX = 0;
            this.velocityY = 0;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw shield force field when active
        if (this.shieldActive) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, this.shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Pulsing effect
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, this.shieldRadius + Math.sin(Date.now() / 100) * 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        
        ctx.rotate(this.angle);

        // Draw triangular ship
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.size, 0); // Nose of the ship
        ctx.lineTo(-this.size / 2, -this.size / 2); // Top back
        ctx.lineTo(-this.size / 2, this.size / 2); // Bottom back
        ctx.closePath();
        ctx.stroke();

        // Draw three gun barrels
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1.5;
        // Center gun barrel
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(this.size + 8, 0);
        ctx.stroke();
        // Left gun barrel
        ctx.beginPath();
        ctx.moveTo(this.size - 3, -this.size / 4);
        ctx.lineTo(this.size + 6, -this.size / 3);
        ctx.stroke();
        // Right gun barrel
        ctx.beginPath();
        ctx.moveTo(this.size - 3, this.size / 4);
        ctx.lineTo(this.size + 6, this.size / 3);
        ctx.stroke();

        // Draw thruster effect when moving
        if (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1) {
            ctx.strokeStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(-this.size / 2, -this.size / 4);
            ctx.lineTo(-this.size - 5, 0);
            ctx.lineTo(-this.size / 2, this.size / 4);
            ctx.stroke();
        }

        ctx.restore();
    }

    getPosition() {
        return { x: this.x, y: this.y, radius: this.radius };
    }
}

// Bullet class
class Bullet {
    constructor(x, y, angle, isAIBullet = false) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8;
        this.radius = 3;
        this.lifetime = 60; // Frames before bullet disappears
        this.isAIBullet = isAIBullet; // Distinguish AI bullets from player bullets
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.lifetime--;

        // Wrap around screen
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        // AI bullets are blue, player bullets are yellow
        ctx.fillStyle = this.isAIBullet ? '#00aaff' : '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    isAlive() {
        return this.lifetime > 0;
    }

    getPosition() {
        return { x: this.x, y: this.y, radius: this.radius };
    }
}

// Asteroid class
class Asteroid {
    constructor(x = null, y = null) {
        // Random position if not provided
        if (x === null || y === null) {
            // Spawn at edge of screen
            const side = Math.floor(Math.random() * 4);
            switch (side) {
                case 0: // Top
                    this.x = Math.random() * canvas.width;
                    this.y = 0;
                    break;
                case 1: // Right
                    this.x = canvas.width;
                    this.y = Math.random() * canvas.height;
                    break;
                case 2: // Bottom
                    this.x = Math.random() * canvas.width;
                    this.y = canvas.height;
                    break;
                case 3: // Left
                    this.x = 0;
                    this.y = Math.random() * canvas.height;
                    break;
            }
        } else {
            this.x = x;
            this.y = y;
        }

        // Random velocity in all directions
        const speed = 1 + Math.random() * 2;
        const angle = Math.random() * Math.PI * 2;
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;

        this.size = 30 + Math.random() * 30;
        this.radius = this.size / 2;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.vertices = this.generateVertices();
    }

    generateVertices() {
        // Generate irregular polygon vertices
        const vertices = [];
        const numVertices = 8 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numVertices; i++) {
            const angle = (Math.PI * 2 * i) / numVertices;
            const distance = this.size / 2 + (Math.random() - 0.5) * 10;
            vertices.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance
            });
        }
        return vertices;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.rotation += this.rotationSpeed;

        // Wrap around screen edges
        if (this.x < -this.size) this.x = canvas.width + this.size;
        if (this.x > canvas.width + this.size) this.x = -this.size;
        if (this.y < -this.size) this.y = canvas.height + this.size;
        if (this.y > canvas.height + this.size) this.y = -this.size;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }

    getPosition() {
        return { x: this.x, y: this.y, radius: this.radius };
    }
}

// AI Ship class - extends Ship with AI navigation
class AIShip extends Ship {
    constructor(x, y) {
        super();
        this.x = x || canvas.width * 0.25;
        this.y = y || canvas.height * 0.25;
        this.velocityX = 0;
        this.velocityY = 0;
        this.angle = Math.PI / 2; // Start facing up
        this.detectionRadius = 100; // How far ahead to look for asteroids
        this.avoidanceForce = 0.3; // How strongly to avoid asteroids
        this.thrustFrequency = 0.02; // Probability of thrusting each frame
        this.targetAngle = this.angle;
        // Firing parameters
        this.shootCooldown = 0;
        this.firingRange = 200; // Increased maximum distance to consider firing
        this.imminentThreatDistance = 80; // Increased distance for emergency firing
        this.collisionAngleThreshold = Math.PI / 3; // 60 degrees - wider firing arc
        this.minAsteroidSize = 15; // Fire at smaller asteroids too
        this.rapidFireCooldown = 3; // Very short cooldown for rapid continuous firing
        // Enemy detection and combat
        this.enemyDetectionRadius = 300; // Range to detect enemy ships
        this.enemyFiringRange = 250; // Range to fire at enemy ships
        // Flocking parameters
        this.flockRadius = 150; // Distance to consider for flocking
        this.separationDistance = 60; // Minimum distance to maintain from other AI ships
        this.alignmentRadius = 100; // Distance for alignment behavior
        this.cohesionRadius = 120; // Distance for cohesion behavior
        this.flockWeight = 0.3; // Weight of flocking behavior
        // Defensive flocking (when enemies present) - ENHANCED
        this.defensiveSeparationDistance = 25; // Much tighter spacing when enemies present (was 40)
        this.defensiveCohesionRadius = 60; // Tighter group when enemies present (was 80)
        this.defensiveFlockWeight = 0.8; // Stronger flocking when enemies present (was 0.6)
        this.defensiveFormationType = 'circle'; // 'circle' or 'line' formation
        this.mutualProtectionEnabled = true; // Enable mutual protection for low-health allies
        
        // Health and combat system (similar to boss ships)
        this.maxHealth = 3; // AI ships have 3 health points
        this.health = this.maxHealth;
        this.originalMaxHealth = 3; // Store original maxHealth for alpha bonus restoration
        this.aiPhase = 1; // 1, 2, or 3 based on health
        this.shieldActive = false;
        this.shieldCooldown = 0;
        this.shieldDuration = 0;
        this.phaseTransitionTimer = 0;
        
        // Healing system
        this.healingCooldown = 0; // Cooldown between healing contacts (frames)
        this.healingCooldownMax = 180; // 3 seconds at 60fps
        this.lastHealTime = 0; // Frame when last healed
        this.healingRange = 30; // Distance for healing contact
        this.seekHealingRange = 400; // Range to detect Phase 1 allies for seeking
        
        // Alpha Attack Pattern System
        this.isAlpha = false; // Is this ship the alpha leader?
        this.alphaShip = null; // Reference to the alpha leader ship
        this.formationPosition = null; // Position in V-formation (left, right, or center)
        this.formationAngle = 0; // Angle offset for V-formation
        this.formationDistance = 80; // Distance behind alpha in formation
        this.formationSpread = 60; // Spread angle for V-formation (degrees)
        this.alphaAttackTarget = null; // Target enemy for alpha attack
        this.alphaAttackCooldown = 0; // Cooldown between alpha attacks
        this.alphaAttackCooldownMax = 300; // 5 seconds at 60fps
        
        // Phase 2: Dynamic Formation Types
        this.formationType = (typeof formationType !== 'undefined' ? formationType : 'arrowhead'); // 'arrowhead', 'line', 'circle', 'diamond', 'wedge'
        this.formationTypeChanged = false; // Flag for visual update
        
        // Phase 2: Role Specialization
        this.role = null; // 'scout', 'tank', 'support', 'dps', 'interceptor', null (auto-assigned)
        this.roleAssigned = false; // Whether role has been assigned
        this.roleAbilities = {
            scout: { speed: 1.3, detection: 1.5, health: 0.9 },
            tank: { speed: 0.8, detection: 0.9, health: 1.5, shield: 1.3 },
            support: { speed: 1.0, detection: 1.2, health: 1.1, healing: 1.5 },
            dps: { speed: 1.1, detection: 1.0, health: 0.9, damage: 1.5, fireRate: 1.3 },
            interceptor: { speed: 1.4, detection: 1.3, health: 0.95 }
        };
        
        // Phase 2: Formation Abilities
        this.formationShieldActive = false; // Combined shield when in formation
        this.formationBoostActive = false; // Speed boost when in formation
        this.formationHealActive = false; // Healing aura when in formation
        this.formationRadarActive = false; // Extended detection in formation
        this.formationAbilityCooldown = 0;
        this.formationAbilityCooldownMax = 600; // 10 seconds at 60fps
        
        // Phase 2: Flanking Maneuvers
        this.flankingMode = 'none'; // 'none', 'side', 'pincer', 'encirclement'
        this.flankingPosition = null; // Target position for flanking
        this.flankingCooldown = 0;
        this.flankingCooldownMax = 450; // 7.5 seconds at 60fps
        
        // Phase 3: Adaptive Formations
        this.adaptiveFormationEnabled = false; // Auto-switch formations based on situation
        this.lastFormationSwitch = 0; // Frame when last switched
        this.formationSwitchCooldown = 300; // 5 seconds cooldown between switches
        
        // Phase 3: Multi-Target Coordination
        this.assignedTarget = null; // Specific target assigned to this ship
        this.targetPriority = 0; // Priority of assigned target
        this.multiTargetMode = 'focus'; // 'focus', 'split', 'prioritize'
        
        // Phase 3: Escort & Protection Modes
        this.escortMode = 'none'; // 'none', 'escort', 'guard', 'patrol', 'intercept', 'cover'
        this.escortTarget = null; // Target to escort/protect (player ship or ally)
        this.escortDistance = 100; // Distance to maintain from escort target
        this.escortAngle = 0; // Angle offset for escort position
        this.patrolCenter = null; // Center point for patrol mode
        this.patrolRadius = 200; // Patrol radius
        this.interceptTarget = null; // Target to intercept
        
        // Advanced Alpha Attack Patterns: Tactical Attack Sequences
        this.attackSequence = 'none'; // 'none', 'alphaStrike', 'wave'
        this.attackSequenceTimer = 0; // Timer for attack sequence
        this.attackSequencePhase = 0; // Current phase in sequence (0, 1, 2, ...)
        this.waveNumber = 0; // Wave number for wave attacks
        
        // Advanced Alpha Attack Patterns: Dynamic Formation Transitions
        this.formationMorphing = false; // Is formation currently morphing?
        this.formationMorphTarget = null; // Target formation type to morph to
        this.formationMorphProgress = 0; // 0-1, progress of morph
        this.splitFormation = false; // Is formation split?
        this.splitGroups = []; // Array of split groups
        this.mergeTimer = 0; // Timer for merge after split
        
        // Advanced Alpha Attack Patterns: Advanced Flanking Patterns
        this.flankPattern = 'none'; // 'none', 'hammerAnvil', 'scissors'
        this.flankPosition = null; // Target position for flanking
        this.flankTimer = 0; // Timer for flanking maneuver
        
        // Phase 5.1: ML/AI Integration - Parameter Tuning
        this.mlEnabled = false; // Toggle for ML mode
        this.mlModel = null; // Will be loaded from trained model (placeholder for now)
        this.useMLParameters = false; // Use ML-suggested parameters
        
        // Phase 5.2: ML Priority Weights
        this.useMLPriorities = false; // Use ML-suggested priority weights
        
        // Phase 5.3: Full ML Decision Making
        this.useMLDecisions = false; // Use ML for direct action prediction
        this.mlActionCache = null; // Cache ML action predictions
        this.mlActionCacheFrame = 0; // Frame when cache was created
        this.mlActionCacheInterval = 5; // Update ML action every 5 frames (performance)
        
        // Base parameters (rule-based fallback)
        this.baseDetectionRadius = 100;
        this.baseFiringRange = 200;
        this.baseFlockWeight = 0.3;
        this.baseThrustFrequency = 0.02;
        this.baseEnemyFiringRange = 250;
        
        // Base priority weights (rule-based fallback)
        this.basePriorityWeights = {
            avoidShips: 1.0,      // Always highest (safety)
            fireAtEnemies: 0.8,   // High priority for combat
            protectAllies: 0.6,   // Medium-high priority
            fireAtAsteroids: 0.4,  // Medium priority
            avoidAsteroids: 0.3,   // Medium-low priority
            randomNav: 0.1        // Low priority
        };
        
        // ML-suggested parameters (updated by ML model)
        this.mlDetectionRadius = this.baseDetectionRadius;
        this.mlFiringRange = this.baseFiringRange;
        this.mlFlockWeight = this.baseFlockWeight;
        this.mlThrustFrequency = this.baseThrustFrequency;
        this.mlEnemyFiringRange = this.baseEnemyFiringRange;
        
        // ML-suggested priority weights (updated by ML model)
        this.mlPriorityWeights = {...this.basePriorityWeights};
        
        // ML inference caching (run every N frames for performance)
        this.mlInferenceFrame = 0;
        this.mlInferenceInterval = 5; // Run ML every 5 frames (12 times per second)
        
        // Phase 5.1: Data collection for ML training (optional)
        this.collectTrainingData = false; // Enable via Streamlit if needed
        this.trainingDataBuffer = []; // Buffer to store training samples
        this.maxTrainingSamples = 1000; // Max samples to keep in memory
    }

    // Find nearest asteroid in path
    findNearestAsteroid(asteroids) {
        let nearest = null;
        let nearestDistance = Infinity;
        
        asteroids.forEach(asteroid => {
            const dx = asteroid.x - this.x;
            const dy = asteroid.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if asteroid is in front of ship (within detection radius)
            const angleToAsteroid = Math.atan2(dy, dx);
            const angleDiff = Math.abs(this.normalizeAngle(angleToAsteroid - this.angle));
            
            // Consider asteroids in front (within 120 degrees) and within detection radius
            if (distance < this.detectionRadius && angleDiff < Math.PI * 2/3) {
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = { asteroid, distance, angle: angleToAsteroid };
                }
            }
        });
        
        return nearest;
    }

    // Find nearest ship (AI or player) that's too close
    findNearestShip(aiShips, playerShip) {
        let nearest = null;
        let nearestDistance = Infinity;
        const avoidanceDistance = 80; // Distance to start avoiding other ships
        
        // Check player ship
        if (playerShip && playerShipActive) {
            const dx = playerShip.x - this.x;
            const dy = playerShip.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < avoidanceDistance && distance > 0) {
                const angleToShip = Math.atan2(dy, dx);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = { ship: playerShip, distance, angle: angleToShip, isPlayer: true };
                }
            }
        }
        
        // Check other AI ships
        aiShips.forEach(aiShip => {
            if (aiShip && aiShip !== this) { // Don't check self
                const dx = aiShip.x - this.x;
                const dy = aiShip.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < avoidanceDistance && distance > 0) {
                    const angleToShip = Math.atan2(dy, dx);
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearest = { ship: aiShip, distance, angle: angleToShip, isPlayer: false };
                    }
                }
            }
        });
        
        return nearest;
    }

    // Normalize angle to -PI to PI range
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }
    
    // Find nearest Phase 1 ally for healing
    findNearestPhase1Ally(aiShips) {
        if (this.aiPhase !== 3) return null; // Only Phase 3 ships seek healing
        
        let nearest = null;
        let nearestDistance = Infinity;
        
        aiShips.forEach(ally => {
            if (ally && ally !== this && ally.aiPhase === 1) { // Only Phase 1 allies
                const dx = ally.x - this.x;
                const dy = ally.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.seekHealingRange && distance < nearestDistance) {
                    nearestDistance = distance;
                    const angleToAlly = Math.atan2(dy, dx);
                    nearest = { ally, distance, angle: angleToAlly, dx, dy };
                }
            }
        });
        
        return nearest;
    }
    
    // ALPHA ATTACK: Select alpha ship from available AI ships
    static selectAlphaShip(aiShips) {
        if (!alphaAttackEnabled || aiShips.length === 0) return null;
        
        // IMPROVED: Enhanced alpha ship selection with multiple factors
        let bestCandidate = null;
        let bestScore = -Infinity;
        
        aiShips.forEach(ship => {
            if (!ship) return;
            
            let score = 0;
            
            // Factor 1: Phase preference (strongest factor)
            if (ship.aiPhase === 1) {
                score += 200; // Phase 1 ships are ideal (was 100)
            } else if (ship.aiPhase === 2) {
                score += 50; // Phase 2 ships are acceptable
            } else if (ship.aiPhase === 3) {
                score -= 30; // Phase 3 penalty reduced (was -50) - still selectable when needed
            }
            
            // Factor 2: Health level (scaled by maxHealth for fairness)
            const healthRatio = ship.health / (ship.maxHealth || 3);
            score += healthRatio * 100; // 0-100 points based on health percentage
            
            // Factor 3: Absolute health value (prefer ships with more HP)
            score += ship.health * 15; // Increased from 10 to 15
            
            // Factor 4: Distance from center (alpha stays at center, so closer is better)
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const dx = ship.x - centerX;
            const dy = ship.y - centerY;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
            const centerProximity = 1.0 - Math.min(1.0, distanceFromCenter / maxDistance);
            score += centerProximity * 30; // Bonus for being near center (0-30 points)
            
            // Factor 5: Shield status (prefer ships with shields available)
            if (ship.shieldCooldown <= 0) {
                score += 20; // Shield ready bonus
            }
            
            // Factor 6: Role consideration (prefer DPS or balanced roles for alpha)
            if (ship.role === 'dps' || ship.role === null) {
                score += 10; // DPS or no role is good for alpha
            } else if (ship.role === 'support') {
                score += 5; // Support can be alpha but less ideal
            }
            
            // Factor 7: Avoid ships that are currently seeking healing (they're in trouble)
            if (ship.healingCooldown > 0) {
                score -= 15; // Penalty for ships that recently needed healing
            }
            
            // Factor 8: Prefer ships not currently in formation (easier transition)
            if (!ship.alphaShip) {
                score += 5; // Not following anyone is a small bonus
            }
            
            // IMPROVED: Better handling of all-low-health scenario
            // When all ships are Phase 3, still select the best one
            if (ship.aiPhase === 3) {
                // Additional scoring for Phase 3 ships to differentiate them
                // Higher health Phase 3 ships are still better than lower health ones
                score += (ship.health - 0.5) * 20; // Extra weight on health when in Phase 3
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestCandidate = ship;
            }
        });
        
        // IMPROVED: Enhanced fallback logic
        if (!bestCandidate && aiShips.length > 0) {
            // Fallback 1: Select ship with highest health
            bestCandidate = aiShips.reduce((best, ship) => {
                if (!ship) return best;
                if (!best) return ship;
                return ship.health > best.health ? ship : best;
            }, null);
            
            // Fallback 2: If still no candidate, select first available
            if (!bestCandidate) {
                bestCandidate = aiShips.find(ship => ship);
            }
        }
        
        return bestCandidate;
    }
    
    // ALPHA ATTACK: Find alpha ship and assign roles
    findAlphaShip(aiShips) {
        if (!alphaAttackEnabled) {
            // Restore original maxHealth when alpha attack is disabled
            if (this.isAlpha && this.originalMaxHealth) {
                this.maxHealth = this.originalMaxHealth;
                this.health = Math.min(this.health, this.maxHealth);
                this.originalMaxHealth = null;
            }
            this.isAlpha = false;
            this.alphaShip = null;
            return null;
        }
        
        // Find or select alpha
        let alpha = null;
        aiShips.forEach(ship => {
            if (ship && ship.isAlpha) {
                alpha = ship;
            }
        });
        
        // If no alpha exists, select one
        if (!alpha) {
            alpha = AIShip.selectAlphaShip(aiShips);
            if (alpha) {
                // Store original maxHealth if not already stored
                if (!alpha.originalMaxHealth) {
                    alpha.originalMaxHealth = alpha.maxHealth;
                }
                // Apply 25% bonus to alpha ship
                alpha.maxHealth = Math.ceil(alpha.originalMaxHealth * 1.25);
                alpha.health = Math.min(alpha.health, alpha.maxHealth); // Cap current health to new max
                alpha.isAlpha = true;
                alpha.alphaShip = null; // Alpha doesn't follow itself
                // Position alpha ship at center of screen
                alpha.x = canvas.width / 2;
                alpha.y = canvas.height / 2;
                alpha.velocityX = 0;
                alpha.velocityY = 0;
            }
        }
        
        // Update this ship's alpha reference
        if (alpha === this) {
            // Store original maxHealth if not already stored
            if (!this.originalMaxHealth) {
                this.originalMaxHealth = this.maxHealth;
            }
            // Apply 25% bonus to alpha ship
            this.maxHealth = Math.ceil(this.originalMaxHealth * 1.25);
            this.health = Math.min(this.health, this.maxHealth); // Cap current health to new max
            this.isAlpha = true;
            this.alphaShip = null;
            // Position alpha ship at center of screen
            this.x = canvas.width / 2;
            this.y = canvas.height / 2;
            this.velocityX = 0;
            this.velocityY = 0;
        } else {
            // Restore original maxHealth when no longer alpha
            if (this.isAlpha && this.originalMaxHealth) {
                this.maxHealth = this.originalMaxHealth;
                this.health = Math.min(this.health, this.maxHealth);
                this.originalMaxHealth = null; // Clear stored value
            }
            this.isAlpha = false;
            this.alphaShip = alpha;
        }
        
        return alpha;
    }
    
    // ALPHA ATTACK: Calculate V-formation position
    calculateFormationPosition(aiShips) {
        if (!this.alphaShip || !this.alphaShip.isAlpha) {
            this.formationPosition = null;
            return null;
        }
        
        const alpha = this.alphaShip;
        
        // Count wingmen (non-alpha ships)
        const wingmen = aiShips.filter(ship => ship && ship !== alpha && ship.alphaShip === alpha);
        const myIndex = wingmen.indexOf(this);
        
        if (myIndex < 0) {
            this.formationPosition = null;
            return null;
        }
        
        // Assign formation positions: left, right, left, right, etc.
        const isLeft = myIndex % 2 === 0;
        const row = Math.floor(myIndex / 2);
        
        // Calculate formation angle offset
        const spreadRad = (this.formationSpread * Math.PI) / 180; // Convert to radians
        const angleOffset = isLeft ? -spreadRad : spreadRad;
        
        // Calculate target position behind alpha
        const formationDist = this.formationDistance + (row * 40); // Stagger rows
        const targetAngle = alpha.angle + angleOffset;
        
        const targetX = alpha.x - Math.cos(targetAngle) * formationDist;
        const targetY = alpha.y - Math.sin(targetAngle) * formationDist;
        
        return {
            x: targetX,
            y: targetY,
            angle: alpha.angle, // Match alpha's angle
            distance: Math.sqrt(
                (targetX - this.x) ** 2 + (targetY - this.y) ** 2
            )
        };
    }
    
    // ALPHA ATTACK: Execute alpha attack behavior
    executeAlphaAttack(enemyShips) {
        if (!alphaAttackEnabled || !this.alphaShip) return null;
        
        const alpha = this.alphaShip;
        
        // Alpha selects target
        if (this.isAlpha) {
            // Find best enemy target
            let bestTarget = null;
            let bestScore = -1;
            
            enemyShips.forEach(enemy => {
                if (!enemy) return;
                
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.enemyDetectionRadius) {
                    // Score based on proximity and threat
                    let score = 1 / (distance + 1);
                    // Prefer boss enemies (higher threat)
                    if (enemy.aiType === 'boss') score *= 1.5;
                    // Prefer lower health enemies
                    score *= (1 + (enemy.maxHealth - enemy.health) / enemy.maxHealth);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = enemy;
                    }
                }
            });
            
            if (bestTarget && this.alphaAttackCooldown === 0) {
                this.alphaAttackTarget = bestTarget;
                return bestTarget;
            }
        } else {
            // Wingmen follow alpha's target
            if (alpha.alphaAttackTarget) {
                this.alphaAttackTarget = alpha.alphaAttackTarget;
                return alpha.alphaAttackTarget;
            }
        }
        
        return null;
    }
    
    // PHASE 2: Assign role to ship (auto-assign or manual)
    assignRole(aiShips) {
        if (!alphaAttackEnabled || this.roleAssigned) return;
        
        if (autoAssignRoles) {
            // Auto-assign based on ship characteristics and position
            const wingmen = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this.alphaShip);
            const myIndex = wingmen.indexOf(this);
            
            if (this.isAlpha) {
                // Alpha is usually a balanced role, but can be specialized
                this.role = 'dps'; // Default alpha to DPS for offensive leadership
            } else {
                // Assign roles based on position in formation
                const roles = ['scout', 'tank', 'support', 'dps', 'interceptor'];
                this.role = roles[myIndex % roles.length];
            }
        }
        
        // Apply role modifiers
        if (this.role && this.roleAbilities[this.role]) {
            const abilities = this.roleAbilities[this.role];
            // Role modifiers are applied dynamically in decision-making
        }
        
        this.roleAssigned = true;
    }
    
    // PHASE 2: Calculate formation position based on formation type
    calculateFormationPositionAdvanced(aiShips) {
        if (!this.alphaShip || !this.alphaShip.isAlpha) {
            this.formationPosition = null;
            return null;
        }
        
        const alpha = this.alphaShip;
        const currentFormationType = this.formationType || formationType || 'arrowhead';
        const wingmen = aiShips.filter(ship => ship && ship !== alpha && ship.alphaShip === alpha);
        const myIndex = wingmen.indexOf(this);
        
        if (myIndex < 0) {
            this.formationPosition = null;
            return null;
        }
        
        let targetX, targetY, targetAngle;
        
        switch (currentFormationType) {
            case 'arrowhead': // V-formation (existing)
                const isLeft = myIndex % 2 === 0;
                const row = Math.floor(myIndex / 2);
                const spreadRad = (this.formationSpread * Math.PI) / 180;
                const angleOffset = isLeft ? -spreadRad : spreadRad;
                const formationDist = this.formationDistance + (row * 40);
                targetAngle = alpha.angle + angleOffset;
                targetX = alpha.x - Math.cos(targetAngle) * formationDist;
                targetY = alpha.y - Math.sin(targetAngle) * formationDist;
                targetAngle = alpha.angle;
                break;
                
            case 'line': // Horizontal line formation
                const lineSpacing = 60;
                const lineOffset = (myIndex - (wingmen.length - 1) / 2) * lineSpacing;
                const perpAngle = alpha.angle + Math.PI / 2;
                targetX = alpha.x + Math.cos(perpAngle) * lineOffset;
                targetY = alpha.y + Math.sin(perpAngle) * lineOffset;
                targetAngle = alpha.angle;
                break;
                
            case 'circle': // Circle formation around alpha
                const circleRadius = 100;
                const angleStep = (2 * Math.PI) / Math.max(wingmen.length, 1);
                const circleAngle = alpha.angle + Math.PI + (angleStep * myIndex);
                targetX = alpha.x + Math.cos(circleAngle) * circleRadius;
                targetY = alpha.y + Math.sin(circleAngle) * circleRadius;
                targetAngle = circleAngle + Math.PI; // Face outward
                break;
                
            case 'diamond': // Diamond formation
                const diamondSize = 80;
                let diamondX = 0, diamondY = 0;
                if (myIndex === 0) { diamondX = 0; diamondY = -diamondSize; } // Top
                else if (myIndex === 1) { diamondX = diamondSize; diamondY = 0; } // Right
                else if (myIndex === 2) { diamondX = 0; diamondY = diamondSize; } // Bottom
                else if (myIndex === 3) { diamondX = -diamondSize; diamondY = 0; } // Left
                else {
                    // Additional ships form outer ring
                    const outerAngle = (myIndex - 4) * (2 * Math.PI / (wingmen.length - 4));
                    diamondX = Math.cos(outerAngle) * (diamondSize * 1.5);
                    diamondY = Math.sin(outerAngle) * (diamondSize * 1.5);
                }
                targetX = alpha.x + Math.cos(alpha.angle) * diamondX - Math.sin(alpha.angle) * diamondY;
                targetY = alpha.y + Math.sin(alpha.angle) * diamondX + Math.cos(alpha.angle) * diamondY;
                targetAngle = alpha.angle;
                break;
                
            case 'wedge': // Tight wedge formation
                const wedgeSpread = 30 * Math.PI / 180; // 30 degrees
                const wedgeDist = 60 + (Math.floor(myIndex / 2) * 30);
                const wedgeOffset = (myIndex % 2 === 0 ? -1 : 1) * wedgeSpread;
                targetAngle = alpha.angle + wedgeOffset;
                targetX = alpha.x - Math.cos(targetAngle) * wedgeDist;
                targetY = alpha.y - Math.sin(targetAngle) * wedgeDist;
                targetAngle = alpha.angle;
                break;
                
            default: // Fallback to arrowhead
                return this.calculateFormationPosition(aiShips);
        }
        
        return {
            x: targetX,
            y: targetY,
            angle: targetAngle,
            distance: Math.sqrt(
                (targetX - this.x) ** 2 + (targetY - this.y) ** 2
            )
        };
    }
    
    // PHASE 2: Execute flanking maneuver
    executeFlankingManeuver(enemyShips, aiShips) {
        if (!alphaAttackEnabled || !this.alphaShip || this.flankingCooldown > 0) return null;
        
        const alpha = this.alphaShip;
        if (!alpha.alphaAttackTarget) return null;
        
        const target = alpha.alphaAttackTarget;
        const dx = target.x - alpha.x;
        const dy = target.y - alpha.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Determine flanking mode based on situation
        if (distance < 200 && enemyShips.length > 0) {
            const wingmen = aiShips.filter(ship => ship && ship !== alpha && ship.alphaShip === alpha);
            const myIndex = wingmen.indexOf(this);
            
            if (myIndex >= 0) {
                // Side attack: split to left/right
                if (this.flankingMode === 'none' || this.flankingMode === 'side') {
                    this.flankingMode = 'side';
                    const flankAngle = Math.atan2(dy, dx) + (myIndex % 2 === 0 ? -Math.PI / 2 : Math.PI / 2);
                    const flankDistance = 150;
                    this.flankingPosition = {
                        x: target.x + Math.cos(flankAngle) * flankDistance,
                        y: target.y + Math.sin(flankAngle) * flankDistance,
                        angle: Math.atan2(target.y - this.y, target.x - this.x)
                    };
                    return this.flankingPosition;
                }
            }
        }
        
        return null;
    }
    
    // PHASE 3: Adaptive Formation - Auto-switch based on situation
    calculateAdaptiveFormation(enemyShips, aiShips) {
        if (!adaptiveFormationEnabled || !alphaAttackEnabled || !this.isAlpha) return null;
        
        if (this.formationSwitchCooldown > 0) {
            this.formationSwitchCooldown--;
            return null;
        }
        
        const wingmen = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this);
        const enemyCount = enemyShips ? enemyShips.length : 0;
        const threatLevel = this.hasNearbyEnemies(enemyShips) ? 1.0 : 0.0;
        const avgHealth = wingmen.length > 0 ? 
            wingmen.reduce((sum, w) => sum + (w.health / w.maxHealth), 0) / wingmen.length : 1.0;
        
        let recommendedFormation = this.formationType;
        
        // Threat-based: Use defensive formations under heavy fire
        if (threatLevel > 0.7 && enemyCount >= 2) {
            recommendedFormation = 'circle'; // Defensive circle
        }
        // Enemy count: Use line for many enemies, diamond for few
        else if (enemyCount >= 3) {
            recommendedFormation = 'line'; // Broadside attack
        } else if (enemyCount === 1) {
            recommendedFormation = 'diamond'; // Surround single target
        }
        // Health-based: Use tighter formations when ships are damaged
        else if (avgHealth < 0.5) {
            recommendedFormation = 'circle'; // Defensive circle for protection
        }
        // Phase-based: Different formations for different phases
        else if (this.aiPhase === 3) {
            recommendedFormation = 'circle'; // Defensive when critical
        } else if (this.aiPhase === 2) {
            recommendedFormation = 'diamond'; // Balanced defense
        }
        // Default: Arrowhead for normal operations
        else {
            recommendedFormation = 'arrowhead';
        }
        
        // Switch formation if different
        if (recommendedFormation !== this.formationType) {
            this.formationType = recommendedFormation;
            this.formationTypeChanged = true;
            this.formationSwitchCooldown = 300; // 5 second cooldown
            // Update all wingmen
            wingmen.forEach(w => {
                if (w) {
                    w.formationType = recommendedFormation;
                    w.formationTypeChanged = true;
                }
            });
            return recommendedFormation;
        }
        
        return null;
    }
    
    // PHASE 3: Multi-Target Coordination
    coordinateMultiTarget(enemyShips, aiShips) {
        if (!alphaAttackEnabled || !this.isAlpha || !enemyShips || enemyShips.length === 0) {
            this.assignedTarget = null;
            return null;
        }
        
        const wingmen = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this);
        
        if (multiTargetMode === 'focus') {
            // Focus Fire: All ships target the same high-priority enemy
            let bestTarget = null;
            let bestScore = -1;
            
            enemyShips.forEach(enemy => {
                if (!enemy) return;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.enemyDetectionRadius) {
                    let score = 1 / (distance + 1);
                    if (enemy.aiType === 'boss') score *= 2.0; // Prioritize bosses
                    score *= (1 + (enemy.maxHealth - enemy.health) / enemy.maxHealth);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = enemy;
                    }
                }
            });
            
            if (bestTarget) {
                this.assignedTarget = bestTarget;
                this.alphaAttackTarget = bestTarget;
                // Assign same target to all wingmen
                wingmen.forEach(w => {
                    if (w) {
                        w.assignedTarget = bestTarget;
                        w.alphaAttackTarget = bestTarget;
                    }
                });
                return bestTarget;
            }
        } else if (multiTargetMode === 'split') {
            // Split Formation: Alpha and wingmen target different enemies
            const availableTargets = enemyShips.filter(enemy => {
                if (!enemy) return false;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                return Math.sqrt(dx * dx + dy * dy) < this.enemyDetectionRadius;
            });
            
            if (availableTargets.length > 1) {
                // Alpha targets highest priority
                let bestTarget = null;
                let bestScore = -1;
                availableTargets.forEach(enemy => {
                    let score = 1 / (Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2) + 1);
                    if (enemy.aiType === 'boss') score *= 1.5;
                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = enemy;
                    }
                });
                
                this.assignedTarget = bestTarget;
                this.alphaAttackTarget = bestTarget;
                
                // Assign different targets to wingmen
                wingmen.forEach((w, index) => {
                    if (w && availableTargets.length > index + 1) {
                        const target = availableTargets[(index + 1) % availableTargets.length];
                        w.assignedTarget = target;
                        w.alphaAttackTarget = target; // Still follow alpha's primary target for formation
                    }
                });
                return bestTarget;
            }
        } else if (multiTargetMode === 'prioritize') {
            // Prioritize: Assign targets based on threat and position
            const targets = enemyShips
                .filter(enemy => {
                    if (!enemy) return false;
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    return Math.sqrt(dx * dx + dy * dy) < this.enemyDetectionRadius;
                })
                .map(enemy => {
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    let priority = 1 / (distance + 1);
                    if (enemy.aiType === 'boss') priority *= 2.0;
                    priority *= (1 + (enemy.maxHealth - enemy.health) / enemy.maxHealth);
                    return { enemy, priority, distance };
                })
                .sort((a, b) => b.priority - a.priority);
            
            if (targets.length > 0) {
                // Alpha gets highest priority target
                this.assignedTarget = targets[0].enemy;
                this.alphaAttackTarget = targets[0].enemy;
                
                // Distribute remaining targets to wingmen
                wingmen.forEach((w, index) => {
                    if (w && targets.length > index + 1) {
                        w.assignedTarget = targets[index + 1].enemy;
                        w.alphaAttackTarget = targets[0].enemy; // Formation still follows alpha
                    }
                });
                return targets[0].enemy;
            }
        }
        
        return null;
    }
    
    // PHASE 3: Escort & Protection Modes
    executeEscortMode(playerShip, aiShips, enemyShips) {
        if (!alphaAttackEnabled || escortMode === 'none') {
            this.escortMode = 'none';
            this.escortTarget = null;
            return null;
        }
        
        if (escortMode === 'escort' && playerShip && playerShipActive) {
            // Escort player ship
            this.escortTarget = playerShip;
            const dx = playerShip.x - this.x;
            const dy = playerShip.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Maintain escort distance
            if (distance > this.escortDistance * 1.5) {
                // Too far, move closer
                return {
                    x: playerShip.x - Math.cos(playerShip.angle) * this.escortDistance,
                    y: playerShip.y - Math.sin(playerShip.angle) * this.escortDistance,
                    angle: playerShip.angle,
                    mode: 'escort'
                };
            }
        } else if (escortMode === 'guard') {
            // Guard mode: Defensive formation around target
            if (this.isAlpha && this.alphaAttackTarget) {
                const target = this.alphaAttackTarget;
                const wingmen = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this);
                const guardRadius = 120;
                const guardAngle = (2 * Math.PI * wingmen.indexOf(this)) / Math.max(wingmen.length, 1);
                
                return {
                    x: target.x + Math.cos(guardAngle) * guardRadius,
                    y: target.y + Math.sin(guardAngle) * guardRadius,
                    angle: guardAngle + Math.PI, // Face outward
                    mode: 'guard'
                };
            }
        } else if (escortMode === 'patrol') {
            // Patrol mode: Circle around alpha ship (yellow ship)
            // Find the alpha ship
            let alphaShip = null;
            if (typeof aiShips !== 'undefined' && Array.isArray(aiShips)) {
                alphaShip = aiShips.find(ship => ship && ship.isAlpha);
            }
            
            // Use alpha ship position as patrol center, or fallback to own position
            const patrolCenter = alphaShip ? { x: alphaShip.x, y: alphaShip.y } : { x: this.x, y: this.y };
            
            // Update patrol center to track alpha ship
            this.patrolCenter = patrolCenter;
            
            // Calculate patrol position based on ship index for multiple ships
            const wingmen = aiShips.filter(ship => ship && ship !== alphaShip);
            const shipIndex = wingmen.indexOf(this);
            const totalWingmen = Math.max(wingmen.length, 1);
            
            const time = Date.now() / 1000;
            // Each ship patrols at a different angle offset
            const baseAngle = (time * 0.5) % (Math.PI * 2);
            const angleOffset = (shipIndex * (Math.PI * 2)) / totalWingmen;
            const angle = baseAngle + angleOffset;
            
            return {
                x: patrolCenter.x + Math.cos(angle) * this.patrolRadius,
                y: patrolCenter.y + Math.sin(angle) * this.patrolRadius,
                angle: angle + Math.PI / 2,
                mode: 'patrol'
            };
        } else if (escortMode === 'intercept') {
            // Intercept mode: Intercept incoming threats
            if (enemyShips && enemyShips.length > 0) {
                let nearestThreat = null;
                let nearestDistance = Infinity;
                
                enemyShips.forEach(enemy => {
                    if (!enemy) return;
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Check if enemy is heading toward player or alpha
                    const playerDx = (playerShip ? playerShip.x : this.x) - enemy.x;
                    const playerDy = (playerShip ? playerShip.y : this.y) - enemy.y;
                    const playerDist = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                    
                    if (distance < 300 && playerDist < 200) {
                        if (distance < nearestDistance) {
                            nearestDistance = distance;
                            nearestThreat = enemy;
                        }
                    }
                });
                
                if (nearestThreat) {
                    this.interceptTarget = nearestThreat;
                    // Calculate intercept point
                    const interceptTime = nearestDistance / 5; // Estimate
                    return {
                        x: nearestThreat.x + (nearestThreat.velocityX || 0) * interceptTime,
                        y: nearestThreat.y + (nearestThreat.velocityY || 0) * interceptTime,
                        angle: Math.atan2(nearestThreat.y - this.y, nearestThreat.x - this.x),
                        mode: 'intercept'
                    };
                }
            }
        } else if (escortMode === 'cover') {
            // Cover mode: Provide covering fire for retreat
            if (playerShip && playerShipActive) {
                const dx = playerShip.x - this.x;
                const dy = playerShip.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Position between player and enemies
                return {
                    x: playerShip.x - Math.cos(playerShip.angle) * 150,
                    y: playerShip.y - Math.sin(playerShip.angle) * 150,
                    angle: playerShip.angle + Math.PI, // Face away from player
                    mode: 'cover'
                };
            }
        }
        
        return null;
    }
    
    // ADVANCED PATTERNS: Tactical Attack Sequences
    executeAlphaStrikeCombo(enemyShips, aiShips) {
        if (!alphaAttackEnabled || !this.isAlpha || !enemyShips || enemyShips.length === 0) {
            this.attackSequence = 'none';
            return null;
        }
        
        const target = this.alphaAttackTarget || this.findNearestEnemy(enemyShips)?.enemyShip;
        if (!target) return null;
        
        // Initialize sequence if not started
        if (this.attackSequence !== 'alphaStrike') {
            this.attackSequence = 'alphaStrike';
            this.attackSequenceTimer = 0;
            this.attackSequencePhase = 0;
        }
        
        this.attackSequenceTimer++;
        
        // Phase 0: Alpha fires first (0-30 frames)
        if (this.attackSequencePhase === 0) {
            if (this.attackSequenceTimer < 30) {
                // Alpha fires
                if (this.shootCooldown <= 0 && this.shouldFireAtEnemy(target)) {
                    this.fire(target);
                }
            } else {
                // Move to phase 1: Wingmen fire
                this.attackSequencePhase = 1;
                this.attackSequenceTimer = 0;
            }
        }
        // Phase 1: Wingmen fire (30-60 frames)
        else if (this.attackSequencePhase === 1) {
            if (this.attackSequenceTimer < 30) {
                // Wingmen fire (handled in their makeDecision)
                // Signal wingmen to fire
                const wingmen = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this);
                wingmen.forEach(w => {
                    if (w && w.shootCooldown <= 0 && w.shouldFireAtEnemy(target)) {
                        w.fire(target);
                    }
                });
            } else {
                // Move to phase 2: Alpha fires again
                this.attackSequencePhase = 2;
                this.attackSequenceTimer = 0;
            }
        }
        // Phase 2: Alpha fires again (60-90 frames)
        else if (this.attackSequencePhase === 2) {
            if (this.attackSequenceTimer < 30) {
                // Alpha fires again
                if (this.shootCooldown <= 0 && this.shouldFireAtEnemy(target)) {
                    this.fire(target);
                }
            } else {
                // Sequence complete, reset
                this.attackSequence = 'none';
                this.attackSequenceTimer = 0;
                this.attackSequencePhase = 0;
            }
        }
        
        return target;
    }
    
    executeWaveAttack(enemyShips, aiShips) {
        if (!alphaAttackEnabled || !this.isAlpha || !enemyShips || enemyShips.length === 0) {
            this.attackSequence = 'none';
            return null;
        }
        
        const target = this.alphaAttackTarget || this.findNearestEnemy(enemyShips)?.enemyShip;
        if (!target) return null;
        
        // Initialize wave attack if not started
        if (this.attackSequence !== 'wave') {
            this.attackSequence = 'wave';
            this.attackSequenceTimer = 0;
            this.waveNumber = 0;
        }
        
        this.attackSequenceTimer++;
        const wingmen = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this);
        const totalWaves = Math.min(3, Math.floor(wingmen.length / 2) + 1);
        
        // Wave 0: Alpha leads (0-60 frames)
        if (this.waveNumber === 0) {
            if (this.attackSequenceTimer < 60) {
                // Alpha engages
                if (this.shootCooldown <= 0 && this.shouldFireAtEnemy(target)) {
                    this.fire(target);
                }
            } else {
                // Move to wave 1
                this.waveNumber = 1;
                this.attackSequenceTimer = 0;
            }
        }
        // Wave 1: First group of wingmen (60-120 frames)
        else if (this.waveNumber === 1 && wingmen.length >= 2) {
            if (this.attackSequenceTimer < 60) {
                const wave1Ships = wingmen.slice(0, Math.ceil(wingmen.length / 2));
                wave1Ships.forEach(w => {
                    if (w && w.shootCooldown <= 0 && w.shouldFireAtEnemy(target)) {
                        w.fire(target);
                    }
                });
            } else {
                if (totalWaves > 2) {
                    this.waveNumber = 2;
                    this.attackSequenceTimer = 0;
                } else {
                    // Sequence complete
                    this.attackSequence = 'none';
                    this.attackSequenceTimer = 0;
                    this.waveNumber = 0;
                }
            }
        }
        // Wave 2: Second group provides cover (120-180 frames)
        else if (this.waveNumber === 2) {
            if (this.attackSequenceTimer < 60) {
                const wave2Ships = wingmen.slice(Math.ceil(wingmen.length / 2));
                wave2Ships.forEach(w => {
                    if (w && w.shootCooldown <= 0 && w.shouldFireAtEnemy(target)) {
                        w.fire(target);
                    }
                });
            } else {
                // Sequence complete
                this.attackSequence = 'none';
                this.attackSequenceTimer = 0;
                this.waveNumber = 0;
            }
        }
        
        return target;
    }
    
    // ADVANCED PATTERNS: Dynamic Formation Transitions
    morphFormation(targetFormation, aiShips) {
        if (!alphaAttackEnabled || !this.isAlpha) return false;
        
        if (this.formationType === targetFormation) {
            this.formationMorphing = false;
            return false;
        }
        
        // Start morphing
        if (!this.formationMorphing) {
            this.formationMorphing = true;
            this.formationMorphTarget = targetFormation;
            this.formationMorphProgress = 0;
        }
        
        // Smooth transition over 60 frames (1 second)
        this.formationMorphProgress += 1 / 60;
        
        if (this.formationMorphProgress >= 1.0) {
            // Morph complete
            this.formationType = targetFormation;
            this.formationMorphing = false;
            this.formationMorphProgress = 0;
            
            // Update all wingmen
            const wingmen = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this);
            wingmen.forEach(w => {
                if (w) {
                    w.formationType = targetFormation;
                    w.formationTypeChanged = true;
                }
            });
            
            return true;
        }
        
        return false;
    }
    
    splitAndMergeFormation(enemyShips, aiShips) {
        if (!alphaAttackEnabled || !this.isAlpha || !enemyShips || enemyShips.length === 0) {
            this.splitFormation = false;
            this.mergeTimer = 0;
            return null;
        }
        
        const wingmen = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this);
        if (wingmen.length < 2) return null;
        
        // Check if should split (when multiple enemies present)
        if (!this.splitFormation && enemyShips.length >= 2) {
            this.splitFormation = true;
            this.mergeTimer = 0;
            
            // Divide wingmen into two groups
            const midPoint = Math.ceil(wingmen.length / 2);
            this.splitGroups = [
                wingmen.slice(0, midPoint),
                wingmen.slice(midPoint)
            ];
            
            // Assign different targets to each group
            const targets = enemyShips.slice(0, 2);
            if (targets[0]) this.alphaAttackTarget = targets[0];
            if (targets[1] && this.splitGroups[1].length > 0) {
                this.splitGroups[1].forEach(w => {
                    if (w) w.assignedTarget = targets[1];
                });
            }
        }
        
        // Merge back after 180 frames (3 seconds) or when enemies reduced
        if (this.splitFormation) {
            this.mergeTimer++;
            
            if (this.mergeTimer >= 180 || enemyShips.length < 2) {
                this.splitFormation = false;
                this.mergeTimer = 0;
                this.splitGroups = [];
                
                // Reset assigned targets
                wingmen.forEach(w => {
                    if (w) w.assignedTarget = null;
                });
            }
        }
        
        return this.splitFormation;
    }
    
    // ADVANCED PATTERNS: Advanced Flanking Patterns
    executeHammerAndAnvil(enemyShips, aiShips) {
        if (!alphaAttackEnabled || !this.isAlpha || !enemyShips || enemyShips.length === 0) {
            this.flankPattern = 'none';
            return null;
        }
        
        const target = this.alphaAttackTarget || this.findNearestEnemy(enemyShips)?.enemyShip;
        if (!target) return null;
        
        const wingmen = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this);
        if (wingmen.length < 2) return null;
        
        // Initialize hammer and anvil
        if (this.flankPattern !== 'hammerAnvil') {
            this.flankPattern = 'hammerAnvil';
            this.flankTimer = 0;
        }
        
        this.flankTimer++;
        
        // Alpha (Hammer) approaches from front
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 150) {
            // Alpha moves toward target (front approach)
            this.targetAngle = Math.atan2(dy, dx);
            if (Math.random() < 0.5) {
                this.thrust(1.2);
            }
        }
        
        // Wingmen (Anvil) approach from rear
        wingmen.forEach((w, index) => {
            if (w) {
                const rearAngle = Math.atan2(target.y - w.y, target.x - w.x) + Math.PI; // Opposite direction
                const flankDistance = 120;
                const flankAngle = rearAngle + (index % 2 === 0 ? -Math.PI / 4 : Math.PI / 4);
                
                w.flankPosition = {
                    x: target.x + Math.cos(flankAngle) * flankDistance,
                    y: target.y + Math.sin(flankAngle) * flankDistance,
                    angle: Math.atan2(target.y - w.y, target.x - w.x)
                };
                
                // Move toward flank position
                const dxFlank = w.flankPosition.x - w.x;
                const dyFlank = w.flankPosition.y - w.y;
                w.targetAngle = Math.atan2(dyFlank, dxFlank);
                
                if (Math.random() < 0.4) {
                    w.thrust(1.1);
                }
                
                // Fire when in position
                const distToTarget = Math.sqrt((target.x - w.x) ** 2 + (target.y - w.y) ** 2);
                if (distToTarget < w.enemyFiringRange && w.shouldFireAtEnemy(target)) {
                    if (w.shootCooldown <= 0) {
                        w.fire(target);
                    }
                }
            }
        });
        
        return target;
    }
    
    executeScissorsAttack(enemyShips, aiShips) {
        if (!alphaAttackEnabled || !this.isAlpha || !enemyShips || enemyShips.length === 0) {
            this.flankPattern = 'none';
            return null;
        }
        
        const target = this.alphaAttackTarget || this.findNearestEnemy(enemyShips)?.enemyShip;
        if (!target) return null;
        
        const wingmen = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this);
        if (wingmen.length < 2) return null;
        
        // Initialize scissors attack
        if (this.flankPattern !== 'scissors') {
            this.flankPattern = 'scissors';
            this.flankTimer = 0;
        }
        
        this.flankTimer++;
        
        // Divide wingmen into two groups for scissors
        const midPoint = Math.ceil(wingmen.length / 2);
        const leftGroup = wingmen.slice(0, midPoint);
        const rightGroup = wingmen.slice(midPoint);
        
        // Calculate approach angles (from opposite sides)
        const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
        const leftAngle = targetAngle - Math.PI / 2; // Left side
        const rightAngle = targetAngle + Math.PI / 2; // Right side
        
        // Left group approaches from left
        leftGroup.forEach((w, index) => {
            if (w) {
                const approachDistance = 150 + (index * 30);
                w.flankPosition = {
                    x: target.x + Math.cos(leftAngle) * approachDistance,
                    y: target.y + Math.sin(leftAngle) * approachDistance,
                    angle: targetAngle
                };
                
                const dx = w.flankPosition.x - w.x;
                const dy = w.flankPosition.y - w.y;
                w.targetAngle = Math.atan2(dy, dx);
                
                if (Math.random() < 0.4) {
                    w.thrust(1.1);
                }
                
                // Fire when in range
                const distToTarget = Math.sqrt((target.x - w.x) ** 2 + (target.y - w.y) ** 2);
                if (distToTarget < w.enemyFiringRange && w.shouldFireAtEnemy(target)) {
                    if (w.shootCooldown <= 0) {
                        w.fire(target);
                    }
                }
            }
        });
        
        // Right group approaches from right
        rightGroup.forEach((w, index) => {
            if (w) {
                const approachDistance = 150 + (index * 30);
                w.flankPosition = {
                    x: target.x + Math.cos(rightAngle) * approachDistance,
                    y: target.y + Math.sin(rightAngle) * approachDistance,
                    angle: targetAngle
                };
                
                const dx = w.flankPosition.x - w.x;
                const dy = w.flankPosition.y - w.y;
                w.targetAngle = Math.atan2(dy, dx);
                
                if (Math.random() < 0.4) {
                    w.thrust(1.1);
                }
                
                // Fire when in range
                const distToTarget = Math.sqrt((target.x - w.x) ** 2 + (target.y - w.y) ** 2);
                if (distToTarget < w.enemyFiringRange && w.shouldFireAtEnemy(target)) {
                    if (w.shootCooldown <= 0) {
                        w.fire(target);
                    }
                }
            }
        });
        
        // Alpha can also engage
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.enemyFiringRange && this.shouldFireAtEnemy(target)) {
            if (this.shootCooldown <= 0) {
                this.fire(target);
            }
        }
        
        return target;
    }
    
    // PHASE 2: Apply formation abilities
    applyFormationAbilities(aiShips) {
        if (!alphaAttackEnabled || !this.alphaShip) {
            // Reset abilities when not in formation
            this.formationShieldActive = false;
            this.formationBoostActive = false;
            this.formationHealActive = false;
            this.formationRadarActive = false;
            if (this.isAlpha) {
                this.detectionRadius = this.baseDetectionRadius;
            }
            return;
        }
        
        const alpha = this.alphaShip;
        const wingmen = aiShips.filter(ship => ship && ship !== alpha && ship.alphaShip === alpha);
        const inFormation = wingmen.length >= 1;
        
        if (inFormation) {
            // Formation Shield: Combined shield when 3+ ships in formation
            if (wingmen.length >= 2) {
                this.formationShieldActive = true;
                if (alpha) alpha.formationShieldActive = true;
                wingmen.forEach(w => {
                    if (w) w.formationShieldActive = true;
                });
            } else {
                this.formationShieldActive = false;
            }
            
            // Formation Boost: Speed boost when in formation
            this.formationBoostActive = true;
            
            // Formation Radar: Extended detection when in formation
            if (this.isAlpha) {
                this.formationRadarActive = true;
                this.detectionRadius = this.baseDetectionRadius * 1.3;
            }
            
            // Formation Heal: Healing aura for support role
            if (this.role === 'support' || (alpha && alpha.role === 'support')) {
                this.formationHealActive = true;
            } else {
                this.formationHealActive = false;
            }
        } else {
            // Reset abilities when formation breaks
            this.formationShieldActive = false;
            this.formationBoostActive = false;
            this.formationHealActive = false;
            this.formationRadarActive = false;
            if (this.isAlpha) {
                this.detectionRadius = this.baseDetectionRadius;
            }
        }
    }

    // Check if should fire at asteroid (more aggressive/continuous firing)
    shouldFire(asteroid) {
        const dx = asteroid.x - this.x;
        const dy = asteroid.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angleToAsteroid = Math.atan2(dy, dx);
        const angleDiff = Math.abs(this.normalizeAngle(angleToAsteroid - this.angle));
        
        // Calculate relative velocity for collision prediction
        const relativeVelX = asteroid.velocityX - this.velocityX;
        const relativeVelY = asteroid.velocityY - this.velocityY;
        const relativeSpeed = Math.sqrt(relativeVelX * relativeVelX + relativeVelY * relativeVelY);
        const timeToCollision = relativeSpeed > 0 ? distance / relativeSpeed : Infinity;
        
        // Condition 1: Imminent collision threat (more lenient)
        if (distance < this.imminentThreatDistance && 
            angleDiff < this.collisionAngleThreshold &&
            timeToCollision < 90) { // Less than 1.5 seconds at 60fps
            return true;
        }
        
        // Condition 2: Asteroid in path and blocking (more aggressive)
        if (distance < this.firingRange && 
            angleDiff < Math.PI / 3 && // 60 degrees - wider arc
            asteroid.size >= this.minAsteroidSize &&
            timeToCollision < 180) { // Less than 3 seconds
            return true;
        }
        
        // Condition 3: Large asteroid directly ahead (more lenient)
        if (distance < this.firingRange &&
            angleDiff < this.collisionAngleThreshold &&
            asteroid.size >= 30) { // Medium/large asteroids
            return true;
        }
        
        // Condition 4: Any asteroid in front within range (continuous firing)
        if (distance < this.firingRange &&
            angleDiff < Math.PI / 2 && // 90 degrees - very wide arc
            asteroid.size >= this.minAsteroidSize) {
            return true;
        }
        
        return false;
    }

    // Find nearest enemy ship
    findNearestEnemy(enemyShips) {
        let nearest = null;
        let nearestDistance = Infinity;
        
        enemyShips.forEach(enemyShip => {
            if (enemyShip) {
                const dx = enemyShip.x - this.x;
                const dy = enemyShip.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.enemyDetectionRadius && distance < nearestDistance) {
                    const angleToEnemy = Math.atan2(dy, dx);
                    const angleDiff = Math.abs(this.normalizeAngle(angleToEnemy - this.angle));
                    
                    // Consider enemies in front (within 150 degrees)
                    if (angleDiff < Math.PI * 5/6) {
                        nearestDistance = distance;
                        nearest = { enemyShip, distance, angle: angleToEnemy };
                    }
                }
            }
        });
        
        return nearest;
    }

    // Check if should fire at enemy ship
    shouldFireAtEnemy(enemyShip) {
        if (!enemyShip) return false;
        const dx = enemyShip.x - this.x;
        const dy = enemyShip.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angleToEnemy = Math.atan2(dy, dx);
        const angleDiff = Math.abs(this.normalizeAngle(angleToEnemy - this.angle));
        
        // Fire if enemy is in range and in front
        if (distance < this.enemyFiringRange && angleDiff < Math.PI / 2) {
            return true;
        }
        return false;
    }

    // Predict enemy position for leading shots
    predictEnemyPosition(enemyShip) {
        if (!enemyShip) return null;
        const dx = enemyShip.x - this.x;
        const dy = enemyShip.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.enemyFiringRange) return null;
        
        // Calculate time for bullet to reach enemy
        const bulletSpeed = 8; // Player/AI bullet speed
        const timeToReach = distance / bulletSpeed;
        
        // Predict future position based on enemy velocity
        const predictedX = enemyShip.x + enemyShip.velocityX * timeToReach;
        const predictedY = enemyShip.y + enemyShip.velocityY * timeToReach;
        
        // Wrap predicted position
        const wrappedX = ((predictedX % canvas.width) + canvas.width) % canvas.width;
        const wrappedY = ((predictedY % canvas.height) + canvas.height) % canvas.height;
        
        return {
            x: wrappedX,
            y: wrappedY,
            angle: Math.atan2(wrappedY - this.y, wrappedX - this.x)
        };
    }

    // Coordinate firing with other AI ships (avoid over-firing on same target)
    coordinateFiring(enemyShip, aiShips) {
        if (!enemyShip) return true; // No coordination needed if no target
        
        let targetingCount = 0;
        const coordinationRadius = 200; // Range to check for other AI ships
        
        aiShips.forEach(aiShip => {
            if (aiShip && aiShip !== this) {
                const dx = aiShip.x - this.x;
                const dy = aiShip.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < coordinationRadius) {
                    // Check if this AI ship is also targeting the same enemy
                    const dxToEnemy = enemyShip.x - aiShip.x;
                    const dyToEnemy = enemyShip.y - aiShip.y;
                    const distToEnemy = Math.sqrt(dxToEnemy * dxToEnemy + dyToEnemy * dyToEnemy);
                    const angleToEnemy = Math.atan2(dyToEnemy, dxToEnemy);
                    const angleDiff = Math.abs(aiShip.normalizeAngle(angleToEnemy - aiShip.angle));
                    
                    // If AI ship is close to enemy and aiming at it, count as targeting
                    if (distToEnemy < aiShip.enemyFiringRange && angleDiff < Math.PI / 3) {
                        targetingCount++;
                    }
                }
            }
        });
        
        // Allow firing if less than 3 other ships are targeting the same enemy
        // This prevents over-firing while still allowing coordinated attacks
        return targetingCount < 3;
    }

    // Check if enemies are present nearby
    hasNearbyEnemies(enemyShips) {
        if (!enemyShips || enemyShips.length === 0) return false;
        
        for (let enemy of enemyShips) {
            if (enemy) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // If any enemy is within defensive range, return true
                if (distance < this.enemyDetectionRadius) {
                    return true;
                }
            }
        }
        return false;
    }

    // Predictive Avoidance: Predict enemy bullet trajectories and avoid them
    predictBulletCollision(enemyBullets) {
        if (!enemyBullets || enemyBullets.length === 0) return null;
        
        let nearestThreat = null;
        let minTimeToCollision = Infinity;
        
        enemyBullets.forEach(bullet => {
            if (!bullet) return;
            
            // Calculate relative position and velocity
            const dx = bullet.x - this.x;
            const dy = bullet.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Skip if bullet is too far away
            if (distance > 300) return;
            
            // Calculate relative velocity
            const relativeVx = bullet.velocityX - this.velocityX;
            const relativeVy = bullet.velocityY - this.velocityY;
            const relativeSpeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);
            
            if (relativeSpeed < 0.1) return; // Bullet moving too slowly relative to ship
            
            // Predict time to collision (simplified: assume linear trajectory)
            const dotProduct = dx * relativeVx + dy * relativeVy;
            const timeToCollision = -dotProduct / (relativeSpeed * relativeSpeed);
            
            // Check if collision is predicted within reasonable time (2 seconds = 120 frames)
            if (timeToCollision > 0 && timeToCollision < 120 && timeToCollision < minTimeToCollision) {
                // Calculate predicted collision point
                const predictedX = bullet.x + bullet.velocityX * timeToCollision;
                const predictedY = bullet.y + bullet.velocityY * timeToCollision;
                const predictedDistance = Math.sqrt(
                    (predictedX - this.x) ** 2 + (predictedY - this.y) ** 2
                );
                
                // Check if predicted collision is within ship's size
                if (predictedDistance < this.size * 2) {
                    minTimeToCollision = timeToCollision;
                    nearestThreat = {
                        bullet,
                        timeToCollision,
                        distance,
                        angle: Math.atan2(dy, dx),
                        threatLevel: 1 / (timeToCollision + 1) // Higher threat = closer collision
                    };
                }
            }
        });
        
        return nearestThreat;
    }
    
    // Flocking behavior: separation, alignment, cohesion (with ENHANCED defensive mode)
    calculateFlocking(aiShips, enemyShips) {
        // Check if enemies are present - use defensive parameters
        const enemiesPresent = this.hasNearbyEnemies(enemyShips);
        const separationDist = enemiesPresent ? this.defensiveSeparationDistance : this.separationDistance;
        const cohesionRad = enemiesPresent ? this.defensiveCohesionRadius : this.cohesionRadius;
        const flockWeight = enemiesPresent ? this.defensiveFlockWeight : this.flockWeight;
        
        // ENHANCED: Mutual protection - prioritize protecting low-health allies
        let lowHealthAlly = null;
        let lowestHealth = Infinity;
        if (enemiesPresent && this.mutualProtectionEnabled) {
            aiShips.forEach(ally => {
                if (ally && ally !== this) {
                    const dx = ally.x - this.x;
                    const dy = ally.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < this.flockRadius && ally.health < lowestHealth && ally.health < ally.maxHealth * 0.5) {
                        lowestHealth = ally.health;
                        lowHealthAlly = { ally, distance, dx, dy };
                    }
                }
            });
        }
        
        let separationX = 0, separationY = 0;
        let alignmentX = 0, alignmentY = 0;
        let cohesionX = 0, cohesionY = 0;
        let separationCount = 0;
        let alignmentCount = 0;
        let cohesionCount = 0;
        
        aiShips.forEach(aiShip => {
            if (aiShip && aiShip !== this) {
                const dx = aiShip.x - this.x;
                const dy = aiShip.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0 && distance < this.flockRadius) {
                    // Separation: avoid crowding neighbors (tighter when enemies present)
                    if (distance < separationDist) {
                        const separationForce = enemiesPresent ? (1 / distance) * 0.5 : (1 / distance);
                        separationX -= (dx / distance) * separationForce;
                        separationY -= (dy / distance) * separationForce;
                        separationCount++;
                    }
                    
                    // Alignment: steer towards average heading of neighbors
                    if (distance < this.alignmentRadius) {
                        alignmentX += Math.cos(aiShip.angle);
                        alignmentY += Math.sin(aiShip.angle);
                        alignmentCount++;
                    }
                    
                    // Cohesion: steer towards average position of neighbors (stronger when enemies present)
                    if (distance < cohesionRad) {
                        const cohesionWeight = enemiesPresent ? 1.5 : 1.0; // Stronger cohesion when enemies present
                        cohesionX += aiShip.x * cohesionWeight;
                        cohesionY += aiShip.y * cohesionWeight;
                        cohesionCount++;
                    }
                }
            }
        });
        
        // Normalize and combine behaviors
        let flockAngle = this.angle;
        
        // ENHANCED: Mutual protection - prioritize moving to protect low-health allies
        if (lowHealthAlly && enemiesPresent) {
            const protectionAngle = Math.atan2(lowHealthAlly.dy, lowHealthAlly.dx);
            // Strong priority to move toward low-health ally to protect them
            flockAngle = protectionAngle;
        } else if (separationCount > 0) {
            const separationAngle = Math.atan2(separationY, separationX);
            // When enemies present, separation is less aggressive (allows closer grouping)
            flockAngle = enemiesPresent ? 
                this.angle + (separationAngle - this.angle) * 0.2 : // Even less aggressive (was 0.3)
                separationAngle;
        } else if (cohesionCount > 0) {
            // Cohesion has higher priority when enemies present
            cohesionX /= cohesionCount;
            cohesionY /= cohesionCount;
            const dx = cohesionX - this.x;
            const dy = cohesionY - this.y;
            const cohesionAngle = Math.atan2(dy, dx);
            
            if (enemiesPresent) {
                // ENHANCED: Defensive formations (circle or line)
                if (this.defensiveFormationType === 'circle' && cohesionCount >= 2) {
                    // Circle formation: position around center point
                    const centerX = cohesionX;
                    const centerY = cohesionY;
                    const angleToCenter = Math.atan2(centerY - this.y, centerX - this.x);
                    const formationRadius = 50; // Radius of circle formation
                    const desiredAngle = angleToCenter + Math.PI / 2; // Perpendicular to center
                    flockAngle = desiredAngle;
                } else if (this.defensiveFormationType === 'line' && cohesionCount >= 2) {
                    // Line formation: align with average heading
                    if (alignmentCount > 0) {
                        const alignmentAngle = Math.atan2(alignmentY, alignmentX);
                        flockAngle = alignmentAngle;
                    } else {
                        flockAngle = cohesionAngle;
                    }
                } else {
                    // Default: Strong cohesion when enemies present - move closer together
                    flockAngle = cohesionAngle;
                }
            } else if (alignmentCount > 0) {
                const alignmentAngle = Math.atan2(alignmentY, alignmentX);
                flockAngle = alignmentAngle;
            } else {
                flockAngle = cohesionAngle;
            }
        } else if (alignmentCount > 0) {
            const alignmentAngle = Math.atan2(alignmentY, alignmentX);
            flockAngle = alignmentAngle;
        }
        
        return { angle: flockAngle, weight: flockWeight };
    }

    // Protect nearby AI ships from enemies (enhanced defensive behavior)
    protectAllies(aiShips, enemyShips) {
        if (!enemyShips || enemyShips.length === 0) return null;
        
        let protectionAngle = null;
        let maxThreat = 0;
        let closestAllyDistance = Infinity;
        let closestAlly = null;
        
        // First, find closest ally
        aiShips.forEach(ally => {
            if (ally && ally !== this) {
                const dx = ally.x - this.x;
                const dy = ally.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.flockRadius && distance < closestAllyDistance) {
                    closestAllyDistance = distance;
                    closestAlly = { ally, distance, dx, dy };
                }
            }
        });
        
        // Check if any ally is threatened
        aiShips.forEach(ally => {
            if (ally && ally !== this) {
                const dx = ally.x - this.x;
                const dy = ally.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Check if ally is within protection range
                if (distance < this.flockRadius) {
                    // Check if any enemy is threatening this ally
                    enemyShips.forEach(enemy => {
                        if (enemy) {
                            const dxToAlly = ally.x - enemy.x;
                            const dyToAlly = ally.y - enemy.y;
                            const distToAlly = Math.sqrt(dxToAlly * dxToAlly + dyToAlly * dyToAlly);
                            
                            // If enemy is close to ally, this is a threat
                            if (distToAlly < enemy.attackRange) {
                                const threatLevel = 1 / (distToAlly + 1);
                                if (threatLevel > maxThreat) {
                                    maxThreat = threatLevel;
                                    // Move towards ally to protect them
                                    protectionAngle = Math.atan2(dy, dx);
                                }
                            }
                        }
                    });
                }
            }
        });
        
        // If no immediate threat but enemies present, move closer to nearest ally
        if (protectionAngle === null && closestAlly && this.hasNearbyEnemies(enemyShips)) {
            // Move toward nearest ally for mutual protection
            protectionAngle = Math.atan2(closestAlly.dy, closestAlly.dx);
        }
        
        return protectionAngle;
    }

    // Fire bullet at enemy or asteroid
    fire(targetEnemy = null) {
        if (this.shootCooldown <= 0) {
            let fireAngle = this.angle;
            
            // If firing at enemy, use predictive aiming
            if (targetEnemy) {
                const predicted = this.predictEnemyPosition(targetEnemy);
                if (predicted) {
                    fireAngle = predicted.angle;
                } else {
                    const dx = targetEnemy.x - this.x;
                    const dy = targetEnemy.y - this.y;
                    fireAngle = Math.atan2(dy, dx);
                }
            }
            
            const bulletX = this.x + Math.cos(fireAngle) * this.size;
            const bulletY = this.y + Math.sin(fireAngle) * this.size;
            bullets.push(new Bullet(bulletX, bulletY, fireAngle, true)); // true = AI bullet
            this.shootCooldown = this.rapidFireCooldown; // Very short cooldown for rapid fire
            playFireSound(true); // Play AI firing sound
        }
    }

    // Check if cornered (near edges with limited escape)
    isCornered() {
        const edgeThreshold = 100;
        const nearLeft = this.x < edgeThreshold;
        const nearRight = this.x > canvas.width - edgeThreshold;
        const nearTop = this.y < edgeThreshold;
        const nearBottom = this.y > canvas.height - edgeThreshold;
        return (nearLeft || nearRight) && (nearTop || nearBottom);
    }

    // Calculate threat level (0-1) based on nearby threats
    calculateThreatLevel(asteroids, enemyShips) {
        let threatLevel = 0;
        const nearestAsteroid = this.findNearestAsteroid(asteroids);
        const nearestEnemy = this.findNearestEnemy(enemyShips);
        
        if (nearestAsteroid && nearestAsteroid.distance < 150) {
            threatLevel += 0.3 * (1 - nearestAsteroid.distance / 150);
        }
        if (nearestEnemy && nearestEnemy.distance < 300) {
            threatLevel += 0.4 * (1 - nearestEnemy.distance / 300);
        }
        
        return Math.min(1.0, threatLevel);
    }
    
    // Phase 5.1: Extract features for ML model
    extractFeatures(asteroids, aiShips, playerShip, enemyShips) {
        const nearestAsteroid = this.findNearestAsteroid(asteroids);
        const nearestEnemy = this.findNearestEnemy(enemyShips);
        const nearestShip = this.findNearestShip(aiShips, playerShip);
        
        // Calculate threat level (0-1)
        const threatLevel = this.calculateThreatLevel(asteroids, enemyShips);
        
        // Count nearby allies
        let nearbyAllies = 0;
        aiShips.forEach(otherShip => {
            if (otherShip !== this) {
                const dx = otherShip.x - this.x;
                const dy = otherShip.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < this.flockRadius) {
                    nearbyAllies++;
                }
            }
        });
        
        // Calculate flock density (0-1)
        const maxPossibleAllies = 9; // Max 10 ships - 1 (self)
        const flockDensity = Math.min(1.0, nearbyAllies / maxPossibleAllies);
        
        return {
            // Ship state (normalized)
            health: this.health / this.maxHealth,
            phase: this.aiPhase / 3.0, // Normalize to 0-1
            shieldActive: this.shieldActive ? 1 : 0,
            velocity: Math.min(1.0, Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2) / 5.0), // Normalize to 0-1
            
            // Environment
            asteroidCount: Math.min(1.0, asteroids.length / 10.0), // Normalize (assume max 10)
            nearestAsteroidDistance: nearestAsteroid ? Math.min(1.0, nearestAsteroid.distance / 200.0) : 1.0,
            enemyCount: Math.min(1.0, enemyShips.length / 10.0), // Normalize
            nearestEnemyDistance: nearestEnemy ? Math.min(1.0, nearestEnemy.distance / 400.0) : 1.0,
            allyCount: Math.min(1.0, nearbyAllies / 9.0), // Normalize
            
            // Threat and flocking
            threatLevel: threatLevel,
            flockDensity: flockDensity,
            hasNearbyEnemies: this.hasNearbyEnemies(enemyShips) ? 1 : 0
        };
    }
    
    // Phase 5.1: Get ML-suggested parameters with safety bounds
    getMLParameters(features) {
        if (!this.mlEnabled || !this.useMLParameters) {
            // Fallback to rule-based base parameters
            return {
                detectionRadius: this.baseDetectionRadius,
                firingRange: this.baseFiringRange,
                flockWeight: this.baseFlockWeight,
                thrustFrequency: this.baseThrustFrequency,
                enemyFiringRange: this.baseEnemyFiringRange
            };
        }
        
        // If ML model is available, use it
        if (this.mlModel && typeof this.mlModel.predict === 'function') {
            const mlSuggestions = this.mlModel.predict(features);
            
            // Apply safety bounds (rule-based constraints)
            return {
                detectionRadius: Math.max(50, Math.min(200, mlSuggestions.detectionRadius || this.baseDetectionRadius)),
                firingRange: Math.max(100, Math.min(400, mlSuggestions.firingRange || this.baseFiringRange)),
                flockWeight: Math.max(0.1, Math.min(0.8, mlSuggestions.flockWeight || this.baseFlockWeight)),
                thrustFrequency: Math.max(0.01, Math.min(0.1, mlSuggestions.thrustFrequency || this.baseThrustFrequency)),
                enemyFiringRange: Math.max(150, Math.min(400, mlSuggestions.enemyFiringRange || this.baseEnemyFiringRange))
            };
        }
        
        // Simple rule-based "ML model" (placeholder until real model is trained)
        // This adapts parameters based on game state
        let detectionRadius = this.baseDetectionRadius;
        let firingRange = this.baseFiringRange;
        let flockWeight = this.baseFlockWeight;
        let thrustFrequency = this.baseThrustFrequency;
        let enemyFiringRange = this.baseEnemyFiringRange;
        
        // Adaptive detection radius based on threat level
        if (features.threatLevel > 0.7) {
            detectionRadius = 150; // Increase detection when high threat
        } else if (features.threatLevel < 0.3) {
            detectionRadius = 80; // Decrease when low threat (save computation)
        }
        
        // Adaptive firing range based on enemy presence
        if (features.enemyCount > 0.5) {
            firingRange = 250; // Increase range when many enemies
            enemyFiringRange = 300; // Increase enemy firing range
        } else if (features.asteroidCount > 0.5) {
            firingRange = 180; // Focus on closer asteroids
        }
        
        // Adaptive flocking weight based on flock density and enemies
        if (features.hasNearbyEnemies) {
            flockWeight = 0.6; // Stronger flocking when enemies present (defensive mode)
        } else if (features.flockDensity > 0.5) {
            flockWeight = 0.4; // Moderate flocking when many allies
        } else {
            flockWeight = 0.2; // Lighter flocking when few allies
        }
        
        // Adaptive thrust frequency based on threat
        if (features.threatLevel > 0.6) {
            thrustFrequency = 0.04; // More frequent thrust when threatened
        } else {
            thrustFrequency = 0.015; // Less frequent when safe
        }
        
        // Apply safety bounds
        return {
            detectionRadius: Math.max(50, Math.min(200, detectionRadius)),
            firingRange: Math.max(100, Math.min(400, firingRange)),
            flockWeight: Math.max(0.1, Math.min(0.8, flockWeight)),
            thrustFrequency: Math.max(0.01, Math.min(0.1, thrustFrequency)),
            enemyFiringRange: Math.max(150, Math.min(400, enemyFiringRange))
        };
    }
    
    // Phase 5.2: Get ML-suggested priority weights with safety bounds
    getMLPriorityWeights(features) {
        if (!this.mlEnabled || !this.useMLPriorities) {
            // Fallback to rule-based base priority weights
            return {...this.basePriorityWeights};
        }
        
        // If ML model is available, use it
        if (this.mlModel && typeof this.mlModel.predictPriorityWeights === 'function') {
            const mlWeights = this.mlModel.predictPriorityWeights(features);
            
            // Apply safety bounds (rule-based constraints)
            // avoidShips must always be highest priority (safety)
            return {
                avoidShips: 1.0,  // Never reduce (safety)
                fireAtEnemies: Math.max(0.5, Math.min(1.0, mlWeights.fireAtEnemies || this.basePriorityWeights.fireAtEnemies)),
                protectAllies: Math.max(0.3, Math.min(0.8, mlWeights.protectAllies || this.basePriorityWeights.protectAllies)),
                fireAtAsteroids: Math.max(0.2, Math.min(0.6, mlWeights.fireAtAsteroids || this.basePriorityWeights.fireAtAsteroids)),
                avoidAsteroids: Math.max(0.2, Math.min(0.5, mlWeights.avoidAsteroids || this.basePriorityWeights.avoidAsteroids)),
                randomNav: Math.max(0.05, Math.min(0.2, mlWeights.randomNav || this.basePriorityWeights.randomNav))
            };
        }
        
        // Simple rule-based "ML model" (placeholder until real model is trained)
        // This adapts priority weights based on game state
        let fireAtEnemies = this.basePriorityWeights.fireAtEnemies;
        let protectAllies = this.basePriorityWeights.protectAllies;
        let fireAtAsteroids = this.basePriorityWeights.fireAtAsteroids;
        let avoidAsteroids = this.basePriorityWeights.avoidAsteroids;
        let randomNav = this.basePriorityWeights.randomNav;
        
        // Adapt priorities based on situation
        
        // High enemy count -> prioritize combat
        if (features.enemyCount > 0.5) {
            fireAtEnemies = 0.9; // Very high priority
            protectAllies = 0.7; // Higher priority for protection
            fireAtAsteroids = 0.3; // Lower priority
            avoidAsteroids = 0.25; // Lower priority
        }
        
        // High threat level -> prioritize survival
        if (features.threatLevel > 0.7) {
            avoidAsteroids = 0.4; // Higher priority
            fireAtAsteroids = 0.35; // Medium priority
            randomNav = 0.05; // Very low priority
        }
        
        // High flock density -> prioritize coordination
        if (features.flockDensity > 0.5) {
            protectAllies = 0.65; // Higher priority
            fireAtEnemies = 0.75; // Slightly lower (coordinate instead of solo)
        }
        
        // Low health -> prioritize survival over combat
        if (features.health < 0.5) {
            avoidAsteroids = 0.45; // Higher priority
            fireAtEnemies = 0.65; // Lower priority
            protectAllies = 0.5; // Lower priority
        }
        
        // Nearby enemies -> prioritize combat and protection
        if (features.hasNearbyEnemies) {
            fireAtEnemies = 0.85; // Very high priority
            protectAllies = 0.7; // High priority
            fireAtAsteroids = 0.3; // Lower priority
        }
        
        // Apply safety bounds
        return {
            avoidShips: 1.0,  // Always highest (safety)
            fireAtEnemies: Math.max(0.5, Math.min(1.0, fireAtEnemies)),
            protectAllies: Math.max(0.3, Math.min(0.8, protectAllies)),
            fireAtAsteroids: Math.max(0.2, Math.min(0.6, fireAtAsteroids)),
            avoidAsteroids: Math.max(0.2, Math.min(0.5, avoidAsteroids)),
            randomNav: Math.max(0.05, Math.min(0.2, randomNav))
        };
    }
    
    // AI decision making - ENHANCED with predictive avoidance
    makeDecision(asteroids, aiShips, playerShip, enemyShips, enemyBullets = []) {
        // Phase 5.1: Update ML parameters (every N frames for performance)
        this.mlInferenceFrame++;
        if (this.mlInferenceFrame >= this.mlInferenceInterval) {
            this.mlInferenceFrame = 0;
            
            // Extract features and get ML-suggested parameters
            const features = this.extractFeatures(asteroids, aiShips, playerShip, enemyShips);
            const mlParams = this.getMLParameters(features);
            
            // Phase 5.2: Get ML-suggested priority weights
            if (this.useMLPriorities) {
                this.mlPriorityWeights = this.getMLPriorityWeights(features);
            }
            
            // Apply ML parameters
            if (this.useMLParameters) {
                const oldParams = {
                    detectionRadius: this.detectionRadius,
                    firingRange: this.firingRange,
                    flockWeight: this.flockWeight
                };
                
                this.detectionRadius = mlParams.detectionRadius;
                this.firingRange = mlParams.firingRange;
                this.flockWeight = mlParams.flockWeight;
                this.thrustFrequency = mlParams.thrustFrequency;
                this.enemyFiringRange = mlParams.enemyFiringRange;
                
                // Update defensive flocking weight based on ML suggestion
                if (features.hasNearbyEnemies) {
                    this.defensiveFlockWeight = Math.max(0.4, Math.min(0.8, mlParams.flockWeight * 1.2));
                }
                
                // Debug logging (only log when parameters change significantly)
                if (Math.abs(oldParams.detectionRadius - mlParams.detectionRadius) > 10 ||
                    Math.abs(oldParams.firingRange - mlParams.firingRange) > 20 ||
                    Math.abs(oldParams.flockWeight - mlParams.flockWeight) > 0.1) {
                    console.log('[ML] Parameters updated:', {
                        detectionRadius: mlParams.detectionRadius.toFixed(1),
                        firingRange: mlParams.firingRange.toFixed(1),
                        flockWeight: mlParams.flockWeight.toFixed(2),
                        threatLevel: features.threatLevel.toFixed(2),
                        enemyCount: features.enemyCount.toFixed(2)
                    });
                }
            } else {
                // Use base parameters
                this.detectionRadius = this.baseDetectionRadius;
                this.firingRange = this.baseFiringRange;
                this.flockWeight = this.baseFlockWeight;
                this.thrustFrequency = this.baseThrustFrequency;
                this.enemyFiringRange = this.baseEnemyFiringRange;
            }
            
            // Phase 5.1: Collect training data (if enabled)
            if (this.collectTrainingData) {
                this.collectTrainingSample(features, mlParams);
            }
            
            // Phase 5.3: Full ML Decision Making (if enabled)
            if (this.useMLDecisions && this.mlEnabled) {
                const mlAction = this.getMLAction(features);
                
                // Validate ML action for safety
                if (mlAction && this.isSafeMLAction(mlAction, asteroids, aiShips, playerShip, enemyShips)) {
                    // Execute ML action
                    this.executeMLAction(mlAction, asteroids, aiShips, playerShip, enemyShips);
                    return; // Skip rule-based decision making
                } else {
                    // ML action unsafe or unavailable - fallback to rule-based
                    // Continue with normal decision making below
                }
            }
        }
        
        const nearestAsteroid = this.findNearestAsteroid(asteroids);
        const nearestShip = this.findNearestShip(aiShips, playerShip);
        const nearestEnemy = this.findNearestEnemy(enemyShips);
        
        // HEALING SYSTEM: Find nearest Phase 1 ally for healing (Phase 3 ships only)
        const nearestPhase1Ally = this.findNearestPhase1Ally(aiShips);
        
        // ALPHA ATTACK: Find alpha ship and assign roles
        const alpha = this.findAlphaShip(aiShips);
        
        // PHASE 2: Assign role to ship
        this.assignRole(aiShips);
        
        // PHASE 2: Calculate formation position based on formation type
        const formationPos = this.calculateFormationPositionAdvanced(aiShips) || this.calculateFormationPosition(aiShips);
        
        // ALPHA ATTACK: Execute alpha attack (select target)
        const alphaAttackTarget = this.executeAlphaAttack(enemyShips);
        
        // PHASE 2: Execute flanking maneuver
        const flankingPos = this.executeFlankingManeuver(enemyShips, aiShips);
        
        // PHASE 2: Apply formation abilities
        this.applyFormationAbilities(aiShips);
        
        // PHASE 3: Adaptive Formation (alpha only)
        if (this.isAlpha) {
            this.calculateAdaptiveFormation(enemyShips, aiShips);
        }
        
        // PHASE 3: Multi-Target Coordination (alpha only)
        if (this.isAlpha) {
            this.coordinateMultiTarget(enemyShips, aiShips);
        }
        
        // PHASE 3: Escort & Protection Modes
        const escortPos = this.executeEscortMode(playerShip, aiShips, enemyShips);
        
        // ADVANCED PATTERNS: Tactical Attack Sequences (alpha only)
        if (tacticalAttackSequencesEnabled && this.isAlpha && alphaAttackEnabled && enemyShips && enemyShips.length > 0) {
            // Choose attack sequence based on situation
            const enemyCount = enemyShips.length;
            const wingmenCount = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this).length;
            
            if (enemyCount === 1 && wingmenCount >= 2) {
                // Single enemy: Use alpha strike combo
                this.executeAlphaStrikeCombo(enemyShips, aiShips);
            } else if (enemyCount >= 2 && wingmenCount >= 4) {
                // Multiple enemies: Use wave attack
                this.executeWaveAttack(enemyShips, aiShips);
            }
        }
        
        // ADVANCED PATTERNS: Dynamic Formation Transitions (alpha only)
        if (dynamicFormationTransitionsEnabled && this.isAlpha && alphaAttackEnabled) {
            // Formation morphing based on threat
            const threatLevel = this.calculateThreatLevel(asteroids, enemyShips);
            const enemyCount = enemyShips ? enemyShips.length : 0;
            
            if (threatLevel > 0.7 && this.formationType !== 'circle') {
                // High threat: Morph to defensive circle
                this.morphFormation('circle', aiShips);
            } else if (enemyCount >= 3 && this.formationType !== 'line') {
                // Many enemies: Morph to line formation
                this.morphFormation('line', aiShips);
            } else if (enemyCount === 1 && this.formationType !== 'diamond') {
                // Single enemy: Morph to diamond
                this.morphFormation('diamond', aiShips);
            }
            
            // Split and merge formation
            this.splitAndMergeFormation(enemyShips, aiShips);
        }
        
        // ADVANCED PATTERNS: Advanced Flanking Patterns (alpha only)
        if (advancedFlankingEnabled && this.isAlpha && alphaAttackEnabled && enemyShips && enemyShips.length > 0) {
            const wingmenCount = aiShips.filter(ship => ship && ship !== this && ship.alphaShip === this).length;
            const target = this.alphaAttackTarget || this.findNearestEnemy(enemyShips)?.enemyShip;
            
            if (target && wingmenCount >= 2) {
                // Choose flanking pattern based on situation
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 200 && wingmenCount >= 2) {
                    // Far target: Use hammer and anvil
                    this.executeHammerAndAnvil(enemyShips, aiShips);
                } else if (distance < 300 && wingmenCount >= 2) {
                    // Close target: Use scissors attack
                    this.executeScissorsAttack(enemyShips, aiShips);
                }
            }
        }
        
        // Update cooldowns
        if (this.flankingCooldown > 0) this.flankingCooldown--;
        if (this.formationAbilityCooldown > 0) this.formationAbilityCooldown--;
        if (this.formationSwitchCooldown > 0) this.formationSwitchCooldown--;
        if (this.flankTimer > 0 && this.flankPattern === 'none') this.flankTimer = 0;
        if (this.mergeTimer > 0 && !this.splitFormation) this.mergeTimer = 0;
        
        // Update shoot cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }
        
        // Update healing cooldown
        if (this.healingCooldown > 0) {
            this.healingCooldown--;
        }
        
        // Update alpha attack cooldown
        if (this.alphaAttackCooldown > 0) {
            this.alphaAttackCooldown--;
        }
        
        // Get current priority weights (ML or base)
        const priorityWeights = this.useMLPriorities ? this.mlPriorityWeights : this.basePriorityWeights;
        
        // ENHANCED: Predictive Avoidance - Check for incoming bullets
        const bulletThreat = this.predictBulletCollision(enemyBullets);
        
        // Phase 5.2: Weighted priority decision making
        // Calculate weighted scores for each possible action
        const actionScores = {
            avoidShips: 0,
            avoidBullets: 0, // NEW: Predictive bullet avoidance
            seekHealing: 0, // NEW: Seek Phase 1 ally for healing
            alphaAttack: 0, // NEW: Alpha attack pattern
            fireAtEnemies: 0,
            protectAllies: 0,
            fireAtAsteroids: 0,
            avoidAsteroids: 0,
            randomNav: 0
        };
        
        // Score: Avoid ships (always highest if ship is very close)
        if (nearestShip && nearestShip.distance < 60) {
            actionScores.avoidShips = priorityWeights.avoidShips * (1.0 - nearestShip.distance / 60);
        }
        
        // ENHANCED: Score: Avoid bullets (high priority when threat detected)
        if (bulletThreat) {
            // Higher threat = higher priority (inverse of time to collision)
            const threatScore = bulletThreat.threatLevel;
            actionScores.avoidBullets = Math.min(1.0, threatScore * 1.5); // Very high priority for bullets
        }
        
        // HEALING SYSTEM: Score: Seek healing (Phase 3 ships only, high priority when critical)
        if (nearestPhase1Ally && this.aiPhase === 3 && this.healingCooldown === 0) {
            // Higher priority when closer to Phase 1 ally
            const healingDistance = Math.min(1.0, nearestPhase1Ally.distance / this.seekHealingRange);
            // Very high priority for healing when in Phase 3 (0.9 weight)
            actionScores.seekHealing = 0.9 * (1.0 - healingDistance * 0.3); // Higher score when closer
        }
        
        // ADVANCED PATTERNS: Score: Advanced flanking patterns (high priority when enabled)
        if (advancedFlankingEnabled && alphaAttackEnabled && this.isAlpha && this.flankPattern !== 'none') {
            const targetToUse = this.alphaAttackTarget || (nearestEnemy ? nearestEnemy.enemyShip : null);
            if (targetToUse) {
                const targetDistance = Math.min(1.0, Math.sqrt(
                    (targetToUse.x - this.x) ** 2 + (targetToUse.y - this.y) ** 2
                ) / this.enemyDetectionRadius);
                actionScores.alphaAttack = 0.9 * (1.0 - targetDistance * 0.4); // High priority for advanced flanking
            }
        }
        // ALPHA ATTACK: Score: Alpha attack pattern (high priority when enabled and target available)
        else if (alphaAttackTarget && alphaAttackEnabled) {
            if (this.isAlpha) {
                // Alpha: High priority to lead attack
                const targetDistance = Math.min(1.0, Math.sqrt(
                    (alphaAttackTarget.x - this.x) ** 2 + (alphaAttackTarget.y - this.y) ** 2
                ) / this.enemyDetectionRadius);
                actionScores.alphaAttack = 0.85 * (1.0 - targetDistance * 0.5);
            } else if (this.alphaShip) {
                // PHASE 2: Flanking has higher priority than standard formation
                if (flankingPos && this.flankingMode !== 'none') {
                    const flankDistance = Math.min(1.0, Math.sqrt(
                        (flankingPos.x - this.x) ** 2 + (flankingPos.y - this.y) ** 2
                    ) / 200);
                    actionScores.alphaAttack = 0.9 * (1.0 - flankDistance * 0.3); // Higher priority for flanking
                } else if (formationPos) {
                    // Wingmen: High priority to follow alpha in formation
                    const formationDistance = Math.min(1.0, formationPos.distance / 200);
                    actionScores.alphaAttack = 0.8 * (1.0 - formationDistance * 0.4);
                }
            }
        }
        
        // Score: Fire at enemies
        if (nearestEnemy && this.shouldFireAtEnemy(nearestEnemy.enemyShip)) {
            const enemyDistance = Math.min(1.0, nearestEnemy.distance / this.enemyFiringRange);
            actionScores.fireAtEnemies = priorityWeights.fireAtEnemies * (1.0 - enemyDistance * 0.5);
        }
        
        // Score: Protect allies
        const protectionAngle = this.protectAllies(aiShips, enemyShips);
        if (protectionAngle !== null) {
            actionScores.protectAllies = priorityWeights.protectAllies * (this.hasNearbyEnemies(enemyShips) ? 1.0 : 0.6);
        }
        
        // Score: Fire at asteroids
        let shouldFireAtAsteroid = false;
        let targetAsteroid = null;
        asteroids.forEach(asteroid => {
            if (this.shouldFire(asteroid)) {
                const dx = asteroid.x - this.x;
                const dy = asteroid.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (!targetAsteroid || distance < Math.sqrt(
                    (targetAsteroid.x - this.x) ** 2 + (targetAsteroid.y - this.y) ** 2
                )) {
                    targetAsteroid = asteroid;
                    shouldFireAtAsteroid = true;
                }
            }
        });
        if (targetAsteroid && shouldFireAtAsteroid) {
            const asteroidDistance = Math.min(1.0, Math.sqrt(
                (targetAsteroid.x - this.x) ** 2 + (targetAsteroid.y - this.y) ** 2
            ) / this.firingRange);
            actionScores.fireAtAsteroids = priorityWeights.fireAtAsteroids * (1.0 - asteroidDistance * 0.5);
        }
        
        // Score: Avoid asteroids
        if (nearestAsteroid) {
            const asteroidDistance = Math.min(1.0, nearestAsteroid.distance / this.detectionRadius);
            actionScores.avoidAsteroids = priorityWeights.avoidAsteroids * (1.0 - asteroidDistance);
        }
        
        // Score: Random navigation (always low, but present)
        actionScores.randomNav = priorityWeights.randomNav * 0.1;
        
        // Find the action with the highest weighted score
        let bestAction = 'randomNav';
        let bestScore = actionScores.randomNav;
        for (const [action, score] of Object.entries(actionScores)) {
            if (score > bestScore) {
                bestScore = score;
                bestAction = action;
            }
        }
        
        // Execute the best action based on weighted priorities
        // Priority 0: Avoid bullets (highest priority - predictive avoidance)
        if (bestAction === 'avoidBullets' && bulletThreat) {
            // Calculate evasion angle (perpendicular to bullet trajectory)
            const bulletAngle = Math.atan2(bulletThreat.bullet.velocityY, bulletThreat.bullet.velocityX);
            const evasionAngle = bulletAngle + Math.PI / 2; // Perpendicular (90 degrees)
            
            // Choose the direction that moves away from bullet
            const dx = this.x - bulletThreat.bullet.x;
            const dy = this.y - bulletThreat.bullet.y;
            const angleToBullet = Math.atan2(dy, dx);
            
            // Evade perpendicular to bullet path, away from bullet
            this.targetAngle = evasionAngle;
            if (Math.abs(this.normalizeAngle(evasionAngle - angleToBullet)) > Math.PI / 2) {
                this.targetAngle = evasionAngle + Math.PI; // Reverse direction if needed
            }
            
            // Apply extra thrust for evasion (weighted by threat level)
            const thrustChance = 0.6 * bulletThreat.threatLevel;
            if (Math.random() < thrustChance) {
                this.thrust(1.5); // Strong evasion thrust
            }
        }
        // Priority 1: Avoid other ships (highest priority - immediate threat, safety-critical)
        else if (bestAction === 'avoidShips' || (nearestShip && nearestShip.distance < 60)) {
            // Ship too close - move away immediately
            const avoidanceAngle = nearestShip.angle + Math.PI; // Opposite direction
            this.targetAngle = avoidanceAngle;
            
            // Apply extra thrust to get away quickly (weighted by priority)
            const thrustChance = 0.3 * priorityWeights.avoidShips;
            if (Math.random() < thrustChance) {
                this.thrust(1.5); // Extra thrust to escape faster
            }
        }
        // HEALING SYSTEM: Priority 1.5: Seek healing (Phase 3 ships only)
        else if (bestAction === 'seekHealing' && nearestPhase1Ally && this.aiPhase === 3 && this.healingCooldown === 0) {
            // Move toward Phase 1 ally for healing
            this.targetAngle = nearestPhase1Ally.angle;
            
            // Rotate toward target
            let angleDiff = this.normalizeAngle(this.targetAngle - this.angle);
            this.rotate(angleDiff > 0 ? 1 : -1);
            
            // Apply thrust to move toward ally (weighted by priority)
            const thrustChance = 0.4; // Higher chance to move toward healing
            if (Math.random() < thrustChance) {
                this.thrust(1.2); // Moderate thrust to reach ally
            }
        }
        // ADVANCED PATTERNS: Priority 1.5: Advanced flanking patterns
        else if (bestAction === 'alphaAttack' && advancedFlankingEnabled && alphaAttackEnabled && this.isAlpha && this.flankPattern !== 'none') {
            // Execute advanced flanking (hammer & anvil or scissors)
            if (this.flankPattern === 'hammerAnvil') {
                this.executeHammerAndAnvil(enemyShips, aiShips);
            } else if (this.flankPattern === 'scissors') {
                this.executeScissorsAttack(enemyShips, aiShips);
            }
        }
        // ALPHA ATTACK: Priority 1.6: Alpha attack pattern (coordinated V-formation attack)
        // PHASE 3: Escort mode takes precedence over standard alpha attack
        else if (bestAction === 'alphaAttack' && escortPos && escortMode !== 'none' && alphaAttackEnabled) {
            // PHASE 3: Execute escort/protection mode
            const dx = escortPos.x - this.x;
            const dy = escortPos.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            this.targetAngle = Math.atan2(dy, dx);
            
            // Rotate toward escort position
            let angleDiff = this.normalizeAngle(this.targetAngle - this.angle);
            this.rotate(angleDiff > 0 ? 1 : -1);
            
            // Fire at threats when in escort mode
            if (escortMode === 'intercept' && this.interceptTarget) {
                const target = this.interceptTarget;
                const dxToTarget = target.x - this.x;
                const dyToTarget = target.y - this.y;
                const distToTarget = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);
                
                if (distToTarget < this.enemyFiringRange) {
                    const targetAngle = Math.atan2(dyToTarget, dxToTarget);
                    const targetAngleDiff = this.normalizeAngle(targetAngle - this.angle);
                    
                    if (Math.abs(targetAngleDiff) < 0.5 && this.shouldFireAtEnemy(target)) {
                        if (this.coordinateFiring(target, aiShips)) {
                            this.fire(target);
                        }
                    }
                }
            } else if (escortMode === 'guard' && this.alphaAttackTarget) {
                // Guard mode: Fire at threats to protected target
                const target = this.alphaAttackTarget;
                const dxToTarget = target.x - this.x;
                const dyToTarget = target.y - this.y;
                const distToTarget = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);
                
                if (distToTarget < this.enemyFiringRange) {
                    const targetAngle = Math.atan2(dyToTarget, dxToTarget);
                    const targetAngleDiff = this.normalizeAngle(targetAngle - this.angle);
                    
                    if (Math.abs(targetAngleDiff) < 0.5 && this.shouldFireAtEnemy(target)) {
                        if (this.coordinateFiring(target, aiShips)) {
                            this.fire(target);
                        }
                    }
                }
            }
            
            // Apply thrust to maintain escort position
            const thrustChance = 0.5;
            if (Math.random() < thrustChance || distance > 50) {
                this.thrust(1.2); // Moderate thrust for escort
            }
        } else if (bestAction === 'alphaAttack' && alphaAttackTarget && alphaAttackEnabled) {
            if (this.isAlpha) {
                // Alpha: Lead the attack toward target (or assigned target in multi-target mode)
                const targetToUse = this.assignedTarget || alphaAttackTarget;
                const dx = targetToUse.x - this.x;
                const dy = targetToUse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.targetAngle = Math.atan2(dy, dx);
                
                // Rotate toward target
                let angleDiff = this.normalizeAngle(this.targetAngle - this.angle);
                this.rotate(angleDiff > 0 ? 1 : -1);
                
                // Fire at target when in range and aligned
                if (distance < this.enemyFiringRange && Math.abs(angleDiff) < 0.4) {
                    if (this.shouldFireAtEnemy(targetToUse) && this.coordinateFiring(targetToUse, aiShips)) {
                        this.fire(targetToUse);
                    }
                }
                
                // Apply thrust to approach target (only if not anchored)
                if (!anchorAlphaShip) {
                    const thrustChance = 0.5;
                    if (Math.random() < thrustChance) {
                        this.thrust(1.3); // Strong thrust for alpha
                    }
                }
            } else if (this.alphaShip && formationPos) {
                // Wingmen: Follow alpha in formation (or assigned target in multi-target mode)
                const targetToUse = this.assignedTarget || (this.alphaShip.alphaAttackTarget);
                
                const dx = formationPos.x - this.x;
                const dy = formationPos.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.targetAngle = Math.atan2(dy, dx);
                
                // Rotate toward formation position
                let angleDiff = this.normalizeAngle(this.targetAngle - this.angle);
                this.rotate(angleDiff > 0 ? 1 : -1);
                
                // Match alpha's angle for formation
                const alphaAngleDiff = this.normalizeAngle(this.alphaShip.angle - this.angle);
                this.rotate(alphaAngleDiff > 0 ? 0.5 : -0.5);
                
                // Fire at assigned target or alpha's target when in range
                if (targetToUse) {
                    const dxToTarget = targetToUse.x - this.x;
                    const dyToTarget = targetToUse.y - this.y;
                    const distToTarget = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);
                    
                    if (distToTarget < this.enemyFiringRange) {
                        const targetAngle = Math.atan2(dyToTarget, dxToTarget);
                        const targetAngleDiff = this.normalizeAngle(targetAngle - this.angle);
                        
                        if (Math.abs(targetAngleDiff) < 0.5 && this.shouldFireAtEnemy(targetToUse)) {
                            if (this.coordinateFiring(targetToUse, aiShips)) {
                                this.fire(targetToUse);
                            }
                        }
                    }
                }
                
                // Apply thrust to maintain formation
                const thrustChance = 0.4;
                if (Math.random() < thrustChance || distance > 100) {
                    this.thrust(1.2); // Moderate thrust to maintain formation
                }
            }
        }
        // Priority 2: Fire at enemy ships (weighted priority - combat)
        else if (bestAction === 'fireAtEnemies' && nearestEnemy && this.shouldFireAtEnemy(nearestEnemy.enemyShip)) {
            // Check coordination before firing
            if (this.coordinateFiring(nearestEnemy.enemyShip, aiShips)) {
                // Rotate toward enemy to aim
                const predicted = this.predictEnemyPosition(nearestEnemy.enemyShip);
                if (predicted) {
                    this.targetAngle = predicted.angle;
                } else {
                    this.targetAngle = nearestEnemy.angle;
                }
                
                // Rotate toward target
                let angleDiff = this.normalizeAngle(this.targetAngle - this.angle);
                if (Math.abs(angleDiff) < 0.4) { // Wider angle tolerance for rapid fire
                    this.fire(nearestEnemy.enemyShip);
                }
                this.rotate(angleDiff > 0 ? 1 : -1);
            } else {
                // Other ships are already targeting, just rotate toward enemy
                this.targetAngle = nearestEnemy.angle;
            }
        }
        // Priority 3: Protect allies (weighted priority - flocking and protection)
        else if (bestAction === 'protectAllies') {
            const protectionAngle = this.protectAllies(aiShips, enemyShips);
            const flockResult = this.calculateFlocking(aiShips, enemyShips);
            const flockAngle = flockResult.angle;
            const flockWeight = flockResult.weight;
            
            if (protectionAngle !== null) {
                // Protect nearby allies from enemies (weighted by priority)
                const enemiesPresent = this.hasNearbyEnemies(enemyShips);
                if (enemiesPresent) {
                    // When enemies present, prioritize protection more strongly
                    this.targetAngle = protectionAngle;
                    // Apply extra thrust to move closer to allies faster (weighted)
                    const thrustChance = 0.4 * priorityWeights.protectAllies;
                    if (Math.random() < thrustChance) {
                        this.thrust(1.2);
                    }
                } else {
                    this.targetAngle = protectionAngle;
                }
            } else if (flockAngle !== this.angle) {
                // Apply flocking behavior (weighted with current target and priority)
                const currentAngle = this.targetAngle;
                const angleDiff = this.normalizeAngle(flockAngle - currentAngle);
                // Combine flock weight with priority weight
                const combinedWeight = flockWeight * priorityWeights.protectAllies;
                this.targetAngle = currentAngle + angleDiff * combinedWeight;
                
                // When enemies present, apply more thrust to maintain formation (weighted)
                if (this.hasNearbyEnemies(enemyShips) && Math.random() < 0.3 * priorityWeights.protectAllies) {
                    this.thrust(1.1);
                }
            }
        }
        // Priority 4: Fire at threatening asteroids (weighted priority)
        else if (bestAction === 'fireAtAsteroids' && targetAsteroid && shouldFireAtAsteroid) {
            // Rotate toward target asteroid to aim
            const dx = targetAsteroid.x - this.x;
            const dy = targetAsteroid.y - this.y;
            const angleToTarget = Math.atan2(dy, dx);
            this.targetAngle = angleToTarget;
            
            // Rotate toward target (angle tolerance weighted by priority)
            let angleDiff = this.normalizeAngle(this.targetAngle - this.angle);
            const angleTolerance = 0.4 * priorityWeights.fireAtAsteroids;
            if (Math.abs(angleDiff) < angleTolerance) {
                this.fire();
            }
            this.rotate(angleDiff > 0 ? 1 : -1);
        }
        // Priority 5: Avoid asteroids (weighted priority)
        else if (bestAction === 'avoidAsteroids' && nearestAsteroid) {
            // Asteroid detected - calculate avoidance angle
            const angleToAsteroid = nearestAsteroid.angle;
            const avoidanceAngle = angleToAsteroid + Math.PI; // Opposite direction
            
            // Rotate towards avoidance direction (thrust weighted by priority)
            this.targetAngle = avoidanceAngle;
            if (Math.random() < 0.2 * priorityWeights.avoidAsteroids) {
                this.thrust(1.1);
            }
        }
        // Priority 6: Avoid ships at medium distance (safety fallback)
        else if (nearestShip && nearestShip.distance < 120) {
            // Ship at medium distance - maintain separation
            const avoidanceAngle = nearestShip.angle + Math.PI;
            this.targetAngle = avoidanceAngle;
        }
        // Priority 7: Random navigation (weighted priority)
        else {
            // No immediate threat - random navigation (weighted by priority)
            const randomChance = 0.01 * priorityWeights.randomNav;
            if (Math.random() < randomChance) {
                // Occasionally change direction
                this.targetAngle = Math.random() * Math.PI * 2;
            }
        }

        // Rotate towards target angle
        let angleDiff = this.normalizeAngle(this.targetAngle - this.angle);
        if (Math.abs(angleDiff) > 0.1) {
            this.rotate(angleDiff > 0 ? 1 : -1);
        }

        // Thrust occasionally to maintain movement
        if (Math.random() < this.thrustFrequency) {
            this.thrust();
        }
        
        // Note: updateAIPhase() and updateAIShield() are now called separately
        // in the main update loop to work with both MARL and rule-based systems
    }
    
    // Phase 5.1: Collect training data sample for ML training
    collectTrainingSample(features, mlParams) {
        // Create training sample
        const sample = {
            timestamp: Date.now(),
            features: { ...features },
            parameters: { ...mlParams },
            shipState: {
                x: this.x,
                y: this.y,
                angle: this.angle,
                velocityX: this.velocityX,
                velocityY: this.velocityY,
                health: this.health,
                phase: this.aiPhase
            }
        };
        
        // Add to buffer
        this.trainingDataBuffer.push(sample);
        
        // Limit buffer size
        if (this.trainingDataBuffer.length > this.maxTrainingSamples) {
            this.trainingDataBuffer.shift(); // Remove oldest sample
        }
    }
    
    // Phase 5.1: Export training data (for ML training)
    exportTrainingData() {
        if (this.trainingDataBuffer.length === 0) {
            return null;
        }
        
        // Convert to JSON string for download
        const dataStr = JSON.stringify(this.trainingDataBuffer, null, 2);
        return dataStr;
    }
    
    // Update AI ship phase based on health
    updateAIPhase() {
        if (this.maxHealth <= 0) return; // Safety check
        const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
        const oldPhase = this.aiPhase;
        
        if (healthPercent > 0.66) {
            this.aiPhase = 1;
        } else if (healthPercent > 0.33) {
            this.aiPhase = 2;
        } else {
            this.aiPhase = 3;
        }
        
        // Phase transition effects - ENHANCED with temporary invulnerability
        if (oldPhase !== this.aiPhase) {
            this.phaseTransitionTimer = 60; // 1 second transition effect
            this.shieldActive = true;
            // Phase 3: Longer invulnerability on phase transition (temporary invulnerability)
            if (this.aiPhase === 3) {
                this.shieldDuration = 45; // 0.75 seconds of invulnerability (was 30 = 0.5s)
            } else {
                this.shieldDuration = 30; // Brief invincibility on phase change (0.5s)
            }
        }
    }
    
    // AI ship shield system - ENHANCED with Phase-Based Defense
    updateAIShield() {
        if (this.shieldDuration > 0) {
            this.shieldDuration--;
            this.shieldActive = true;
        } else {
            this.shieldActive = false;
        }
        
        // Phase-Based Defense Enhancements:
        // Phase 2: Increased shield frequency (1% chance per frame)
        // Phase 3: Maximum shield frequency (2% chance per frame) + longer duration
        if (this.shieldCooldown > 0) {
            this.shieldCooldown--;
        } else if (this.aiPhase >= 2 && !this.shieldActive) {
            let shieldChance = 0.005; // Base 0.5% for Phase 2
            let shieldDuration = 60; // 1 second base duration
            
            if (this.aiPhase === 2) {
                shieldChance = 0.01; // 1% chance per frame in Phase 2
                shieldDuration = 75; // 1.25 seconds
            } else if (this.aiPhase === 3) {
                shieldChance = 0.02; // 2% chance per frame in Phase 3 (maximum)
                shieldDuration = 90; // 1.5 seconds (longer)
            }
            
            if (Math.random() < shieldChance) {
                this.shieldActive = true;
                this.shieldDuration = shieldDuration;
                this.shieldCooldown = this.aiPhase === 3 ? 240 : 300; // Shorter cooldown in Phase 3
            }
        }
    }

    // Override draw to make AI ship visually distinct
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // AI ship shield visual effect
        if (this.shieldActive) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            const shieldRadius = this.size + 8 + Math.sin(Date.now() / 50) * 3;
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        
        // Phase transition effect
        if (this.phaseTransitionTimer > 0) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            this.phaseTransitionTimer--;
        }
        
        // HEALING SYSTEM: Healing visual effect (green pulsing circle)
        if (this.healingEffect && this.healingEffectTimer > 0) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 100) * 0.3;
            ctx.beginPath();
            const healingRadius = this.size + 5 + Math.sin(Date.now() / 50) * 5;
            ctx.arc(0, 0, healingRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            this.healingEffectTimer--;
            if (this.healingEffectTimer <= 0) {
                this.healingEffect = false;
            }
        }
        
        ctx.rotate(this.angle);

        // ALPHA ATTACK: Visual indicator for alpha ship (golden glow)
        if (this.isAlpha && alphaAttackEnabled) {
            ctx.strokeStyle = '#ffd700'; // Gold color for alpha
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            const alphaGlowRadius = this.size + 8 + Math.sin(Date.now() / 100) * 4;
            ctx.arc(0, 0, alphaGlowRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        
        // PHASE 2: Formation Shield visual effect
        if (this.formationShieldActive && alphaAttackEnabled) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            const shieldRadius = this.size + 12 + Math.sin(Date.now() / 80) * 3;
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        
        // PHASE 2: Formation Boost visual effect (speed lines)
        if (this.formationBoostActive && alphaAttackEnabled) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                const boostX = -this.size - 10 - (i * 8);
                ctx.moveTo(boostX, -this.size / 3);
                ctx.lineTo(boostX - 5, 0);
                ctx.lineTo(boostX, this.size / 3);
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        }
        
        // PHASE 2: Role indicator (small icon/color)
        if (this.role && alphaAttackEnabled) {
            const roleColors = {
                scout: '#00ffff',
                tank: '#ff8800',
                support: '#00ff00',
                dps: '#ff0000',
                interceptor: '#ffff00'
            };
            ctx.fillStyle = roleColors[this.role] || '#ffffff';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(this.size + 5, -this.size - 5, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        
        // Draw triangular ship (blue color for AI, intensity based on phase)
        let intensity = 1.0;
        if (this.aiPhase === 2) intensity = 1.2;
        if (this.aiPhase === 3) intensity = 1.5;
        
        // Phase-based color intensity
        let blueValue = Math.floor(170 / intensity);
        // ALPHA ATTACK: Alpha ship has golden tint
        if (this.isAlpha && alphaAttackEnabled) {
            ctx.strokeStyle = `rgba(255, 215, 0, 1)`; // Gold for alpha
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = `rgba(0, ${blueValue}, 255, 1)`;
            ctx.lineWidth = 2;
        }
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size / 2, -this.size / 2);
        ctx.lineTo(-this.size / 2, this.size / 2);
        ctx.closePath();
        ctx.stroke();

        // Draw detection radius indicator (subtle)
        ctx.strokeStyle = '#00aaff';
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.detectionRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Draw thruster effect when moving
        if (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1) {
            ctx.strokeStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(-this.size / 2, -this.size / 4);
            ctx.lineTo(-this.size - 5, 0);
            ctx.lineTo(-this.size / 2, this.size / 4);
            ctx.stroke();
        }

        ctx.restore();
        
        // Draw health bar and phase indicator
        ctx.save();
        ctx.translate(this.x, this.y - this.size - 10);
        const barWidth = this.size * 1.5;
        const barHeight = 3;
        const healthPercent = this.maxHealth > 0 ? Math.max(0, Math.min(1, this.health / this.maxHealth)) : 0;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight);
        
        // Health bar color based on phase
        if (this.aiPhase === 1) ctx.fillStyle = '#00ff00'; // Green
        else if (this.aiPhase === 2) ctx.fillStyle = '#ffff00'; // Yellow
        else ctx.fillStyle = '#ff0000'; // Red
        
        ctx.fillRect(-barWidth / 2, -barHeight / 2, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight);
        
        // Phase indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Phase ${this.aiPhase}`, 0, -8);
        
        // PHASE 3: Escort mode indicator
        if (escortMode !== 'none' && this.escortTarget) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '7px Arial';
            ctx.fillText(escortMode.toUpperCase(), 0, -15);
        }
        
        // PHASE 3: Multi-target mode indicator (alpha only)
        if (this.isAlpha && multiTargetMode !== 'focus' && this.assignedTarget) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = '7px Arial';
            ctx.fillText(`TGT:${multiTargetMode}`, 0, -22);
        }
        
        // PHASE 3: Adaptive formation indicator (alpha only)
        if (this.isAlpha && adaptiveFormationEnabled && this.formationTypeChanged) {
            ctx.fillStyle = '#00ffff';
            ctx.font = '7px Arial';
            ctx.fillText(`FORM:${this.formationType}`, 0, -29);
        }
        
        // PHASE 5.3: ML Decision mode indicator
        if (this.useMLDecisions && this.mlEnabled) {
            ctx.fillStyle = '#ff00ff';
            ctx.font = '7px Arial';
            ctx.fillText('ML:ON', 0, -36);
        }
        
        // ADVANCED PATTERNS: Attack sequence indicator (alpha only)
        if (this.isAlpha && this.attackSequence !== 'none') {
            ctx.fillStyle = '#ff6600';
            ctx.font = '7px Arial';
            const sequenceNames = {
                'alphaStrike': 'COMBO',
                'wave': 'WAVE'
            };
            ctx.fillText(sequenceNames[this.attackSequence] || 'SEQ', 0, -43);
        }
        
        // ADVANCED PATTERNS: Formation morphing indicator (alpha only)
        if (this.isAlpha && this.formationMorphing) {
            ctx.fillStyle = '#00ffff';
            ctx.font = '7px Arial';
            ctx.fillText(`MORPH:${this.formationMorphTarget}`, 0, -50);
        }
        
        // ADVANCED PATTERNS: Split formation indicator (alpha only)
        if (this.isAlpha && this.splitFormation) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '7px Arial';
            ctx.fillText('SPLIT', 0, -57);
        }
        
        // ADVANCED PATTERNS: Flanking pattern indicator (alpha only)
        if (this.isAlpha && this.flankPattern !== 'none') {
            ctx.fillStyle = '#ff00ff';
            ctx.font = '7px Arial';
            const patternNames = {
                'hammerAnvil': 'HAMMER',
                'scissors': 'SCISSORS'
            };
            ctx.fillText(patternNames[this.flankPattern] || 'FLANK', 0, -64);
        }
        
        ctx.restore();
        
        // PHASE 3: Draw escort connection line
        if (escortMode !== 'none' && this.escortTarget) {
            ctx.save();
            ctx.strokeStyle = '#00ff00';
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.escortTarget.x, this.escortTarget.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;
            ctx.restore();
        }
        
        // PHASE 3: Draw patrol path (patrol mode) - only draw once per alpha ship
        if (escortMode === 'patrol' && this.isAlpha) {
            ctx.save();
            ctx.strokeStyle = '#00aaff';
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Draw patrol circle around alpha ship
            ctx.arc(this.x, this.y, this.patrolRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            ctx.restore();
        }
    }
}

// Enemy Bullet class (red/orange bullets that can hit player)
class EnemyBullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 7;
        this.radius = 3;
        this.lifetime = 90;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.lifetime--;

        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ff8800';
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    isAlive() {
        return this.lifetime > 0;
    }

    getPosition() {
        return { x: this.x, y: this.y, radius: this.radius };
    }
}

// Enemy Ship class - Hostile AI ships that attack the player
class EnemyShip {
    constructor(x = null, y = null, type = 'basic') {
        if (x === null || y === null) {
            const side = Math.floor(Math.random() * 4);
            switch (side) {
                case 0: this.x = Math.random() * canvas.width; this.y = 0; break;
                case 1: this.x = canvas.width; this.y = Math.random() * canvas.height; break;
                case 2: this.x = Math.random() * canvas.width; this.y = canvas.height; break;
                case 3: this.x = 0; this.y = Math.random() * canvas.height; break;
            }
        } else {
            this.x = x;
            this.y = y;
        }

        this.type = type;
        this.velocityX = 0;
        this.velocityY = 0;
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = 0.08;
        this.thrustPower = 0.12;
        this.friction = 0.98;
        this.maxVelocity = 6;
        this.health = this.getMaxHealth();
        this.maxHealth = this.health;
        this.fireCooldown = 0;
        this.fireRate = this.getFireRate();
        this.bulletSpeed = 7;
        this.attackRange = 300;
        this.detectionRadius = 400;
        this.evasionRadius = 80;
        this.behaviorState = 'pursuit';
        this.target = null;
        this.predictedPosition = null;
        this.coverAsteroid = null;
        this.flankAngle = 0;
        this.size = this.getSize();
        this.radius = this.size * 0.75;
        this.color = this.getColor();
        this.targetAngle = this.angle;
        
        // ENHANCEMENT 1 & 3: Track target score and burst fire state
        this.targetScore = 0;
        this.burstFireActive = false;
        this.burstFireTimer = 0;
        
        // SHIELD SYSTEM: Add shield to basic and advanced enemy ships (same as blue ships)
        if (this.type === 'basic' || this.type === 'advanced') {
            this.shieldActive = false;
            this.shieldCooldown = 0;
            this.shieldDuration = 0;
            this.shieldRadius = 40; // Same as blue ships
            this.shieldForce = 0.5; // Same as blue ships
            this.shieldCooldownMax = 300; // 5 seconds at 60fps (same as blue ships)
        }
        
        // Boss-specific properties for Phase 4
        if (this.type === 'boss') {
            this.bossPhase = 1; // 1, 2, or 3
            this.shieldActive = false;
            this.shieldCooldown = 0;
            this.shieldDuration = 0;
            this.teleportCooldown = 0;
            this.attackPattern = 'normal'; // normal, spread, rapid, circular
            this.attackPatternTimer = 0;
            this.rapidFireBurst = 0;
            this.rapidFireBurstCount = 0;
            this.erraticMovementTimer = 0;
            this.phaseTransitionTimer = 0;
        }
    }

    getMaxHealth() {
        switch (this.type) {
            case 'basic': return 1;
            case 'advanced': return 2;
            case 'boss': return 5;
            default: return 1;
        }
    }

    getFireRate() {
        switch (this.type) {
            case 'basic': return 30;
            case 'advanced': return 20;
            case 'boss': return 10;
            default: return 30;
        }
    }

    getSize() {
        switch (this.type) {
            case 'basic': return 18;
            case 'advanced': return 22;
            case 'boss': return 35;
            default: return 18;
        }
    }

    getColor() {
        switch (this.type) {
            case 'basic': return '#ff4444';
            case 'advanced': return '#aa44ff';
            case 'boss': return '#ff0000';
            default: return '#ff4444';
        }
    }

    // ENHANCEMENT 1: Score target based on multiple factors (smarter prioritization)
    scoreTarget(targetShip) {
        if (!targetShip) return 0;
        
        let score = 0;
        
        // Low health priority (higher score for lower health)
        if (targetShip.health !== undefined && targetShip.maxHealth !== undefined) {
            const healthRatio = targetShip.health / targetShip.maxHealth;
            score += (1.0 - healthRatio) * 100; // 0-100 points (lower health = higher score)
        }
        
        // Alpha ship priority (high priority to disrupt coordination)
        if (targetShip.isAlpha) {
            score += 150; // High priority for alpha ship
        }
        
        // Isolation bonus (no nearby allies)
        // Count nearby allies within 150px
        let nearbyAllies = 0;
        if (typeof aiShips !== 'undefined' && Array.isArray(aiShips)) {
            aiShips.forEach(ally => {
                if (ally && ally !== targetShip) {
                    const dx = ally.x - targetShip.x;
                    const dy = ally.y - targetShip.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 150) {
                        nearbyAllies++;
                    }
                }
            });
        }
        if (nearbyAllies === 0) {
            score += 50; // Isolated target bonus
        }
        
        // Active threat (check if ship is firing - approximate by checking if it has a target)
        if (targetShip.alphaAttackTarget || targetShip.assignedTarget) {
            score += 75; // Active threat bonus
        }
        
        // Shield penalty (avoid shielded targets)
        if (targetShip.shieldActive) {
            score -= 100; // Avoid shielded targets
        }
        
        return score;
    }
    
    // ENHANCEMENT 1: Find best target using smart prioritization
    findTarget(aiShips) {
        let bestTarget = null;
        let bestScore = -Infinity;
        
        // Check player ship
        if (playerShipActive && ship) {
            const dx = ship.x - this.x;
            const dy = ship.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.detectionRadius) {
                // Player ship gets base score (prioritize over AI ships if close)
                const baseScore = 50;
                const distanceFactor = 1.0 / (distance + 1); // Closer = better
                const totalScore = baseScore * distanceFactor;
                
                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestTarget = { 
                        ship: ship, 
                        distance: distance, 
                        angle: Math.atan2(dy, dx),
                        isPlayer: true,
                        score: totalScore
                    };
                }
            }
        }
        
        // Check AI ships with smart scoring
        aiShips.forEach(aiShip => {
            if (!aiShip) return;
            
            const dx = aiShip.x - this.x;
            const dy = aiShip.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.detectionRadius) {
                // Calculate smart score
                const targetScore = this.scoreTarget(aiShip);
                const distanceFactor = 1.0 / (distance + 1); // Closer = better
                const totalScore = targetScore * distanceFactor;
                
                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestTarget = { 
                        ship: aiShip, 
                        distance: distance, 
                        angle: Math.atan2(dy, dx),
                        isPlayer: false,
                        score: totalScore
                    };
                }
            }
        });
        
        return bestTarget;
    }

    // Predict target position for leading shots
    predictTargetPosition(target) {
        if (!target || !target.ship) return null;
        const dx = target.ship.x - this.x;
        const dy = target.ship.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > this.attackRange) return null;
        const timeToReach = distance / this.bulletSpeed;
        const predictedX = target.ship.x + target.ship.velocityX * timeToReach;
        const predictedY = target.ship.y + target.ship.velocityY * timeToReach;
        const wrappedX = ((predictedX % canvas.width) + canvas.width) % canvas.width;
        const wrappedY = ((predictedY % canvas.height) + canvas.height) % canvas.height;
        return { x: wrappedX, y: wrappedY, angle: Math.atan2(wrappedY - this.y, wrappedX - this.x) };
    }

    shouldFire(aiShips) {
        if (this.fireCooldown > 0) return false;
        const target = this.findTarget(aiShips);
        if (!target || target.distance > this.attackRange) return false;
        return true;
    }

    // ENHANCEMENT 3: Fire at specific angle (helper for burst and spread)
    fireAtAngle(angle) {
        const bulletX = this.x + Math.cos(angle) * this.size;
        const bulletY = this.y + Math.sin(angle) * this.size;
        enemyBullets.push(new EnemyBullet(bulletX, bulletY, angle));
        playFireSound(true);
    }
    
    // ENHANCEMENT 3: Burst fire pattern (multiple shots in quick succession)
    fireBurst(target, count = 3) {
        if (!target) return;
        
        const predicted = this.predictTargetPosition(target);
        let baseAngle = this.angle;
        if (predicted) {
            baseAngle = predicted.angle;
        } else if (target.angle !== undefined) {
            baseAngle = target.angle;
        }
        
        const spread = Math.PI / 12; // 15 degree total spread
        
        // Fire all shots in the burst (frame-based, not setTimeout)
        this.burstFireActive = true;
        this.burstFireTimer = 0;
        this.burstFireCount = count;
        this.burstFireBaseAngle = baseAngle;
        this.burstFireSpread = spread;
        
        // Fire first shot immediately
        const firstAngle = baseAngle;
        this.fireAtAngle(firstAngle);
        
        // Remaining shots will be fired in updateBurstFire() method
        this.fireCooldown = this.fireRate;
    }
    
    // ENHANCEMENT 3: Update burst fire (called from makeDecision method)
    updateBurstFire() {
        if (!this.burstFireActive) return;
        
        this.burstFireTimer++;
        
        // Fire next shot every 2 frames
        if (this.burstFireTimer % 2 === 0 && this.burstFireTimer / 2 < this.burstFireCount) {
            const shotIndex = Math.floor(this.burstFireTimer / 2);
            if (shotIndex > 0 && shotIndex < this.burstFireCount) {
                const angle = this.burstFireBaseAngle + 
                    (shotIndex - this.burstFireCount/2) * (this.burstFireSpread / (this.burstFireCount - 1));
                this.fireAtAngle(angle);
            }
        }
        
        // End burst after all shots
        if (this.burstFireTimer >= this.burstFireCount * 2) {
            this.burstFireActive = false;
            this.burstFireTimer = 0;
        }
    }
    
    // ENHANCEMENT 3: Predictive spread fire (fire at predicted position with spread)
    firePredictiveSpread(target, spreadCount = 3) {
        if (!target) return;
        
        const predicted = this.predictTargetPosition(target);
        let baseAngle = this.angle;
        if (predicted) {
            baseAngle = predicted.angle;
        } else if (target.angle !== undefined) {
            baseAngle = target.angle;
        }
        
        const spread = Math.PI / 8; // 22.5 degree total spread
        
        for (let i = 0; i < spreadCount; i++) {
            const angle = baseAngle + (i - spreadCount/2) * (spread / (spreadCount - 1));
            this.fireAtAngle(angle);
        }
        
        this.fireCooldown = this.fireRate;
    }

    fire(aiShips) {
        if (this.fireCooldown > 0) return;
        const target = this.findTarget(aiShips);
        if (!target) return;
        
        // Boss enemies use complex attack patterns
        if (this.type === 'boss') {
            this.fireBossPattern(target, aiShips);
            return;
        }
        
        // ENHANCEMENT 3: Advanced enemies use burst fire
        if (this.type === 'advanced') {
            // 30% chance for burst fire, 20% for spread, 50% for normal
            const rand = Math.random();
            if (rand < 0.3) {
                this.fireBurst(target, 3);
                return;
            } else if (rand < 0.5) {
                this.firePredictiveSpread(target, 3);
                return;
            }
        }
        
        // ENHANCEMENT 3: Basic enemies occasionally use burst (10% chance)
        if (this.type === 'basic' && Math.random() < 0.1) {
            this.fireBurst(target, 2);
            return;
        }
        
        // Normal firing (default)
        const predicted = this.predictTargetPosition(target);
        let fireAngle = this.angle;
        if (predicted) {
            fireAngle = predicted.angle;
        } else {
            fireAngle = target.angle;
        }
        this.fireAtAngle(fireAngle);
        this.fireCooldown = this.fireRate;
    }
    
    // Boss-specific firing patterns
    fireBossPattern(target, aiShips) {
        const predicted = this.predictTargetPosition(target);
        let baseAngle = this.angle;
        if (predicted) {
            baseAngle = predicted.angle;
        } else if (target) {
            baseAngle = target.angle;
        }
        
        switch (this.attackPattern) {
            case 'spread':
                // Spread shot: 5 bullets in a cone
                const spreadAngle = Math.PI / 6; // 30 degrees total spread
                for (let i = 0; i < 5; i++) {
                    const angle = baseAngle - spreadAngle / 2 + (spreadAngle / 4) * i;
                    const bulletX = this.x + Math.cos(angle) * this.size;
                    const bulletY = this.y + Math.sin(angle) * this.size;
                    enemyBullets.push(new EnemyBullet(bulletX, bulletY, angle));
                }
                this.fireCooldown = this.fireRate * 1.5; // Slightly longer cooldown for spread
                playFireSound(true);
                break;
                
            case 'rapid':
                // Rapid fire: 3 bullets in quick succession
                if (this.rapidFireBurstCount < 3) {
                    const bulletX = this.x + Math.cos(baseAngle) * this.size;
                    const bulletY = this.y + Math.sin(baseAngle) * this.size;
                    enemyBullets.push(new EnemyBullet(bulletX, bulletY, baseAngle));
                    this.rapidFireBurstCount++;
                    this.fireCooldown = 5; // Very short cooldown for rapid fire
                    playFireSound(true);
                } else {
                    this.rapidFireBurstCount = 0;
                    this.fireCooldown = this.fireRate * 2; // Longer cooldown after burst
                    this.attackPatternTimer = 0; // Reset pattern timer
                }
                break;
                
            case 'circular':
                // Circular pattern: 8 bullets in all directions
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI * 2) / 8;
                    const bulletX = this.x + Math.cos(angle) * this.size;
                    const bulletY = this.y + Math.sin(angle) * this.size;
                    enemyBullets.push(new EnemyBullet(bulletX, bulletY, angle));
                }
                this.fireCooldown = this.fireRate * 2; // Longer cooldown for circular
                playFireSound(true);
                break;
                
            case 'normal':
            default:
                // Normal single shot
                const bulletX = this.x + Math.cos(baseAngle) * this.size;
                const bulletY = this.y + Math.sin(baseAngle) * this.size;
                enemyBullets.push(new EnemyBullet(bulletX, bulletY, baseAngle));
                this.fireCooldown = this.fireRate;
                playFireSound(true);
                break;
        }
    }
    
    // Update boss phase based on health
    updateBossPhase() {
        if (this.type !== 'boss') return;
        
        const healthPercent = this.health / this.maxHealth;
        const oldPhase = this.bossPhase;
        
        if (healthPercent > 0.6) {
            this.bossPhase = 1;
        } else if (healthPercent > 0.3) {
            this.bossPhase = 2;
        } else {
            this.bossPhase = 3;
        }
        
        // Phase transition effects
        if (oldPhase !== this.bossPhase) {
            this.phaseTransitionTimer = 60; // 1 second transition effect
            this.shieldActive = true;
            this.shieldDuration = 30; // Brief invincibility on phase change
        }
    }
    
    // Update boss attack pattern based on phase
    updateBossAttackPattern() {
        if (this.type !== 'boss') return;
        
        this.attackPatternTimer++;
        
        // Change pattern periodically based on phase
        if (this.attackPatternTimer > 120) { // Change every 2 seconds
            this.attackPatternTimer = 0;
            
            switch (this.bossPhase) {
                case 1:
                    // Phase 1: Normal and occasional spread
                    this.attackPattern = Math.random() < 0.3 ? 'spread' : 'normal';
                    break;
                case 2:
                    // Phase 2: Spread, rapid fire, and normal
                    const patterns2 = ['spread', 'rapid', 'normal'];
                    this.attackPattern = patterns2[Math.floor(Math.random() * patterns2.length)];
                    break;
                case 3:
                    // Phase 3: All patterns including circular
                    const patterns3 = ['spread', 'rapid', 'circular', 'normal'];
                    this.attackPattern = patterns3[Math.floor(Math.random() * patterns3.length)];
                    break;
            }
        }
    }
    
    // SHIELD SYSTEM: Update shield for basic and advanced enemy ships
    updateEnemyShield() {
        if (this.type === 'boss') {
            // Boss uses separate shield system
            this.updateBossShield();
            return;
        }
        
        // Only basic and advanced ships use this shield system
        if (this.type !== 'basic' && this.type !== 'advanced') return;
        
        // Update shield duration
        if (this.shieldDuration > 0) {
            this.shieldDuration--;
            this.shieldActive = true;
        } else {
            this.shieldActive = false;
        }
        
        // Update cooldown
        if (this.shieldCooldown > 0) {
            this.shieldCooldown--;
        }
        
        // Activate shield periodically (same logic as blue ships)
        // Basic enemies: 0.5% chance per frame when cooldown is ready
        // Advanced enemies: 1% chance per frame (more frequent)
        if (this.shieldCooldown <= 0 && !this.shieldActive) {
            const shieldChance = this.type === 'advanced' ? 0.01 : 0.005; // 1% for advanced, 0.5% for basic
            const shieldDuration = 60; // 1 second (same as blue ships)
            
            if (Math.random() < shieldChance) {
                this.shieldActive = true;
                this.shieldDuration = shieldDuration;
                this.shieldCooldown = this.shieldCooldownMax; // 5 seconds cooldown
            }
        }
    }
    
    // Boss shield system
    updateBossShield() {
        if (this.type !== 'boss') return;
        
        if (this.shieldDuration > 0) {
            this.shieldDuration--;
            this.shieldActive = true;
        } else {
            this.shieldActive = false;
        }
        
        // Activate shield periodically in phase 2 and 3
        if (this.shieldCooldown > 0) {
            this.shieldCooldown--;
        } else if (this.bossPhase >= 2 && !this.shieldActive && Math.random() < 0.01) {
            this.shieldActive = true;
            this.shieldDuration = 90; // 1.5 seconds of shield
            this.shieldCooldown = 300; // 5 second cooldown
        }
    }
    
    // Boss teleportation ability
    bossTeleport() {
        if (this.type !== 'boss' || this.teleportCooldown > 0) return false;
        
        // Teleport in phase 3 when health is very low
        if (this.bossPhase === 3 && this.health <= 1 && Math.random() < 0.02) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.teleportCooldown = 180; // 3 second cooldown
            return true;
        }
        return false;
    }
    
    // Boss erratic movement in phase 3
    applyErraticMovement() {
        if (this.type !== 'boss' || this.bossPhase !== 3) return;
        
        this.erraticMovementTimer++;
        if (this.erraticMovementTimer > 10) {
            this.erraticMovementTimer = 0;
            // Random direction changes
            if (Math.random() < 0.3) {
                this.targetAngle += (Math.random() - 0.5) * Math.PI;
            }
            // Sudden thrust bursts
            if (Math.random() < 0.2) {
                this.thrust(2.0); // Strong thrust
            }
        }
    }

    detectIncomingBullets() {
        let nearestBullet = null;
        let nearestDistance = Infinity;
        bullets.forEach(bullet => {
            const dx = bullet.x - this.x;
            const dy = bullet.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.evasionRadius && distance < nearestDistance) {
                const angleToBullet = Math.atan2(dy, dx);
                const bulletAngle = bullet.angle;
                const angleDiff = Math.abs(this.normalizeAngle(angleToBullet - bulletAngle));
                if (angleDiff < Math.PI / 3) {
                    nearestBullet = { bullet, distance, angle: angleToBullet };
                    nearestDistance = distance;
                }
            }
        });
        return nearestBullet;
    }

    evadeBullets() {
        const incoming = this.detectIncomingBullets();
        if (incoming && incoming.distance < this.evasionRadius) {
            const evasionAngle = incoming.angle + Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 2;
            this.targetAngle = evasionAngle;
            this.behaviorState = 'evade';
            return true;
        }
        return false;
    }

    findCover(asteroids, target) {
        if (!target || !target.ship) return null;
        let bestCover = null;
        let bestCoverValue = 0;
        asteroids.forEach(asteroid => {
            const dxToTarget = target.ship.x - this.x;
            const dyToTarget = target.ship.y - this.y;
            const dxToAsteroid = asteroid.x - this.x;
            const dyToAsteroid = asteroid.y - this.y;
            const dotProduct = dxToTarget * dxToAsteroid + dyToTarget * dyToAsteroid;
            const targetDist = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);
            const asteroidDist = Math.sqrt(dxToAsteroid * dxToAsteroid + dyToAsteroid * dyToAsteroid);
            if (dotProduct > 0 && asteroidDist < targetDist && asteroidDist < 150) {
                const coverValue = asteroid.size / asteroidDist;
                if (coverValue > bestCoverValue) {
                    bestCoverValue = coverValue;
                    bestCover = asteroid;
                }
            }
        });
        return bestCover;
    }

    useCover(asteroids, target) {
        if (this.type === 'basic') return false;
        const cover = this.findCover(asteroids, target);
        if (cover && target) {
            this.coverAsteroid = cover;
            const dxToTarget = target.ship.x - cover.x;
            const dyToTarget = target.ship.y - cover.y;
            const angleToTarget = Math.atan2(dyToTarget, dxToTarget);
            const coverDistance = cover.size + this.size + 10;
            this.targetAngle = angleToTarget + Math.PI;
            const targetX = cover.x - Math.cos(angleToTarget) * coverDistance;
            const targetY = cover.y - Math.sin(angleToTarget) * coverDistance;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
                this.behaviorState = 'cover';
                return true;
            }
        }
        return false;
    }

    calculateFlankAngle(target) {
        if (!target || !target.ship || this.type === 'basic') return null;
        const dx = target.ship.x - this.x;
        const dy = target.ship.y - this.y;
        const angleToTarget = Math.atan2(dy, dx);
        const flankOffset = (Math.random() > 0.5 ? 1 : -1) * Math.PI / 2;
        return angleToTarget + flankOffset;
    }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    rotate(direction) {
        this.angle += direction * this.rotationSpeed;
    }

    thrust(power = 1) {
        this.velocityX += Math.cos(this.angle) * this.thrustPower * power;
        this.velocityY += Math.sin(this.angle) * this.thrustPower * power;
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (speed > this.maxVelocity) {
            this.velocityX = (this.velocityX / speed) * this.maxVelocity;
            this.velocityY = (this.velocityY / speed) * this.maxVelocity;
        }
    }

    checkHealth() {
        const healthPercent = this.health / this.maxHealth;
        if (this.type === 'boss') {
            // Boss uses phase system instead
            this.updateBossPhase();
        } else {
            // Basic and advanced enemies use standard health-based behavior
            if (healthPercent < 0.3) {
                this.behaviorState = 'retreat';
            } else if (healthPercent < 0.6) {
                if (this.behaviorState === 'pursuit') {
                    this.behaviorState = 'evade';
                }
            }
        }
    }

    coordinateWithOthers(enemyShips) {
        if (this.type === 'basic') return;
        const nearbyEnemies = enemyShips.filter(enemy => {
            if (enemy === this) return false;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            return Math.sqrt(dx * dx + dy * dy) < 200;
        });
        if (nearbyEnemies.length > 0) {
            nearbyEnemies.forEach(enemy => {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 50) {
                    const avoidanceAngle = Math.atan2(dy, dx) + Math.PI;
                    this.targetAngle = avoidanceAngle;
                }
            });
        }
    }

    makeDecision(asteroids, enemyShips, aiShips) {
        if (this.fireCooldown > 0) this.fireCooldown--;
        if (this.type === 'boss' && this.teleportCooldown > 0) this.teleportCooldown--;
        
        // ENHANCEMENT 3: Update burst fire
        if (this.burstFireActive) {
            this.updateBurstFire();
        }
        
        // SHIELD SYSTEM: Update shield for basic and advanced enemy ships
        if (this.type === 'basic' || this.type === 'advanced') {
            this.updateEnemyShield();
        }
        
        this.checkHealth();
        
        // Boss-specific updates
        if (this.type === 'boss') {
            this.updateBossAttackPattern();
            this.updateBossShield();
            this.applyErraticMovement();
            if (this.bossTeleport()) {
                // Teleported, skip normal movement this frame
                return;
            }
        }
        
        // ENHANCEMENT 1: Find best target using smart prioritization
        const target = this.findTarget(aiShips);
        if (target) {
            this.targetScore = target.score || 0; // Store target score for reference
        }
        
        if (this.evadeBullets()) {
            // Continue evading
        } else if (target && this.useCover(asteroids, target)) {
            // Continue using cover
        } else {
            if (target) {
                if (this.behaviorState === 'retreat' && this.type !== 'boss') {
                    this.targetAngle = target.angle + Math.PI;
                } else {
                    if (target.distance < this.attackRange) {
                        this.behaviorState = 'attack';
                        const predicted = this.predictTargetPosition(target);
                        if (predicted) {
                            this.targetAngle = predicted.angle;
                        } else {
                            this.targetAngle = target.angle;
                        }
                    } else {
                        this.behaviorState = 'pursuit';
                        this.targetAngle = target.angle;
                    }
                    if (this.type === 'advanced' && Math.random() < 0.1) {
                        const flankAngle = this.calculateFlankAngle(target);
                        if (flankAngle !== null) {
                            this.targetAngle = flankAngle;
                        }
                    }
                }
            } else {
                if (Math.random() < 0.01) {
                    this.targetAngle = Math.random() * Math.PI * 2;
                }
            }
        }
        this.coordinateWithOthers(enemyShips);
        let angleDiff = this.normalizeAngle(this.targetAngle - this.angle);
        if (Math.abs(angleDiff) > 0.1) {
            this.rotate(angleDiff > 0 ? 1 : -1);
        }
        
        // Boss has different movement patterns
        if (this.type === 'boss') {
            // Boss movement based on phase
            if (this.bossPhase === 1) {
                // Phase 1: Normal pursuit
                if (Math.random() < 0.3) {
                    this.thrust();
                }
            } else if (this.bossPhase === 2) {
                // Phase 2: More aggressive
                if (Math.random() < 0.4) {
                    this.thrust(1.2);
                }
            } else {
                // Phase 3: Erratic movement (handled in applyErraticMovement)
                if (Math.random() < 0.5) {
                    this.thrust(1.5);
                }
            }
        } else {
            // Normal enemy movement
            if (this.behaviorState !== 'retreat' && Math.random() < 0.3) {
                this.thrust();
            } else if (this.behaviorState === 'retreat') {
                if (Math.random() < 0.5) {
                    this.thrust(1.5);
                }
            }
        }
        
        if (this.shouldFire(aiShips)) {
            this.fire(aiShips);
        }
    }

    update() {
        this.velocityX *= this.friction;
        this.velocityY *= this.friction;
        this.x += this.velocityX;
        this.y += this.velocityY;
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // SHIELD SYSTEM: Shield visual effect for basic and advanced enemy ships (same as blue ships)
        if ((this.type === 'basic' || this.type === 'advanced') && this.shieldActive) {
            ctx.strokeStyle = '#ff4444'; // Red shield for enemy ships (different from blue cyan)
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            const shieldRadius = this.shieldRadius || (this.size + 8);
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Pulsing effect (same as blue ships)
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius + Math.sin(Date.now() / 100) * 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        
        // Boss shield visual effect
        if (this.type === 'boss' && this.shieldActive) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            const shieldRadius = this.size + 10 + Math.sin(Date.now() / 50) * 5;
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        
        // Phase transition effect
        if (this.type === 'boss' && this.phaseTransitionTimer > 0) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            this.phaseTransitionTimer--;
        }
        
        ctx.rotate(this.angle);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (this.type === 'boss') {
            // Hexagonal shape with phase-based color intensity
            let intensity = 1.0;
            if (this.bossPhase === 2) intensity = 1.2;
            if (this.bossPhase === 3) intensity = 1.5;
            
            ctx.strokeStyle = `rgba(255, ${Math.floor(100 / intensity)}, ${Math.floor(100 / intensity)}, 1)`;
            
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = Math.cos(angle) * this.size;
                const y = Math.sin(angle) * this.size;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
        } else if (this.type === 'advanced') {
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size, 0);
            ctx.lineTo(0, this.size);
            ctx.lineTo(-this.size, 0);
            ctx.closePath();
        } else {
            ctx.moveTo(this.size, 0);
            ctx.lineTo(-this.size / 2, -this.size / 2);
            ctx.lineTo(-this.size / 2, this.size / 2);
            ctx.closePath();
        }
        ctx.stroke();
        if (this.type !== 'basic' && this.health < this.maxHealth) {
            ctx.restore();
            ctx.save();
            ctx.translate(this.x, this.y - this.size - 10);
            const barWidth = this.size * 2;
            const barHeight = 4;
            const healthPercent = this.health / this.maxHealth;
            
            // Background
            ctx.fillStyle = '#333333';
            ctx.fillRect(-this.size, -3, barWidth, barHeight);
            
            // Health bar color based on health and phase (for boss)
            if (this.type === 'boss') {
                // Boss health bar changes color by phase
                if (this.bossPhase === 1) ctx.fillStyle = '#00ff00'; // Green
                else if (this.bossPhase === 2) ctx.fillStyle = '#ffff00'; // Yellow
                else ctx.fillStyle = '#ff0000'; // Red
            } else {
                // Advanced enemy uses standard colors
                ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
            }
            
            ctx.fillRect(-this.size, -3, barWidth * healthPercent, barHeight);
            
            // Border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(-this.size, -3, barWidth, barHeight);
            
            // Boss phase indicator
            if (this.type === 'boss') {
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`Phase ${this.bossPhase}`, barWidth / 2 - this.size, -8);
            }
            
            ctx.restore();
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
        }
        if (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1) {
            ctx.strokeStyle = '#ff6600';
            ctx.beginPath();
            if (this.type === 'boss') {
                ctx.moveTo(-this.size * 0.7, -this.size * 0.3);
                ctx.lineTo(-this.size - 8, 0);
                ctx.lineTo(-this.size * 0.7, this.size * 0.3);
            } else {
                ctx.moveTo(-this.size / 2, -this.size / 4);
                ctx.lineTo(-this.size - 5, 0);
                ctx.lineTo(-this.size / 2, this.size / 4);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    getPosition() {
        return { x: this.x, y: this.y, radius: this.radius };
    }
}

// Game objects
const ship = new Ship();
let aiShips = [];
let bullets = [];
let enemyBullets = []; // Separate array for enemy bullets
let enemyShips = []; // Array for all enemy ships (basic, advanced, and boss)
let asteroids = [];
let numAIShips = 1; // Default number of AI ships
let numEnemyShips = 1; // Default number of enemy ships (basic/advanced)
let numBossShips = 1; // Default number of boss ships
let alphaAttackEnabled = false; // Toggle for alpha attack pattern
let formationType = 'arrowhead'; // Default formation type: 'arrowhead', 'line', 'circle', 'diamond', 'wedge'
let autoAssignRoles = true; // Auto-assign roles or use manual assignment
let adaptiveFormationEnabled = false; // Phase 3: Enable adaptive formation switching
let multiTargetMode = 'focus'; // Phase 3: 'focus', 'split', 'prioritize'
let escortMode = 'none'; // Phase 3: 'none', 'escort', 'guard', 'patrol', 'intercept', 'cover'
let tacticalAttackSequencesEnabled = true; // Advanced: Enable tactical attack sequences
let dynamicFormationTransitionsEnabled = true; // Advanced: Enable dynamic formation transitions
let advancedFlankingEnabled = true; // Advanced: Enable advanced flanking patterns


// Initialize game with 5 asteroids
function initGame() {
    asteroids = [];
    for (let i = 0; i < 5; i++) {
        asteroids.push(new Asteroid());
    }
    bullets = [];
    enemyBullets = [];
    enemyShips = [];
    enemySpawnTimer = 0;
    score = 0;
    updateScore();
    // Initialize AI ships at random locations
    updateAIShips();
    // Initialize enemy ships (basic/advanced)
    updateEnemyShips();
    // Initialize boss ships
    updateBossShips();
    // Don't reset playerShipActive here - preserve current state
    // playerShipActive state is managed by Streamlit toggle
}

// Spawn enemy ship
function spawnEnemyShip(type = 'basic') {
    enemyShips.push(new EnemyShip(null, null, type));
}

// Spawn enemy ships periodically
let enemySpawnTimer = 0;
const enemySpawnInterval = 600; // Spawn every 10 seconds at 60fps

// Update AI ships based on desired count
function updateAIShips() {
    // Remove excess ships if count decreased
    if (aiShips.length > numAIShips) {
        aiShips = aiShips.slice(0, numAIShips);
    }
    // Add new ships if count increased
    while (aiShips.length < numAIShips) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const newShip = new AIShip(x, y);
        newShip.formationType = formationType || 'arrowhead'; // Set formation type
        aiShips.push(newShip);
    }
    // Update existing ships' formation type
    aiShips.forEach(ship => {
        if (ship) {
            ship.formationType = formationType || 'arrowhead';
        }
    });
    // Update display
    updateAIShipCount();
}

// Function to set number of AI ships (called from Streamlit)
window.setNumAIShips = function(count) {
    numAIShips = Math.max(0, Math.min(10, count)); // Limit between 0 and 10
    updateAIShips();
};

// Update enemy ships based on desired count (basic and advanced only, not boss)
function updateEnemyShips() {
    // Count non-boss ships
    const nonBossShips = enemyShips.filter(ship => ship && ship.type !== 'boss');
    
    // Remove excess non-boss ships if count decreased
    if (nonBossShips.length > numEnemyShips) {
        let removed = 0;
        const toRemove = nonBossShips.length - numEnemyShips;
        for (let i = enemyShips.length - 1; i >= 0 && removed < toRemove; i--) {
            if (enemyShips[i] && enemyShips[i].type !== 'boss') {
                enemyShips.splice(i, 1);
                removed++;
            }
        }
    }
    
    // Add new non-boss ships if count increased
    while (enemyShips.filter(ship => ship && ship.type !== 'boss').length < numEnemyShips) {
        // Spawn random enemy type based on score (but not boss)
        let enemyType = 'basic';
        if (score > 1000) {
            enemyType = Math.random() < 0.5 ? 'advanced' : 'basic';
        }
        spawnEnemyShip(enemyType);
    }
    updateEnemyShipCount();
}

// Update boss ships based on desired count
function updateBossShips() {
    // Count boss ships
    const currentBossShips = enemyShips.filter(ship => ship && ship.type === 'boss');
    
    // Remove excess boss ships if count decreased
    if (currentBossShips.length > numBossShips) {
        let removed = 0;
        const toRemove = currentBossShips.length - numBossShips;
        for (let i = enemyShips.length - 1; i >= 0 && removed < toRemove; i--) {
            if (enemyShips[i] && enemyShips[i].type === 'boss') {
                enemyShips.splice(i, 1);
                removed++;
            }
        }
    }
    
    // Add new boss ships if count increased
    while (enemyShips.filter(ship => ship && ship.type === 'boss').length < numBossShips) {
        spawnEnemyShip('boss');
    }
    updateBossShipCount();
}

// Function to set number of enemy ships (called from Streamlit)
window.setNumEnemyShips = function(count) {
    numEnemyShips = Math.max(0, Math.min(10, count)); // Limit between 0 and 10
    updateEnemyShips();
};

// Function to set number of boss ships (called from Streamlit)
window.setNumBossShips = function(count) {
    numBossShips = Math.max(0, Math.min(10, count)); // Limit between 0 and 10
    updateBossShips();
};

// Phase 5.1 & 5.2: Function to set ML mode (called from Streamlit)
window.setMLMode = function(enabled, mode = 'parameters') {
    const mlEnabled = enabled === true || enabled === 'true';
    // mode can be: 'parameters', 'priorities', 'both', or 'full'
    
    let updatedCount = 0;
    aiShips.forEach(aiShip => {
        if (aiShip) {
            aiShip.mlEnabled = mlEnabled;
            
            // Phase 5.1: ML Parameter Tuning
            if (mode === 'parameters' || mode === 'both' || mode === 'full') {
                aiShip.useMLParameters = mlEnabled;
            } else {
                aiShip.useMLParameters = false;
            }
            
            // Phase 5.2: ML Priority Weights
            if (mode === 'priorities' || mode === 'both' || mode === 'full') {
                aiShip.useMLPriorities = mlEnabled;
            } else {
                aiShip.useMLPriorities = false;
            }
            
            // Phase 5.3: Full ML Decision Making
            if (mode === 'full') {
                aiShip.useMLDecisions = mlEnabled;
            } else {
                aiShip.useMLDecisions = false;
            }
            
            // Phase 5.2: ML Priority Weights
            if (mode === 'priorities' || mode === 'both' || mode === 'full') {
                aiShip.useMLPriorities = mlEnabled;
            } else {
                aiShip.useMLPriorities = false;
            }
            
            updatedCount++;
        }
    });
    
    const modeText = mode === 'parameters' ? 'Parameter Tuning' : 
                     mode === 'priorities' ? 'Priority Weights' : 
                     mode === 'both' ? 'Parameters & Priorities' : 
                     mode === 'full' ? 'Full ML' : 'Parameter Tuning';
    
    console.log(`[ML] ${modeText} mode: ${mlEnabled ? 'ENABLED' : 'DISABLED'} (${updatedCount} AI ships updated)`);
    if (mlEnabled) {
        if (mode === 'parameters' || mode === 'both' || mode === 'full') {
            console.log('[ML] Using ML-suggested parameters for detection radius, firing range, flock weight, etc.');
        }
        if (mode === 'priorities' || mode === 'both' || mode === 'full') {
            console.log('[ML] Using ML-suggested priority weights for decision making.');
        }
    }
};

// Phase 5.1: Function to export training data (for future ML training)
window.exportMLTrainingData = function() {
    let allTrainingData = [];
    aiShips.forEach(aiShip => {
        if (aiShip && aiShip.trainingDataBuffer && aiShip.trainingDataBuffer.length > 0) {
            allTrainingData = allTrainingData.concat(aiShip.trainingDataBuffer);
        }
    });
    
    if (allTrainingData.length === 0) {
        console.log('No training data collected yet. Enable data collection first.');
        return null;
    }
    
    const dataStr = JSON.stringify(allTrainingData, null, 2);
    console.log(`Exported ${allTrainingData.length} training samples`);
    return dataStr;
};

// Keyboard input handling
const keys = {};

// Ensure canvas gets focus for keyboard events
canvas.setAttribute('tabindex', '0');
canvas.style.outline = 'none';
canvas.focus();

// Click to focus
canvas.addEventListener('click', () => {
    canvas.focus();
});

// Handle both key and keyCode for better compatibility
function getKeyName(e) {
    // Handle arrow keys by keyCode for better compatibility
    if (e.keyCode) {
        switch(e.keyCode) {
            case 37: return 'arrowleft';
            case 38: return 'arrowup';
            case 39: return 'arrowright';
            case 40: return 'arrowdown';
            case 32: return ' ';
            case 72: return 'h';
            case 65: return 'a';
            case 68: return 'd';
            case 27: return 'escape';
        }
    }
    return e.key ? e.key.toLowerCase() : '';
}

window.addEventListener('keydown', (e) => {
    const keyName = getKeyName(e);
    if (keyName) {
        keys[keyName] = true;
        
        // Prevent default for game keys
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(keyName)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}, true);

window.addEventListener('keyup', (e) => {
    const keyName = getKeyName(e);
    if (keyName) {
        keys[keyName] = false;
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(keyName)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}, true);

// Also listen on document for better capture
document.addEventListener('keydown', (e) => {
    const keyName = getKeyName(e);
    if (keyName) {
        keys[keyName] = true;
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(keyName)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}, true);

document.addEventListener('keyup', (e) => {
    const keyName = getKeyName(e);
    if (keyName) {
        keys[keyName] = false;
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(keyName)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}, true);

// Handle input
function handleInput() {
    // Rotation (always allowed, even when anchored)
    if (keys['arrowleft']) {
        ship.rotate(-1);
    }
    if (keys['arrowright']) {
        ship.rotate(1);
    }

    // Movement (disabled when anchored)
    if (!anchorPlayerShip) {
        if (keys['arrowup']) {
            ship.thrust();
        }
        if (keys['arrowdown']) {
            ship.moveBackward();
        }
        if (keys['a'] || (keys['arrowleft'] && !keys['arrowright'])) {
            // Strafe left (when only left arrow, or 'a' key)
            if (!keys['arrowup'] && !keys['arrowdown']) {
                ship.moveLeft();
            }
        }
        if (keys['d'] || (keys['arrowright'] && !keys['arrowleft'])) {
            // Strafe right (when only right arrow, or 'd' key)
            if (!keys['arrowup'] && !keys['arrowdown']) {
                ship.moveRight();
            }
        }

        // Space bar for shooting and speed boost (movement disabled when anchored)
        if (keys[' ']) {
            ship.thrust(1.5); // Speed boost (reduced from 2 to prevent excessive speed)
        }
    }

    // Hyperspace (disabled when anchored)
    if (keys['h'] && !anchorPlayerShip) {
        ship.hyperspace();
        keys['h'] = false; // Prevent continuous hyperspace
    }

    // Shield force field (F key)
    ship.shieldActive = keys['f'] || false;

    // Fullscreen toggle (ESC key)
    if (keys['escape']) {
        toggleFullscreen();
        keys['escape'] = false; // Prevent continuous toggling
    }
}

// Shooting
let shootCooldown = 0;
function handleShooting() {
    if (keys[' '] && shootCooldown <= 0) {
        // Fire from center gun (primary) - straight ahead
        const centerX = ship.x + Math.cos(ship.angle) * ship.size;
        const centerY = ship.y + Math.sin(ship.angle) * ship.size;
        bullets.push(new Bullet(centerX, centerY, ship.angle));
        playFireSound(false); // Play player firing sound
        
        // Fire from left gun barrel (15 degrees to the left)
        const leftAngle = ship.angle - Math.PI / 12; // 15 degrees
        // Calculate left gun position relative to ship center
        const leftOffsetX = Math.cos(ship.angle) * (ship.size - 3) + Math.cos(ship.angle - Math.PI / 2) * (-ship.size / 4);
        const leftOffsetY = Math.sin(ship.angle) * (ship.size - 3) + Math.sin(ship.angle - Math.PI / 2) * (-ship.size / 4);
        bullets.push(new Bullet(ship.x + leftOffsetX, ship.y + leftOffsetY, leftAngle));
        
        // Fire from right gun barrel (15 degrees to the right)
        const rightAngle = ship.angle + Math.PI / 12; // 15 degrees
        // Calculate right gun position relative to ship center
        const rightOffsetX = Math.cos(ship.angle) * (ship.size - 3) + Math.cos(ship.angle + Math.PI / 2) * (ship.size / 4);
        const rightOffsetY = Math.sin(ship.angle) * (ship.size - 3) + Math.sin(ship.angle + Math.PI / 2) * (ship.size / 4);
        bullets.push(new Bullet(ship.x + rightOffsetX, ship.y + rightOffsetY, rightAngle));
        
        shootCooldown = 10; // Cooldown between shots
    }
    if (shootCooldown > 0) {
        shootCooldown--;
    }
}

// Collision detection
function checkCollision(obj1, obj2) {
    const pos1 = obj1.getPosition();
    const pos2 = obj2.getPosition();
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (pos1.radius + pos2.radius);
}

// Update game state
function update() {
    if (!gameRunning) return;

    // Only handle input and update player ship if active
    if (playerShipActive) {
        handleInput();
        handleShooting();
        ship.update();
    } else {
        // Ship inactive - apply friction to slow it down
        ship.velocityX *= ship.friction;
        ship.velocityY *= ship.friction;
        ship.update();
    }

    // Update AI ships
    // MARL Integration: Get actions from MARL system if enabled
    let marlActions = null;
    if (typeof updateMARL === 'function' && typeof marlEnabled !== 'undefined' && marlEnabled) {
        marlActions = updateMARL();
    }
    
    aiShips.forEach((aiShip, index) => {
        if (aiShip) {
            // MARL Integration: Use MARL action if available
            if (marlActions && marlActions[index] && typeof executeMARLAction === 'function') {
                executeMARLAction(aiShip, marlActions[index]);
            } else {
                // Fallback to rule-based decision making
                aiShip.makeDecision(asteroids, aiShips, ship, enemyShips, enemyBullets);
            }
            
            // Update phase and shield system (runs for both MARL and rule-based)
            // This ensures proper shield duration/cooldown management regardless of decision system
            aiShip.updateAIPhase();
            aiShip.updateAIShield();
            
            aiShip.update();
        }
    });
    
    // MARL Training: Store experience and train
    if (typeof storeMARLExperience === 'function' && typeof marlTrainingMode !== 'undefined' && marlTrainingMode) {
        storeMARLExperience(score, score); // Will track score changes
        if (typeof trainMARL === 'function') {
            trainMARL();
        }
    }
    
    // Update AI ship count display
    updateAIShipCount();
    updateEnemyShipCount();
    updateBossShipCount();

    // Update bullets
    bullets = bullets.filter(bullet => {
        bullet.update();
        return bullet.isAlive();
    });

    // Update enemy bullets
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.update();
        return bullet.isAlive();
    });

    // Update enemy ships
    enemyShips.forEach(enemyShip => {
        if (enemyShip) {
            enemyShip.makeDecision(asteroids, enemyShips, aiShips);
            enemyShip.update();
        }
    });

    // Update asteroids
    asteroids.forEach(asteroid => asteroid.update());

    // SHIELD SYSTEM: Apply shield force for enemy ships (basic and advanced)
    enemyShips.forEach(enemyShip => {
        if ((enemyShip.type === 'basic' || enemyShip.type === 'advanced') && enemyShip.shieldActive) {
            asteroids.forEach(asteroid => {
                const dx = asteroid.x - enemyShip.x;
                const dy = asteroid.y - enemyShip.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const shieldRadius = enemyShip.shieldRadius || 40;
                
                // If asteroid is within shield radius, apply repulsion (same as blue ships)
                if (distance < shieldRadius + asteroid.radius && distance > 0) {
                    const angle = Math.atan2(dy, dx);
                    const force = enemyShip.shieldForce || 0.5; // Same shield force as blue ships
                    asteroid.velocityX += Math.cos(angle) * force;
                    asteroid.velocityY += Math.sin(angle) * force;
                }
            });
        }
    });
    
    // Apply shield force with size-based physics
    if (ship.shieldActive) {
        asteroids.forEach(asteroid => {
            const dx = asteroid.x - ship.x;
            const dy = asteroid.y - ship.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If asteroid is within shield radius, apply size-based repulsion
            if (distance < ship.shieldRadius + asteroid.radius && distance > 0) {
                const angle = Math.atan2(dy, dx);
                const force = ship.shieldForce * (1 - distance / (ship.shieldRadius + asteroid.radius));
                
                // Compare asteroid size to ship size
                const asteroidSize = asteroid.size || asteroid.radius * 2;
                const shipSize = ship.size;
                
                if (asteroidSize > shipSize) {
                    // Large asteroid: bounce the ship away (opposite direction)
                    const shipBounceForce = force * (asteroidSize / shipSize) * 0.3; // Scale force by size ratio
                    ship.velocityX -= Math.cos(angle) * shipBounceForce;
                    ship.velocityY -= Math.sin(angle) * shipBounceForce;
                    
                    // Also push asteroid slightly (but ship gets pushed more)
                    asteroid.velocityX += Math.cos(angle) * force * 0.2;
                    asteroid.velocityY += Math.sin(angle) * force * 0.2;
                } else {
                    // Small/equal asteroid: bounce asteroid away (normal behavior)
                    asteroid.velocityX += Math.cos(angle) * force;
                    asteroid.velocityY += Math.sin(angle) * force;
                }
            }
        });
    }

    // Check bullets (player and AI) vs enemy ships
    bullets.forEach((bullet, bulletIndex) => {
        enemyShips.forEach((enemyShip, enemyIndex) => {
            if (enemyShip) {
                // SHIELD SYSTEM: Shield blocks bullets for basic and advanced enemy ships
                if ((enemyShip.type === 'basic' || enemyShip.type === 'advanced') && enemyShip.shieldActive) {
                    if (checkCollision(bullet, enemyShip)) {
                        // Shield blocks the bullet - remove bullet but don't damage ship
                        bullets.splice(bulletIndex, 1);
                        return; // Skip damage
                    }
                }
                
                // Boss shield blocks damage
                if (enemyShip.type === 'boss' && enemyShip.shieldActive) {
                    if (checkCollision(bullet, enemyShip)) {
                        // Shield blocks the bullet but doesn't destroy it
                        // Visual effect handled in draw
                        bullets.splice(bulletIndex, 1);
                        return;
                    }
                }

                if (checkCollision(bullet, enemyShip)) {
                    bullets.splice(bulletIndex, 1);
                    enemyShip.health--;
                if (enemyShip.health <= 0) {
                    enemyShips.splice(enemyIndex, 1);
                    if (enemyShip.type === 'basic') score += 100;
                    else if (enemyShip.type === 'advanced') score += 250;
                    else if (enemyShip.type === 'boss') score += 1000;
                    updateScore();
                    updateEnemyShipCount();
                    updateBossShipCount();
                }
                }
            }
        });
    });

    // Check enemy bullets vs player ship
    if (playerShipActive) {
        enemyBullets.forEach((bullet, bulletIndex) => {
            if (checkCollision(bullet, ship)) {
                enemyBullets.splice(bulletIndex, 1);
                gameRunning = false;
                alert('Game Over! Final Score: ' + score);
                initGame();
                gameRunning = true;
            }
        });
    }

    // Check enemy bullets vs AI ships
    enemyBullets.forEach((bullet, bulletIndex) => {
        let bulletHit = false;
        aiShips.forEach((aiShip, aiIndex) => {
            if (aiShip && !bulletHit && checkCollision(bullet, aiShip)) {
                bulletHit = true;
                // AI ship shield blocks damage
                if (aiShip.shieldActive) {
                    // Shield blocks the bullet - remove it but no damage
                    // Visual effect handled in draw
                    // Bullet will be removed below
                } else {
                    // Phase-Based Defense: Damage reduction in Phase 2/3
                    let damage = 1; // Base damage
                    if (aiShip.aiPhase === 2) {
                        damage = 0.75; // 25% damage reduction in Phase 2
                    } else if (aiShip.aiPhase === 3) {
                        damage = 0.5; // 50% damage reduction in Phase 3
                    }
                    
                    // Reduce AI ship health instead of instant destruction
                    aiShip.health = Math.max(0, aiShip.health - damage);
                    if (aiShip.health <= 0) {
                        // AI ship destroyed by enemy bullet
                        aiShips.splice(aiIndex, 1);
                        updateAIShipCount();
                    }
                }
            }
        });
        if (bulletHit) {
            enemyBullets.splice(bulletIndex, 1);
        }
    });

    // Check bullet-asteroid collisions
    bullets.forEach((bullet, bulletIndex) => {
        asteroids.forEach((asteroid, asteroidIndex) => {
            if (checkCollision(bullet, asteroid)) {
                // Remove bullet and asteroid
                bullets.splice(bulletIndex, 1);
                asteroids.splice(asteroidIndex, 1);
                score += 100;
                updateScore();

                // Spawn new asteroid if needed
                if (asteroids.length < 5) {
                    asteroids.push(new Asteroid());
                }
            }
        });
    });

    // Check player ship-asteroid collisions (only if shield is not active and ship is active)
    if (playerShipActive && !ship.shieldActive) {
        asteroids.forEach((asteroid, index) => {
            if (checkCollision(ship, asteroid)) {
                // Game over or reset
                gameRunning = false;
                alert('Game Over! Final Score: ' + score);
                initGame();
                gameRunning = true;
            }
        });
    }

    // Check enemy ships vs asteroids
    enemyShips.forEach((enemyShip, enemyIndex) => {
        if (enemyShip) {
            asteroids.forEach((asteroid, asteroidIndex) => {
                if (checkCollision(enemyShip, asteroid)) {
                    // SHIELD SYSTEM: Shield blocks asteroid collision for basic and advanced enemy ships
                    if ((enemyShip.type === 'basic' || enemyShip.type === 'advanced') && enemyShip.shieldActive) {
                        // Shield blocks the collision - bounce asteroid away (same as blue ships)
                        const dx = asteroid.x - enemyShip.x;
                        const dy = asteroid.y - enemyShip.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance > 0) {
                            const angle = Math.atan2(dy, dx);
                            const force = enemyShip.shieldForce || 0.5; // Same shield force as blue ships
                            asteroid.velocityX += Math.cos(angle) * force;
                            asteroid.velocityY += Math.sin(angle) * force;
                        }
                        return; // Skip damage, asteroid bounces off
                    }
                    
                    // Boss shield already handled separately
                    if (enemyShip.type === 'boss' && enemyShip.shieldActive) {
                        return; // Shield blocks damage
                    }
                    
                    // No shield or shield inactive - enemy ship destroyed
                    enemyShips.splice(enemyIndex, 1);
                }
            });
        }
    });

    // Check AI ship-asteroid collisions
    aiShips = aiShips.filter(aiShip => {
        if (!aiShip) return false;
        for (let i = 0; i < asteroids.length; i++) {
            if (checkCollision(aiShip, asteroids[i])) {
                // AI ship shield blocks asteroid collision
                if (aiShip.shieldActive) {
                    // Shield blocks the collision - bounce asteroid away
                    const dx = asteroids[i].x - aiShip.x;
                    const dy = asteroids[i].y - aiShip.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 0) {
                        const angle = Math.atan2(dy, dx);
                        const force = 0.3;
                        asteroids[i].velocityX += Math.cos(angle) * force;
                        asteroids[i].velocityY += Math.sin(angle) * force;
                    }
                    continue; // Skip damage, asteroid bounces off
                }
                
                // Phase-Based Defense: Damage reduction in Phase 2/3
                let damage = 1; // Base damage
                if (aiShip.aiPhase === 2) {
                    damage = 0.75; // 25% damage reduction in Phase 2
                } else if (aiShip.aiPhase === 3) {
                    damage = 0.5; // 50% damage reduction in Phase 3
                }
                
                // Reduce AI ship health on asteroid collision
                aiShip.health = Math.max(0, aiShip.health - damage);
                if (aiShip.health <= 0) {
                    // AI ship destroyed - remove it permanently
                    return false;
                }
            }
        }
        return true; // Keep ship if no collision
    });
    
    // HEALING SYSTEM: Check AI ship-AI ship collisions for healing
    aiShips.forEach((phase3Ship, phase3Index) => {
        if (!phase3Ship || phase3Ship.aiPhase !== 3) return; // Only Phase 3 ships can be healed
        
        // Check if healing cooldown is active
        if (phase3Ship.healingCooldown > 0) return;
        
        aiShips.forEach((phase1Ship, phase1Index) => {
            if (!phase1Ship || phase1Ship.aiPhase !== 1) return; // Only Phase 1 ships can heal
            if (phase3Index === phase1Index) return; // Don't check self
            
            // Check if ships are in contact (within healing range)
            const dx = phase1Ship.x - phase3Ship.x;
            const dy = phase1Ship.y - phase3Ship.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < phase3Ship.healingRange) {
                // Healing contact! Phase 3 ship gains health
                const oldHealth = phase3Ship.health;
                phase3Ship.health = Math.min(phase3Ship.maxHealth, phase3Ship.health + 1);
                
                // Set healing cooldown to prevent spam
                phase3Ship.healingCooldown = phase3Ship.healingCooldownMax;
                
                // Visual feedback: Create healing particles/effect
                // (We'll add visual feedback in the draw function)
                phase3Ship.healingEffect = true;
                phase3Ship.healingEffectTimer = 30; // 0.5 seconds at 60fps
                
                // Log healing (optional, for debugging)
                if (oldHealth < phase3Ship.health) {
                    console.log(`[Healing] Phase 3 ship healed from ${oldHealth.toFixed(1)} to ${phase3Ship.health.toFixed(1)} HP`);
                }
            }
        });
    });
    
    // Update AI ship count after collision check
    updateAIShipCount();
}

// Render game
function draw() {
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars background
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
        const x = (i * 37) % canvas.width;
        const y = (i * 53) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }

    // Draw game objects
    asteroids.forEach(asteroid => asteroid.draw());
    bullets.forEach(bullet => bullet.draw());
    enemyBullets.forEach(bullet => bullet.draw());
    // Draw enemy ships
    enemyShips.forEach(enemyShip => {
        if (enemyShip) {
            enemyShip.draw();
        }
    });
    // Draw player ship (with visual indication if inactive)
    if (playerShipActive) {
        ship.draw();
    } else {
        // Draw inactive ship with reduced opacity
        ctx.save();
        ctx.globalAlpha = 0.3;
        ship.draw();
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }
    // ALPHA ATTACK: Draw formation lines (before drawing ships)
    if (alphaAttackEnabled) {
        aiShips.forEach(aiShip => {
            if (aiShip && aiShip.alphaShip && aiShip.alphaShip.isAlpha) {
                const alpha = aiShip.alphaShip;
                ctx.strokeStyle = '#ffd700'; // Gold color for formation lines
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.4;
                ctx.setLineDash([5, 5]); // Dashed lines
                ctx.beginPath();
                ctx.moveTo(alpha.x, alpha.y);
                ctx.lineTo(aiShip.x, aiShip.y);
                ctx.stroke();
                ctx.setLineDash([]); // Reset line dash
                ctx.globalAlpha = 1.0;
            }
        });
    }
    
    // Draw AI ships
    aiShips.forEach(aiShip => {
        if (aiShip) {
            aiShip.draw();
        }
    });
}

// Update score display
function updateScore() {
    scoreElement.textContent = score;
}

// Update AI ship count display
function updateAIShipCount() {
    if (aiShipCountElement) {
        const activeCount = aiShips.filter(ship => ship !== null).length;
        aiShipCountElement.textContent = activeCount;
    }
}

// Update enemy ship count display (basic and advanced only)
function updateEnemyShipCount() {
    if (enemyShipCountElement) {
        const activeCount = enemyShips.filter(ship => ship && ship.type !== 'boss').length;
        enemyShipCountElement.textContent = activeCount;
    }
}

// Update boss ship count display
function updateBossShipCount() {
    if (bossShipCountElement) {
        const activeCount = enemyShips.filter(ship => ship && ship.type === 'boss').length;
        bossShipCountElement.textContent = activeCount;
    }
}

// ALPHA ATTACK: Set alpha attack enabled state
window.setAlphaAttackEnabled = function(enabled) {
    alphaAttackEnabled = enabled;
    // Reset alpha assignments when toggled
    if (!enabled) {
        aiShips.forEach(ship => {
            if (ship) {
                ship.isAlpha = false;
                ship.alphaShip = null;
                ship.alphaAttackTarget = null;
                ship.role = null;
                ship.roleAssigned = false;
            }
        });
    }
};

// PHASE 1: Set formation type
window.setFormationType = function(type) {
    if (typeof type === 'string' && ['arrowhead', 'line', 'circle', 'diamond', 'wedge'].includes(type)) {
        formationType = type;
        // Update all ships' formation type
        if (typeof aiShips !== 'undefined' && Array.isArray(aiShips)) {
            aiShips.forEach(ship => {
                if (ship) {
                    ship.formationType = type;
                    ship.formationTypeChanged = true;
                }
            });
        }
    }
};

// PHASE 2: Set auto-assign roles
window.setAutoAssignRoles = function(enabled) {
    autoAssignRoles = enabled === true || enabled === 'true';
    // Reset role assignments
    if (typeof aiShips !== 'undefined' && Array.isArray(aiShips)) {
        aiShips.forEach(ship => {
            if (ship) {
                ship.role = null;
                ship.roleAssigned = false;
            }
        });
    }
};

// PHASE 3: Set adaptive formation
window.setAdaptiveFormation = function(enabled) {
    adaptiveFormationEnabled = enabled === true || enabled === 'true';
    if (typeof aiShips !== 'undefined' && Array.isArray(aiShips)) {
        aiShips.forEach(ship => {
            if (ship && ship.isAlpha) {
                ship.adaptiveFormationEnabled = adaptiveFormationEnabled;
            }
        });
    }
};

// PHASE 3: Set multi-target mode
window.setMultiTargetMode = function(mode) {
    if (typeof mode === 'string' && ['focus', 'split', 'prioritize'].includes(mode)) {
        multiTargetMode = mode;
        if (typeof aiShips !== 'undefined' && Array.isArray(aiShips)) {
            aiShips.forEach(ship => {
                if (ship) {
                    ship.multiTargetMode = mode;
                }
            });
        }
    }
};

// PHASE 3: Set escort mode
window.setEscortMode = function(mode) {
    if (typeof mode === 'string' && ['none', 'escort', 'guard', 'patrol', 'intercept', 'cover'].includes(mode)) {
        escortMode = mode;
        if (typeof aiShips !== 'undefined' && Array.isArray(aiShips)) {
            aiShips.forEach(ship => {
                if (ship) {
                    ship.escortMode = mode;
                    if (mode === 'patrol') {
                        // Patrol center will be set dynamically to alpha ship position
                        ship.patrolCenter = null; // Will be updated in executeEscortMode
                    }
                    if (mode === 'none') {
                        ship.escortTarget = null;
                        ship.interceptTarget = null;
                    }
                }
            });
        }
    }
};

// ADVANCED PATTERNS: Set tactical attack sequences
window.setTacticalSequences = function(enabled) {
    tacticalAttackSequencesEnabled = enabled === true || enabled === 'true';
};

// ADVANCED PATTERNS: Set dynamic formation transitions
window.setFormationTransitions = function(enabled) {
    dynamicFormationTransitionsEnabled = enabled === true || enabled === 'true';
};

// ADVANCED PATTERNS: Set advanced flanking patterns
window.setAdvancedFlanking = function(enabled) {
    advancedFlankingEnabled = enabled === true || enabled === 'true';
    if (typeof aiShips !== 'undefined' && Array.isArray(aiShips)) {
        aiShips.forEach(ship => {
            if (ship && !enabled) {
                // Reset flanking when disabled
                ship.flankPattern = 'none';
                ship.flankPosition = null;
            }
        });
    }
};

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
initGame();

// Set initial player ship state - default to active
playerShipActive = true;

// Ensure state is set before game loop starts
if (typeof setPlayerShipActive === 'function') {
    setPlayerShipActive(true);
}

gameLoop();

