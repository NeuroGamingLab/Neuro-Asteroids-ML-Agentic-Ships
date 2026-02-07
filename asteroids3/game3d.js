// ============================================
// Designer Tuệ Hoàng, Eng. 
// ============================================

// Phase 1: 3D Conversion Proof of Concept
// Three.js-based 3D Asteroids game

// ============================================
// 3D GAME DEBUG SYSTEM
// ============================================
window.debug3D = {
    enabled: true,
    logs: [],
    errors: [],
    warnings: [],
    status: 'initializing',
    startTime: Date.now()
};

function debugLog(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    window.debug3D.logs.push(logEntry);
    
    const prefix = type === 'error' ? '[ERROR]' : type === 'warning' ? '[WARNING]' : '[INFO]';
    console.log(`[3D DEBUG ${timestamp}] ${prefix} ${message}`);
    
    // Update status display if it exists
    updateDebugStatus();
}

function debugError(message, error = null) {
    window.debug3D.errors.push({ message, error, timestamp: Date.now() });
    debugLog(message, 'error');
    if (error) {
        console.error('Error details:', error);
        console.error('Error stack:', error.stack);
    }
}

function debugWarning(message) {
    window.debug3D.warnings.push({ message, timestamp: Date.now() });
    debugLog(message, 'warning');
}

function updateDebugStatus() {
    const statusEl = document.getElementById('debug3d-status');
    if (statusEl) {
        const elapsed = ((Date.now() - window.debug3D.startTime) / 1000).toFixed(2);
        const statusColor = window.debug3D.status.includes('failed') || window.debug3D.status.includes('error') ? '#ff0000' : 
                           window.debug3D.status === 'running' || window.debug3D.status === 'renderer_working' ? '#00ff00' : '#ffff00';
        
        // Phase 3: Include FPS and frame time if available
        let perfInfo = '';
        if (window.debug3D.fps && window.debug3D.frameTime) {
            perfInfo = ` | FPS: ${window.debug3D.fps} | Frame: ${window.debug3D.frameTime}ms`;
        }
        
        statusEl.innerHTML = `
            <strong style="color: ${statusColor}">3D Debug Status:</strong> ${window.debug3D.status}${perfInfo}<br>
            <small>Time: ${elapsed}s | Logs: ${window.debug3D.logs.length} | Errors: ${window.debug3D.errors.length} | Warnings: ${window.debug3D.warnings.length}</small>
        `;
    }
}

debugLog('=== game3d.js SCRIPT LOADED ===');
debugLog('Script location: ' + (window.location.href || 'unknown'));

// Check if Three.js is loaded
if (typeof THREE === 'undefined') {
    debugError('Three.js library not loaded! Please include Three.js before this script.');
    debugWarning('Waiting for Three.js to load...');
    window.debug3D.status = 'waiting_threejs';
    
    // Wait a bit and check again
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        checkCount++;
        if (typeof THREE !== 'undefined') {
            debugLog('Three.js loaded after ' + (checkCount * 100) + 'ms');
            window.debug3D.status = 'threejs_loaded';
            clearInterval(checkInterval);
        } else if (checkCount > 20) {
            debugError('Three.js still not loaded after 2 seconds');
            window.debug3D.status = 'threejs_failed';
            clearInterval(checkInterval);
        }
    }, 100);
} else {
    debugLog('Three.js version: ' + THREE.REVISION);
    window.debug3D.status = 'threejs_loaded';
}

// Initialize Three.js scene
let scene, camera, renderer;
let ship3d = null;
let animationId = null;

// Game state
let gameRunning3d = false;
let shipVelocity = { x: 0, y: 0, z: 0 };
let shipRotation = { x: 0, y: 0, z: 0 };
let shipAngle = 0; // Rotation angle in radians
let score3d = 0;
let shootCooldown3d = 0;
const bounds3d = 75; // Play area bounds (3x larger: was 25, now 75)

// Phase 2: Game objects arrays
let asteroids3d = [];
let bullets3d = [];
let aiShips3d = [];
let enemyShips3d = [];
let particles3d = [];

// Keyboard input (reuse from 2D game if available, or create new)
let keys = window.keys || {};
if (!window.keys) {
    window.keys = {};
    document.addEventListener('keydown', (e) => {
        const keyName = e.key.toLowerCase();
        window.keys[keyName] = true;
    });
    document.addEventListener('keyup', (e) => {
        const keyName = e.key.toLowerCase();
        window.keys[keyName] = false;
    });
}

// Initialize 3D game
function initGame3D() {
    debugLog('=== INITIALIZING 3D GAME ===');
    window.debug3D.status = 'initializing';
    updateDebugStatus();
    
    const initStartTime = Date.now();
    debugLog('Function called at: ' + new Date().toISOString());
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        debugError('Canvas element not found!');
        debugLog('Searching for canvas...');
        const allCanvases = document.querySelectorAll('canvas');
        debugLog('Found ' + allCanvases.length + ' canvas elements');
        allCanvases.forEach((c, i) => {
            debugLog(`Canvas ${i}: id="${c.id}", class="${c.className}"`);
        });
        window.debug3D.status = 'canvas_not_found';
        updateDebugStatus();
        return;
    }
    debugLog('Canvas found: ' + canvas.id);
    debugLog('Canvas dimensions: ' + canvas.width + 'x' + canvas.height);
    debugLog('Canvas visible: ' + (canvas.offsetWidth > 0 && canvas.offsetHeight > 0));

    // Scene setup
    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000); // Black background (classic Asteroids style)
        debugLog('Scene created successfully');
    } catch (e) {
        debugError('Failed to create scene', e);
        return;
    }

    // Camera setup - Perspective camera
    const width = canvas.width || 1200;
    const height = canvas.height || 600;
    camera = new THREE.PerspectiveCamera(
        75,                    // Field of view
        width / height,        // Aspect ratio
        0.1,                   // Near clipping plane
        1000                   // Far clipping plane
    );
    
    // Phase 3: Enhanced camera system
    // Position camera to view from above (similar to classic Asteroids)
    // Move camera further back to see larger 3x playing area
    camera.position.set(0, 0, 90); // 3x further back to see 3x larger area (was 30)
    
    // Phase 3: Camera settings for better view (adjusted for 3x larger area)
    camera.fov = 75; // Wider FOV to see larger 3x playing area (was 70)
    camera.updateProjectionMatrix();
    
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0); // Ensure up vector is correct
    
    // Phase 3: Store camera settings for dynamic adjustments (adjusted for 3x area)
    window.camera3d = {
        baseZ: 90, // 3x larger (was 30)
        minZ: 60,  // 3x larger (was 20)
        maxZ: 150, // 3x larger (was 50)
        followShip: false, // Can be enabled for following camera
        smoothFollow: 0.05 // Smoothness factor if enabled
    };
    
    debugLog('Camera positioned at: (' + camera.position.x + ', ' + camera.position.y + ', ' + camera.position.z + ')');
    debugLog('Camera looking at: (0, 0, 0)');
    debugLog('Camera FOV: ' + camera.fov);

    // Renderer setup - Phase 3: Performance optimizations
    debugLog('Creating WebGL renderer...');
    try {
        // Phase 3: Optimize renderer settings
        const pixelRatio = Math.min(window.devicePixelRatio, 2); // Cap pixel ratio for performance
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true,
            alpha: false,
            powerPreference: "high-performance", // Use high-performance GPU
            stencil: false, // Disable stencil buffer if not needed
            depth: true // Keep depth buffer for 3D
        });
        debugLog('Renderer created successfully');
        
        // Phase 3: Enable shadows
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
        debugLog('Shadow mapping enabled');
        
        // Phase 3: Performance optimizations
        renderer.setPixelRatio(pixelRatio);
        renderer.sortObjects = true; // Optimize rendering order
        
        // GPU Performance Optimizations
        renderer.info.autoReset = false; // Don't auto-reset stats
        renderer.setClearColor(0x000000, 1.0); // Black background
        
        // Enable frustum culling (only render objects in view)
        renderer.frustumCulled = true;
        
        debugLog('Renderer optimized with pixel ratio: ' + pixelRatio);
        
        // Check WebGL support
        const gl = renderer.getContext();
        if (gl) {
            debugLog('WebGL context obtained');
            debugLog('WebGL version: ' + gl.getParameter(gl.VERSION));
            
            // GPU Vendor and Renderer info
            const vendor = gl.getParameter(gl.VENDOR);
            const rendererInfo = gl.getParameter(gl.RENDERER);
            debugLog('GPU Vendor: ' + vendor);
            debugLog('GPU Renderer: ' + rendererInfo);
            
            // Phase 3: Performance hints
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE); // Cull back faces for performance
            
            // Additional GPU optimizations
            gl.hint(gl.GENERATE_MIPMAP_HINT, gl.NICEST); // Better texture quality
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            
            // Performance: Disable unnecessary features
            gl.disable(gl.DITHER); // Disable dithering for performance
            
            debugLog('WebGL optimizations enabled');
            debugLog('GPU Acceleration: Active');
        } else {
            debugError('Failed to get WebGL context!');
            window.debug3D.status = 'webgl_failed';
            updateDebugStatus();
            return;
        }
    } catch (e) {
        debugError('Failed to create renderer', e);
        window.debug3D.status = 'renderer_failed';
        updateDebugStatus();
        return;
    }
    
    renderer.setSize(width, height);
    debugLog('Renderer size set to: ' + width + 'x' + height);
    
    // Force canvas to be visible
    canvas.style.display = 'block';
    canvas.style.visibility = 'visible';
    canvas.style.opacity = '1';
    debugLog('Canvas style forced to visible');
    
    // Test render
    try {
        renderer.render(scene, camera);
        debugLog('Test render successful - renderer is working!');
        window.debug3D.status = 'renderer_working';
    } catch (e) {
        debugError('Test render failed', e);
        window.debug3D.status = 'render_failed';
    }
    updateDebugStatus();

    // Phase 3: Advanced lighting system
    // Ambient light (base illumination)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    debugLog('Ambient light added');

    // Phase 3: Main directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(15, 20, 15);
    directionalLight.castShadow = true; // Enable shadow casting
    
    // Phase 3: Shadow camera setup for better shadow quality (3x larger area)
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 300; // 3x larger (was 100)
    directionalLight.shadow.camera.left = -90; // 3x larger (was -30)
    directionalLight.shadow.camera.right = 90; // 3x larger (was 30)
    directionalLight.shadow.camera.top = 90; // 3x larger (was 30)
    directionalLight.shadow.camera.bottom = -90; // 3x larger (was -30)
    directionalLight.shadow.bias = -0.0001; // Reduce shadow acne
    scene.add(directionalLight);
    debugLog('Directional light with shadows added');
    
    // Phase 3: Additional point lights for dynamic lighting
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5, 50);
    pointLight1.position.set(0, 0, 20);
    pointLight1.castShadow = true;
    pointLight1.shadow.mapSize.width = 1024;
    pointLight1.shadow.mapSize.height = 1024;
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x4488ff, 0.3, 40); // Blue tint
    pointLight2.position.set(-20, 10, 10);
    scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0xff8844, 0.3, 40); // Orange tint
    pointLight3.position.set(20, -10, 10);
    scene.add(pointLight3);
    debugLog('Point lights added');
    
    // Phase 3: Hemisphere light for ambient sky/ground lighting
    const hemisphereLight = new THREE.HemisphereLight(0x4488ff, 0xff8844, 0.3);
    hemisphereLight.position.set(0, 20, 0);
    scene.add(hemisphereLight);
    debugLog('Hemisphere light added');

    // Create 3D ship (cone shape for triangular ship)
    createShip3D();

    // Phase 3: Optional grid helper (can be toggled for performance) - 3x larger
    if (window.showGrid3D !== false) { // Default to showing, but can be disabled
        const gridHelper = new THREE.GridHelper(300, 60, 0x00ff00, 0x003300); // 3x larger (was 100, 20)
        gridHelper.receiveShadow = true;
        scene.add(gridHelper);
        debugLog('Grid helper added (3x larger)');
    }

    // Phase 3: Optional axes helper (can be toggled) - 3x larger
    if (window.showAxes3D !== false) {
        const axesHelper = new THREE.AxesHelper(30); // 3x larger (was 10)
        scene.add(axesHelper);
        debugLog('Axes helper added (3x larger)');
    }
    
    // Phase 3: Add a ground plane for shadows (optional, can improve visual quality) - 3x larger
    if (window.showGround3D !== false) {
        const groundGeometry = new THREE.PlaneGeometry(600, 600); // 3x larger (was 200, 200)
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x001122,
            roughness: 0.8,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -45; // 3x lower (was -15)
        ground.receiveShadow = true;
        scene.add(ground);
        debugLog('Ground plane added for shadows (3x larger)');
    }
    
    // Phase 2: Initialize game objects
    initAsteroids3D();
    debugLog('Asteroids initialized');
    
    // Initialize AI ships (default 1)
    initAIShips3D(1);
    
    // Initialize enemy ships (default 1 basic)
    initEnemyShips3D(1, 'basic');
    
    // Setup canvas focus for keyboard input
    canvas.setAttribute('tabindex', '0');
    canvas.style.outline = 'none';
    canvas.focus();
    debugLog('Canvas focus set for keyboard input');
    
    // Click to focus
    canvas.addEventListener('click', () => {
        canvas.focus();
        debugLog('Canvas clicked - focus set');
    });
    
    // Ensure keyboard events work on canvas
    canvas.addEventListener('keydown', (e) => {
        const keyName = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(keyName)) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (window.keys) {
            window.keys[keyName] = true;
        }
    }, true);
    
    canvas.addEventListener('keyup', (e) => {
        const keyName = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(keyName)) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (window.keys) {
            window.keys[keyName] = false;
        }
    }, true);
    debugLog('Keyboard event listeners added to canvas');

    gameRunning3d = true;
    window.debug3D.status = 'running';
    
    const initTime = ((Date.now() - initStartTime) / 1000).toFixed(3);
    debugLog('=== 3D GAME INITIALIZATION COMPLETE ===');
    debugLog('Initialization took: ' + initTime + 's');
    debugLog('Scene children: ' + scene.children.length);
    debugLog('Ship exists: ' + !!ship3d);
    debugLog('Camera position: (' + camera.position.x + ', ' + camera.position.y + ', ' + camera.position.z + ')');
    debugLog('Renderer ready: ' + !!renderer);
    
    // List all scene objects
    debugLog('Scene objects:');
    scene.children.forEach((child, i) => {
        debugLog(`  [${i}] ${child.type} - ${child.constructor.name} - visible: ${child.visible}`);
    });
    
    updateDebugStatus();
    animate3D();
}

// Create 3D ship
function createShip3D() {
    debugLog('Creating 3D ship...');
    
    // Create cone geometry (triangular ship) - MAKE IT MUCH LARGER
    const shipGeometry = new THREE.ConeGeometry(
        2.5,  // Radius at base (increased from 0.8)
        4.0,  // Height (increased from 1.5)
        3     // Number of segments (3 = triangle)
    );

    // Create material (bright green color with glow)
    const shipMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        shininess: 100,
        specular: 0x00ff00,
        emissive: 0x00ff00,  // Add glow
        emissiveIntensity: 0.5
    });

    // Create mesh
    ship3d = new THREE.Mesh(shipGeometry, shipMaterial);
    
    // GPU Optimization: Enable frustum culling (only render when in view)
    ship3d.frustumCulled = true;
    
    // Phase 3: Enable shadows
    ship3d.castShadow = true;
    ship3d.receiveShadow = true;
    
    // Position ship at center
    ship3d.position.set(0, 0, 0);
    
    // Rotate to point right initially (0 rotation)
    ship3d.rotation.z = 0; // Start pointing right
    
    // Make sure ship is visible
    ship3d.visible = true;
    
    // Add to scene
    scene.add(ship3d);
    debugLog('Ship added to scene with Phase 3 shadow support');

    // Add bright wireframe for classic look
    const wireframe = new THREE.WireframeGeometry(shipGeometry);
    const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ 
        color: 0x00ff00,
        linewidth: 2
    }));
    ship3d.add(line);
    debugLog('Wireframe added to ship');
    
    // Add a bright point light at ship position
    const shipLight = new THREE.PointLight(0x00ff00, 1.5, 30);
    shipLight.position.set(0, 0, 0);
    ship3d.add(shipLight);
    debugLog('Point light added to ship');
    
    debugLog('Ship created at position: (' + ship3d.position.x + ', ' + ship3d.position.y + ', ' + ship3d.position.z + ')');
    debugLog('Ship visible: ' + ship3d.visible);
    debugLog('Ship in scene: ' + scene.children.includes(ship3d));
}

// Update ship position in 3D
function updateShip3D() {
    if (!ship3d || !gameRunning3d) return;

    // Apply velocity
    ship3d.position.x += shipVelocity.x;
    ship3d.position.y += shipVelocity.y;
    ship3d.position.z += shipVelocity.z;

    // Apply rotation
    ship3d.rotation.z = shipAngle;

    // Apply friction (momentum decay)
    shipVelocity.x *= 0.98;
    shipVelocity.y *= 0.98;
    shipVelocity.z *= 0.98;

    // Wrap around screen (3D space bounds)
    const bounds = 75; // Play area bounds (3x larger: was 25, now 75)
    if (ship3d.position.x > bounds) ship3d.position.x = -bounds;
    if (ship3d.position.x < -bounds) ship3d.position.x = bounds;
    if (ship3d.position.y > bounds) ship3d.position.y = -bounds;
    if (ship3d.position.y < -bounds) ship3d.position.y = bounds;
    // Z-axis wrapping (optional, for 2.5D we might keep Z fixed)
    if (ship3d.position.z > bounds) ship3d.position.z = -bounds;
    if (ship3d.position.z < -bounds) ship3d.position.z = bounds;
}

// Handle input for 3D ship
function handleInput3D() {
    if (!gameRunning3d) return;

    const currentKeys = window.keys || {};

    // Rotation (same as 2D)
    if (currentKeys['arrowleft']) {
        shipAngle -= 0.1;
    }
    if (currentKeys['arrowright']) {
        shipAngle += 0.1;
    }

    // Thrust (forward movement based on angle)
    if (currentKeys['arrowup']) {
        const thrustPower = 0.15;
        shipVelocity.x += Math.cos(shipAngle) * thrustPower;
        shipVelocity.y += Math.sin(shipAngle) * thrustPower;
        
        // Create thruster particles
        if (ship3d) {
            createThrusterParticles3D(
                ship3d.position.x,
                ship3d.position.y,
                ship3d.position.z,
                shipAngle,
                0xff6600 // Orange for player
            );
        }
    }

    // Backward movement
    if (currentKeys['arrowdown']) {
        const thrustPower = 0.15;
        shipVelocity.x -= Math.cos(shipAngle) * thrustPower;
        shipVelocity.y -= Math.sin(shipAngle) * thrustPower;
    }

    // For Phase 1, we're keeping movement in X-Y plane (2.5D approach)
    // Z-axis movement can be added later if needed
}

// Animation loop
let frameCount = 0;
function animate3D() {
    if (!gameRunning3d) {
        debugWarning('Animation loop stopped - gameRunning3d is false');
        return;
    }

    animationId = requestAnimationFrame(animate3D);
    frameCount++;

    // Handle input
    handleInput3D();
    
    // Phase 2: Handle shooting
    handleShooting3D();

    // Update ship
    updateShip3D();
    
    // Phase 2: Update all game objects
    updateGameObjects3D();

    // Render scene with GPU optimizations
    try {
        if (renderer && scene && camera) {
            // GPU Performance: Frustum culling is automatic with renderer.frustumCulled = true
            // Only objects in camera view will be rendered
            
            renderer.render(scene, camera);
            
            // Performance monitoring (every 60 frames = ~1 second at 60fps)
            if (frameCount % 60 === 0) {
                const info = renderer.info;
                debugLog(`Frame ${frameCount} - GPU Stats: Objects: ${info.render.calls}, Triangles: ${info.render.triangles}, Points: ${info.render.points}`);
                debugLog(`Game Objects: Asteroids: ${asteroids3d.length}, Bullets: ${bullets3d.length}, AI Ships: ${aiShips3d.length}, Enemy Ships: ${enemyShips3d.length}`);
                
                // Log first few frames for debugging
                if (frameCount <= 5) {
                    debugLog('Rendering frame ' + frameCount + ' - GPU Acceleration Active');
                }
            }
            
            // Reset renderer info every 60 frames to track performance
            if (frameCount % 60 === 0) {
                renderer.info.reset();
            }
        } else {
            if (frameCount === 1) {
                debugError('Cannot render - missing components', {
                    renderer: !!renderer,
                    scene: !!scene,
                    camera: !!camera
                });
            }
        }
    } catch (e) {
        debugError('Render error on frame ' + frameCount, e);
    }
}

// Stop 3D game
function stopGame3D() {
    gameRunning3d = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

// Resize handler for 3D
function resize3D() {
    if (!camera || !renderer) return;
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const width = canvas.width || 1200;
    const height = canvas.height || 600;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// ============================================
// Phase 2: 3D Game Objects
// ============================================

// Phase 3: Enhanced particle system
class Particle3D {
    constructor(x, y, z, vx, vy, vz, color, lifetime = 20) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.vx = vx;
        this.vy = vy;
        this.vz = vz;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.color = color;

        // Phase 3: Optimized particle geometry (shared geometry for performance)
        if (!Particle3D.sharedGeometry) {
            Particle3D.sharedGeometry = new THREE.SphereGeometry(0.1, 6, 6);
        }
        
        // Phase 3: Enhanced material with glow effect
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending, // Glow effect
            depthWrite: false // Performance optimization
        });

        this.mesh = new THREE.Mesh(Particle3D.sharedGeometry, material);
        this.mesh.position.set(x, y, z);
        
        // GPU Optimization: Enable frustum culling (only render when in view)
        this.mesh.frustumCulled = true;
        
        // Phase 3: Particles don't cast shadows (performance)
        this.mesh.castShadow = false;
        this.mesh.receiveShadow = false;
        
        scene.add(this.mesh);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;
        this.mesh.position.set(this.x, this.y, this.z);

        // Fade out
        this.lifetime--;
        const alpha = this.lifetime / this.maxLifetime;
        this.mesh.material.opacity = alpha;
        this.mesh.scale.setScalar(alpha);

        // Apply friction
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.vz *= 0.95;
    }

    isAlive() {
        return this.lifetime > 0;
    }

    destroy() {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

// Create thruster particles for ships
function createThrusterParticles3D(x, y, z, angle, color = 0xff6600) {
    const backX = x - Math.cos(angle) * 2;
    const backY = y - Math.sin(angle) * 2;
    const backZ = z;
    
    for (let i = 0; i < 2; i++) {
        const particleAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
        const speed = 0.1 + Math.random() * 0.1;
        particles3d.push(new Particle3D(
            backX + (Math.random() - 0.5) * 0.3,
            backY + (Math.random() - 0.5) * 0.3,
            backZ + (Math.random() - 0.5) * 0.3,
            Math.cos(particleAngle) * speed,
            Math.sin(particleAngle) * speed,
            (Math.random() - 0.5) * 0.05,
            color,
            15
        ));
    }
}

// Create explosion particles
function createExplosion3D(x, y, z, color = 0xffffff, count = 20) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.5;
        particles3d.push(new Particle3D(
            x, y, z,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            (Math.random() - 0.5) * 0.3,
            color,
            30
        ));
    }
}

// 3D Asteroid class
class Asteroid3D {
    constructor(x = null, y = null, z = 0) {
        // Random position if not provided
        if (x === null || y === null) {
            const side = Math.floor(Math.random() * 4);
            switch (side) {
                case 0: x = -bounds3d; y = (Math.random() - 0.5) * bounds3d * 2; break;
                case 1: x = bounds3d; y = (Math.random() - 0.5) * bounds3d * 2; break;
                case 2: x = (Math.random() - 0.5) * bounds3d * 2; y = -bounds3d; break;
                case 3: x = (Math.random() - 0.5) * bounds3d * 2; y = bounds3d; break;
            }
        }

        // Random velocity
        const speed = 0.3 + Math.random() * 0.4;
        const angle = Math.random() * Math.PI * 2;
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;
        this.velocityZ = (Math.random() - 0.5) * 0.1;

        // Size and properties
        this.size = 1 + Math.random() * 2;
        this.radius = this.size;
        this.rotationX = Math.random() * Math.PI * 2;
        this.rotationY = Math.random() * Math.PI * 2;
        this.rotationZ = Math.random() * Math.PI * 2;
        this.rotationSpeedX = (Math.random() - 0.5) * 0.02;
        this.rotationSpeedY = (Math.random() - 0.5) * 0.02;
        this.rotationSpeedZ = (Math.random() - 0.5) * 0.02;

        // Create 3D mesh
        this.createMesh(x, y, z);
    }

    createMesh(x, y, z) {
        // Create irregular sphere geometry
        const segments = 8 + Math.floor(Math.random() * 4);
        const geometry = new THREE.SphereGeometry(this.size, segments, segments);
        
        // Deform vertices for irregular shape
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            const distance = Math.sqrt(x*x + y*y + z*z);
            const scale = 1 + (Math.random() - 0.5) * 0.3;
            positions.setXYZ(i, x * scale, y * scale, z * scale);
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        // Material
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            shininess: 30,
            wireframe: false
        });

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.userData.asteroid = this;
        
        // GPU Optimization: Enable frustum culling (only render when in view)
        this.mesh.frustumCulled = true;
        scene.add(this.mesh);
    }

    update() {
        // Update position
        this.mesh.position.x += this.velocityX;
        this.mesh.position.y += this.velocityY;
        this.mesh.position.z += this.velocityZ;

        // Update rotation
        this.rotationX += this.rotationSpeedX;
        this.rotationY += this.rotationSpeedY;
        this.rotationZ += this.rotationSpeedZ;
        this.mesh.rotation.set(this.rotationX, this.rotationY, this.rotationZ);

        // Wrap around bounds
        if (this.mesh.position.x > bounds3d) this.mesh.position.x = -bounds3d;
        if (this.mesh.position.x < -bounds3d) this.mesh.position.x = bounds3d;
        if (this.mesh.position.y > bounds3d) this.mesh.position.y = -bounds3d;
        if (this.mesh.position.y < -bounds3d) this.mesh.position.y = bounds3d;
        if (this.mesh.position.z > bounds3d) this.mesh.position.z = -bounds3d;
        if (this.mesh.position.z < -bounds3d) this.mesh.position.z = bounds3d;
    }

    destroy() {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }

    getPosition() {
        return {
            x: this.mesh.position.x,
            y: this.mesh.position.y,
            z: this.mesh.position.z,
            radius: this.radius
        };
    }
}

// 3D Bullet class
class Bullet3D {
    constructor(x, y, z, angle, color = 0xffff00) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.angle = angle;
        this.speed = 1.5;
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
        this.velocityZ = 0;
        this.radius = 0.6; // Increased from 0.2 - MUCH LARGER
        this.lifetime = 120; // Frames before bullet disappears

        // Create 3D mesh (larger, brighter sphere)
        const geometry = new THREE.SphereGeometry(this.radius, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 1.5, // Increased from 0.8 - BRIGHTER
            transparent: true,
            opacity: 1.0
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        
        // GPU Optimization: Enable frustum culling (only render when in view)
        this.mesh.frustumCulled = true;
        
        scene.add(this.mesh);
        
        // Add a bright point light to each bullet for extra visibility
        const bulletLight = new THREE.PointLight(color, 2.0, 15);
        bulletLight.position.set(x, y, z);
        this.mesh.add(bulletLight);
        this.bulletLight = bulletLight;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.z += this.velocityZ;
        this.mesh.position.set(this.x, this.y, this.z);
        this.lifetime--;

        // Wrap around bounds
        if (this.x > bounds3d) this.x = -bounds3d;
        if (this.x < -bounds3d) this.x = bounds3d;
        if (this.y > bounds3d) this.y = -bounds3d;
        if (this.y < -bounds3d) this.y = bounds3d;
        if (this.z > bounds3d) this.z = -bounds3d;
        if (this.z < -bounds3d) this.z = bounds3d;
    }

    isAlive() {
        return this.lifetime > 0;
    }

    destroy() {
        // Remove light if it exists
        if (this.bulletLight) {
            this.mesh.remove(this.bulletLight);
            this.bulletLight = null;
        }
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }

    getPosition() {
        return {
            x: this.x,
            y: this.y,
            z: this.z,
            radius: this.radius
        };
    }
}

// Initialize asteroids
function initAsteroids3D() {
    asteroids3d = [];
    for (let i = 0; i < 5; i++) {
        asteroids3d.push(new Asteroid3D());
    }
    debugLog('Initialized ' + asteroids3d.length + ' asteroids');
}

// Handle shooting in 3D
function handleShooting3D() {
    if (!ship3d || !gameRunning3d) return;

    const currentKeys = window.keys || {};
    
    if (currentKeys[' '] && shootCooldown3d <= 0) {
        const shipPos = ship3d.position;
        const bulletAngle = shipAngle;
        
        // Create bullet (triple-barrel like 2D version)
        bullets3d.push(new Bullet3D(
            shipPos.x + Math.cos(bulletAngle) * 2,
            shipPos.y + Math.sin(bulletAngle) * 2,
            shipPos.z,
            bulletAngle,
            0xffff00 // Yellow for player
        ));
        
        // Left barrel
        bullets3d.push(new Bullet3D(
            shipPos.x + Math.cos(bulletAngle - 0.2) * 2,
            shipPos.y + Math.sin(bulletAngle - 0.2) * 2,
            shipPos.z,
            bulletAngle - 0.2,
            0xffff00
        ));
        
        // Right barrel
        bullets3d.push(new Bullet3D(
            shipPos.x + Math.cos(bulletAngle + 0.2) * 2,
            shipPos.y + Math.sin(bulletAngle + 0.2) * 2,
            shipPos.z,
            bulletAngle + 0.2,
            0xffff00
        ));
        
        shootCooldown3d = 10; // Cooldown
    }
    
    if (shootCooldown3d > 0) {
        shootCooldown3d--;
    }
}

// 3D Collision detection
function checkCollision3D(obj1, obj2) {
    const pos1 = obj1.getPosition();
    const pos2 = obj2.getPosition();
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance < (pos1.radius + pos2.radius);
}

// Update all game objects
function updateGameObjects3D() {
    // Update asteroids
    asteroids3d.forEach(asteroid => asteroid.update());
    
    // Update bullets
    bullets3d.forEach(bullet => bullet.update());
    
    // Update AI ships
    aiShips3d.forEach(aiShip => {
        if (aiShip) {
            aiShip.update();
            // Create thruster particles when moving
            if (aiShip.isThrusting) {
                createThrusterParticles3D(
                    aiShip.mesh.position.x,
                    aiShip.mesh.position.y,
                    aiShip.mesh.position.z,
                    aiShip.angle,
                    0x00aaff // Blue for AI ships
                );
            }
        }
    });
    
    // Update enemy ships
    enemyShips3d.forEach(enemyShip => {
        if (enemyShip) {
            enemyShip.update();
            // Create thruster particles when moving
            if (enemyShip.isThrusting) {
                const color = enemyShip.type === 'boss' ? 0xff0000 : 
                             enemyShip.type === 'advanced' ? 0xff00ff : 0xff6600;
                createThrusterParticles3D(
                    enemyShip.mesh.position.x,
                    enemyShip.mesh.position.y,
                    enemyShip.mesh.position.z,
                    enemyShip.angle,
                    color
                );
            }
        }
    });
    
    // Update particles
    particles3d.forEach(particle => particle.update());
    
    // Remove dead bullets
    bullets3d = bullets3d.filter(bullet => {
        if (!bullet.isAlive()) {
            bullet.destroy();
            return false;
        }
        return true;
    });
    
    // Remove dead particles
    particles3d = particles3d.filter(particle => {
        if (!particle.isAlive()) {
            particle.destroy();
            return false;
        }
        return true;
    });
    
    // Check bullet-asteroid collisions
    for (let i = bullets3d.length - 1; i >= 0; i--) {
        for (let j = asteroids3d.length - 1; j >= 0; j--) {
            if (checkCollision3D(bullets3d[i], asteroids3d[j])) {
                // Bullet hit asteroid
                const asteroid = asteroids3d[j];
                bullets3d[i].destroy();
                bullets3d.splice(i, 1);
                
                // Split asteroid if large enough
                if (asteroid.size > 1) {
                    // Create 2 smaller asteroids
                    for (let k = 0; k < 2; k++) {
                        const newSize = asteroid.size * 0.6;
                        if (newSize > 0.5) {
                            const newAsteroid = new Asteroid3D(
                                asteroid.mesh.position.x + (Math.random() - 0.5) * 2,
                                asteroid.mesh.position.y + (Math.random() - 0.5) * 2,
                                asteroid.mesh.position.z
                            );
                            newAsteroid.size = newSize;
                            newAsteroid.radius = newSize;
                            // Recreate mesh with new size
                            newAsteroid.destroy();
                            newAsteroid.createMesh(newAsteroid.mesh.position.x, newAsteroid.mesh.position.y, newAsteroid.mesh.position.z);
                            asteroids3d.push(newAsteroid);
                        }
                    }
                }
                
                // Remove hit asteroid
                asteroid.destroy();
                asteroids3d.splice(j, 1);
                
                // Increase score
                score3d += 10;
                const scoreElement = document.getElementById('score');
                if (scoreElement) scoreElement.textContent = score3d;
                
                break; // Bullet hit, no need to check other asteroids
            }
        }
    }
    
    // Check ship-asteroid collisions
    if (ship3d) {
        const shipPos = { getPosition: () => ({ x: ship3d.position.x, y: ship3d.position.y, z: ship3d.position.z, radius: 1.5 }) };
        asteroids3d.forEach((asteroid, index) => {
            if (checkCollision3D(shipPos, asteroid)) {
                // Create explosion
                createExplosion3D(
                    ship3d.position.x,
                    ship3d.position.y,
                    ship3d.position.z,
                    0x00ff00,
                    30
                );
                debugLog('Collision! Game Over');
                resetGame3D();
            }
        });
    }
    
    // Check AI ship collisions with asteroids
    aiShips3d.forEach((aiShip, aiIndex) => {
        if (aiShip && !aiShip.shieldActive) {
            asteroids3d.forEach((asteroid, astIndex) => {
                if (checkCollision3D(aiShip, asteroid)) {
                    aiShip.health--;
                    createExplosion3D(
                        aiShip.mesh.position.x,
                        aiShip.mesh.position.y,
                        aiShip.mesh.position.z,
                        0x00aaff,
                        15
                    );
                    if (aiShip.health <= 0) {
                        createExplosion3D(
                            aiShip.mesh.position.x,
                            aiShip.mesh.position.y,
                            aiShip.mesh.position.z,
                            0x00aaff,
                            30
                        );
                        aiShip.destroy();
                        aiShips3d.splice(aiIndex, 1);
                    } else {
                        aiShip.updateAIPhase();
                    }
                }
            });
        }
    });
}

// ============================================
// Phase 2: 3D AI Ship Class
// ============================================
class AIShip3D {
    constructor(x, y, z = 0) {
        this.x = x || (Math.random() - 0.5) * bounds3d * 1.5;
        this.y = y || (Math.random() - 0.5) * bounds3d * 1.5;
        this.z = z || (Math.random() - 0.5) * bounds3d * 0.5; // Start with random Z position
        this.angle = Math.random() * Math.PI * 2;
        // Phase 3: Give initial velocity for immediate movement
        this.velocityX = (Math.random() - 0.5) * 0.2;
        this.velocityY = (Math.random() - 0.5) * 0.2;
        this.velocityZ = (Math.random() - 0.5) * 0.15; // Initial Z velocity
        this.size = 1.5;
        this.radius = 1.5;
        this.health = 3;
        this.maxHealth = 3;
        this.aiPhase = 1;
        this.shieldActive = false;
        this.shieldCooldown = 0;
        this.shieldDuration = 0;
        this.isThrusting = false;
        
        // AI parameters
        this.detectionRadius = 10;
        this.firingRange = 15;
        this.shootCooldown = 0;
        
        // Create 3D mesh (blue cone) - LARGER FOR BETTER VISIBILITY
        const geometry = new THREE.ConeGeometry(1.5, 2.5, 3); // Increased size
        
        // Phase 3: Enhanced material - BRIGHTER FOR VISIBILITY
        const material = new THREE.MeshPhongMaterial({
            color: 0x00aaff,
            emissive: 0x0066ff, // Brighter emissive
            emissiveIntensity: 0.6, // Increased from 0.3 - MORE GLOW
            specular: 0x4488ff,
            shininess: 80
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(this.x, this.y, this.z);
        this.mesh.rotation.z = this.angle;
        
        // GPU Optimization: Enable frustum culling (only render when in view)
        this.mesh.frustumCulled = true;
        
        // Phase 3: Enable shadows
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Phase 3: Add point light to AI ship for better visibility
        const aiShipLight = new THREE.PointLight(0x00aaff, 1.0, 20);
        aiShipLight.position.set(0, 0, 0);
        this.mesh.add(aiShipLight);
        this.shipLight = aiShipLight;
        
        scene.add(this.mesh);
        
        // Create health bar
        this.createHealthBar();
    }
    
    createHealthBar() {
        const barWidth = 2;
        const barHeight = 0.2;
        const geometry = new THREE.PlaneGeometry(barWidth, barHeight);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.healthBar = new THREE.Mesh(geometry, material);
        // Phase 3: Health bar follows ship in 3D space (X, Y, Z)
        this.healthBar.position.set(this.x, this.y + this.size + 0.5, this.z);
        // Make health bar always face camera
        this.healthBar.lookAt(camera ? camera.position : new THREE.Vector3(0, 0, 30));
        scene.add(this.healthBar);
    }
    
    updateHealthBar() {
        if (!this.healthBar) return;
        const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
        this.healthBar.scale.x = healthPercent;
        
        // Color based on health
        if (healthPercent > 0.66) {
            this.healthBar.material.color.setHex(0x00ff00); // Green
        } else if (healthPercent > 0.33) {
            this.healthBar.material.color.setHex(0xffff00); // Yellow
        } else {
            this.healthBar.material.color.setHex(0xff0000); // Red
        }
        
        // Phase 3: Update health bar position in 3D space (X, Y, Z)
        this.healthBar.position.set(this.x, this.y + this.size + 0.5, this.z);
        // Make health bar always face camera for better visibility
        if (camera) {
            this.healthBar.lookAt(camera.position);
        }
    }
    
    update() {
        // Phase 3: Enhanced AI with 3D movement (X, Y, Z) - MORE AGGRESSIVE
        // Random rotation (more frequent)
        if (Math.random() < 0.05) {
            this.angle += (Math.random() - 0.5) * 0.3;
        }
        
        // X-Y plane movement (horizontal) - MORE FREQUENT AND FASTER
        if (Math.random() < 0.5) { // Increased from 0.3 to 0.5
            const thrustPower = 0.15; // Increased from 0.1
            this.velocityX += Math.cos(this.angle) * thrustPower;
            this.velocityY += Math.sin(this.angle) * thrustPower;
            this.isThrusting = true;
        } else {
            this.isThrusting = false;
        }
        
        // Phase 3: Z-axis movement (vertical) - MORE VISIBLE
        // AI ships can move up/down to navigate in 3D space
        if (Math.random() < 0.3) { // Increased from 0.15 to 0.3 - MORE FREQUENT
            const zThrustPower = 0.12; // Increased from 0.08 - FASTER
            // Random Z movement (up or down)
            if (Math.random() < 0.5) {
                this.velocityZ += zThrustPower; // Move up
            } else {
                this.velocityZ -= zThrustPower; // Move down
            }
        }
        
        // Phase 3: Keep Z movement within reasonable bounds
        // Prevent ships from going too far up or down
        if (this.z > bounds3d * 0.5) {
            this.velocityZ -= 0.08; // Increased from 0.05 - STRONGER CORRECTION
        } else if (this.z < -bounds3d * 0.5) {
            this.velocityZ += 0.08; // Increased from 0.05 - STRONGER CORRECTION
        }
        
        // Apply velocity
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.z += this.velocityZ;
        
        // Apply friction (less friction for more movement)
        this.velocityX *= 0.985; // Reduced from 0.98 - LESS FRICTION
        this.velocityY *= 0.985; // Reduced from 0.98 - LESS FRICTION
        this.velocityZ *= 0.985; // Reduced from 0.98 - LESS FRICTION
        
        // Update mesh
        this.mesh.position.set(this.x, this.y, this.z);
        this.mesh.rotation.z = this.angle;
        
        // Update shield
        this.updateAIShield();
        
        // Update health bar
        this.updateHealthBar();
        
        // Wrap around (X and Y only, Z has bounds)
        if (this.x > bounds3d) this.x = -bounds3d;
        if (this.x < -bounds3d) this.x = bounds3d;
        if (this.y > bounds3d) this.y = -bounds3d;
        if (this.y < -bounds3d) this.y = bounds3d;
        
        // Phase 3: Z-axis bounds (bounce back instead of wrapping)
        if (this.z > bounds3d * 0.6) {
            this.z = bounds3d * 0.6;
            this.velocityZ *= -0.6; // Increased from -0.5 - STRONGER BOUNCE
        }
        if (this.z < -bounds3d * 0.6) {
            this.z = -bounds3d * 0.6;
            this.velocityZ *= -0.6; // Increased from -0.5 - STRONGER BOUNCE
        }
    }
    
    updateAIShield() {
        if (this.shieldCooldown > 0) this.shieldCooldown--;
        if (this.shieldDuration > 0) {
            this.shieldDuration--;
            if (this.shieldDuration === 0) {
                this.shieldActive = false;
            }
        }
        
        // Auto-activate shield when health is low
        if (this.health < this.maxHealth && this.shieldCooldown === 0 && Math.random() < 0.01) {
            this.shieldActive = true;
            this.shieldDuration = 60;
            this.shieldCooldown = 300;
        }
    }
    
    updateAIPhase() {
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent > 0.66) {
            this.aiPhase = 1;
        } else if (healthPercent > 0.33) {
            this.aiPhase = 2;
        } else {
            this.aiPhase = 3;
        }
    }
    
    destroy() {
        if (this.healthBar) {
            scene.remove(this.healthBar);
            this.healthBar.geometry.dispose();
            this.healthBar.material.dispose();
        }
        // Phase 3: Remove ship light if it exists
        if (this.shipLight) {
            this.mesh.remove(this.shipLight);
            this.shipLight = null;
        }
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
    
    getPosition() {
        return {
            x: this.x,
            y: this.y,
            z: this.z,
            radius: this.radius
        };
    }
}

// ============================================
// Phase 2: 3D Enemy Ship Class
// ============================================
class EnemyShip3D {
    constructor(x = null, y = null, z = 0, type = 'basic') {
        // Random position if not provided
        if (x === null || y === null) {
            const side = Math.floor(Math.random() * 4);
            switch (side) {
                case 0: x = -bounds3d; y = (Math.random() - 0.5) * bounds3d * 2; break;
                case 1: x = bounds3d; y = (Math.random() - 0.5) * bounds3d * 2; break;
                case 2: x = (Math.random() - 0.5) * bounds3d * 2; y = -bounds3d; break;
                case 3: x = (Math.random() - 0.5) * bounds3d * 2; y = bounds3d; break;
            }
        }
        
        this.type = type;
        this.x = x;
        this.y = y;
        this.z = z;
        this.angle = Math.random() * Math.PI * 2;
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;
        this.health = this.getMaxHealth();
        this.maxHealth = this.health;
        this.fireCooldown = 0;
        this.isThrusting = false;
        this.shieldActive = false;
        
        // Create 3D mesh based on type
        let geometry, color;
        if (type === 'boss') {
            geometry = new THREE.DodecahedronGeometry(2.5);
            color = 0xff0000;
            this.size = 2.5;
            this.radius = 2.5;
        } else if (type === 'advanced') {
            geometry = new THREE.OctahedronGeometry(1.8);
            color = 0xff00ff;
            this.size = 1.8;
            this.radius = 1.8;
        } else {
            geometry = new THREE.ConeGeometry(1.2, 2.0, 3);
            color = 0xff6600;
            this.size = 1.2;
            this.radius = 1.2;
        }
        
        // Phase 3: Enhanced material with shadows
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.4,
            specular: 0xffffff,
            shininess: type === 'boss' ? 100 : 60
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.rotation.z = this.angle;
        
        // GPU Optimization: Enable frustum culling (only render when in view)
        this.mesh.frustumCulled = true;
        
        // Phase 3: Enable shadows
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        scene.add(this.mesh);
        
        // Create health bar
        this.createHealthBar();
    }
    
    getMaxHealth() {
        switch (this.type) {
            case 'basic': return 1;
            case 'advanced': return 2;
            case 'boss': return 5;
            default: return 1;
        }
    }
    
    createHealthBar() {
        const barWidth = 2;
        const barHeight = 0.2;
        const geometry = new THREE.PlaneGeometry(barWidth, barHeight);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.healthBar = new THREE.Mesh(geometry, material);
        // Phase 3: Health bar follows ship in 3D space (X, Y, Z)
        this.healthBar.position.set(this.x, this.y + this.size + 0.5, this.z);
        // Make health bar always face camera
        this.healthBar.lookAt(camera ? camera.position : new THREE.Vector3(0, 0, 30));
        scene.add(this.healthBar);
    }
    
    updateHealthBar() {
        if (!this.healthBar) return;
        const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
        this.healthBar.scale.x = healthPercent;
        
        // Phase 3: Update health bar position in 3D space (X, Y, Z)
        this.healthBar.position.set(this.x, this.y + this.size + 0.5, this.z);
        // Make health bar always face camera for better visibility
        if (camera) {
            this.healthBar.lookAt(camera.position);
        }
    }
    
    checkHealth() {
        // Boss-specific logic can be added here
    }
    
    update() {
        // Simple AI: move toward center
        const dx = 0 - this.x;
        const dy = 0 - this.y;
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - this.angle;
        
        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        if (Math.abs(angleDiff) > 0.1) {
            this.angle += angleDiff > 0 ? 0.1 : -0.1;
        }
        
        // Thrust toward center
        if (Math.random() < 0.3) {
            const thrustPower = 0.1;
            this.velocityX += Math.cos(this.angle) * thrustPower;
            this.velocityY += Math.sin(this.angle) * thrustPower;
            this.isThrusting = true;
        } else {
            this.isThrusting = false;
        }
        
        // Apply velocity
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.z += this.velocityZ;
        
        // Apply friction
        this.velocityX *= 0.98;
        this.velocityY *= 0.98;
        this.velocityZ *= 0.98;
        
        // Update mesh
        this.mesh.position.set(this.x, this.y, this.z);
        this.mesh.rotation.z = this.angle;
        
        // Update health bar
        this.updateHealthBar();
        
        // Wrap around
        if (this.x > bounds3d) this.x = -bounds3d;
        if (this.x < -bounds3d) this.x = bounds3d;
        if (this.y > bounds3d) this.y = -bounds3d;
        if (this.y < -bounds3d) this.y = bounds3d;
    }
    
    destroy() {
        if (this.healthBar) {
            scene.remove(this.healthBar);
            this.healthBar.geometry.dispose();
            this.healthBar.material.dispose();
        }
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
    
    getPosition() {
        return {
            x: this.x,
            y: this.y,
            z: this.z,
            radius: this.radius
        };
    }
}

// Initialize AI ships
function initAIShips3D(count) {
    // Remove existing AI ships
    aiShips3d.forEach(ship => ship.destroy());
    aiShips3d = [];
    
    // Create new AI ships
    for (let i = 0; i < count; i++) {
        aiShips3d.push(new AIShip3D());
    }
    debugLog('Initialized ' + aiShips3d.length + ' AI ships');
}

// Initialize enemy ships
function initEnemyShips3D(count, type = 'basic') {
    // Remove existing enemy ships of this type
    enemyShips3d = enemyShips3d.filter(ship => ship.type !== type);
    
    // Create new enemy ships
    for (let i = 0; i < count; i++) {
        enemyShips3d.push(new EnemyShip3D(null, null, 0, type));
    }
    debugLog('Initialized ' + count + ' ' + type + ' enemy ships');
}

// Reset game
function resetGame3D() {
    // Clear all objects
    asteroids3d.forEach(a => a.destroy());
    bullets3d.forEach(b => b.destroy());
    aiShips3d.forEach(s => s.destroy());
    enemyShips3d.forEach(s => s.destroy());
    particles3d.forEach(p => p.destroy());
    asteroids3d = [];
    bullets3d = [];
    aiShips3d = [];
    enemyShips3d = [];
    particles3d = [];
    
    // Reset ship
    if (ship3d) {
        ship3d.position.set(0, 0, 0);
        shipVelocity = { x: 0, y: 0, z: 0 };
        shipAngle = 0;
    }
    
    // Reset score
    score3d = 0;
    const scoreElement = document.getElementById('score');
    if (scoreElement) scoreElement.textContent = '0';
    
    // Reinitialize asteroids
    initAsteroids3D();
}

// Export functions for use in main game
window.initGame3D = initGame3D;
window.stopGame3D = stopGame3D;
window.resize3D = resize3D;

