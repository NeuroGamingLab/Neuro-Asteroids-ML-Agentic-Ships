// ============================================
// Designer Tuệ Hoàng, Eng. 
// ============================================

// MARL Integration with Game
// Connects MARL system to the Asteroids game

// Global MARL system instance
let marlSystem = null;
let marlEnabled = false;
let marlTrainingMode = false;

// Initialize MARL system
function initializeMARL(numAgents = 3, training = false) {
    if (marlSystem) {
        console.log('[MARL] System already initialized');
        return;
    }
    
    marlSystem = new MARLSystem({
        numAgents: numAgents,
        training: training
    });
    
    marlTrainingMode = training;
    marlEnabled = true;
    
    console.log(`[MARL] System initialized with ${numAgents} agents, training=${training}`);
    
    // Try to load existing model
    if (!training) {
        marlSystem.loadModel();
    }
}

// Enable/disable MARL
function setMARLMode(enabled, training = false) {
    marlEnabled = enabled;
    marlTrainingMode = training;
    
    if (marlSystem) {
        marlSystem.training = training;
    }
    
    console.log(`[MARL] Mode set: enabled=${enabled}, training=${training}`);
}

// Update MARL system with current game state
function updateMARL() {
    if (!marlEnabled || !marlSystem || aiShips.length === 0) {
        return;
    }
    
    // Update environment with current game state
    marlSystem.env.initialize(aiShips, asteroids, enemyShips, ship);
    
    // Get observations for all agents
    const observations = marlSystem.env.getAllObservations();
    
    if (marlTrainingMode) {
        // Training mode: collect experiences and train
        // This will be called during game loop
        
        // Get actions from policy
        const actions = marlSystem.getActionsForInference(observations);
        
        // Execute actions (will be done in makeDecision)
        return actions;
    } else {
        // Inference mode: use trained policy
        const actions = marlSystem.getActionsForInference(observations);
        return actions;
    }
}

// Execute MARL action on AI ship
function executeMARLAction(aiShip, action) {
    if (!action) return;
    
    // Rotation
    if (action.rotation === -1) {
        aiShip.rotate(-1);
    } else if (action.rotation === 1) {
        aiShip.rotate(1);
    }
    
    // Thrust
    if (action.thrust === 1) {
        aiShip.thrust();
    }
    
    // Fire
    if (action.fire === 1 && aiShip.shootCooldown <= 0) {
        aiShip.fire();
    }
    
    // Shield (if health is low)
    if (action.shield === 1 && aiShip.shieldCooldown <= 0 && aiShip.health < aiShip.maxHealth) {
        aiShip.shieldActive = true;
        aiShip.shieldDuration = 60;
        aiShip.shieldCooldown = 300;
    }
}

// Integrate MARL into AI ship decision making
function integrateMARLWithAIShip(aiShip, agentIndex) {
    if (!marlEnabled || !marlSystem) {
        return null; // Use rule-based decision
    }
    
    // Get observation for this agent
    const observation = marlSystem.env.getObservation(agentIndex);
    
    if (!observation) {
        return null; // Fallback to rule-based
    }
    
    // Get action from MARL policy
    const epsilon = marlTrainingMode ? Math.max(0.01, 0.1 * (1 - marlSystem.episodeCount / 1000)) : 0;
    const action = marlSystem.getAction(agentIndex, observation, epsilon);
    
    return action;
}

// Store experience after game step (for training)
function storeMARLExperience(previousScore, currentScore) {
    if (!marlEnabled || !marlTrainingMode || !marlSystem) {
        return;
    }
    
    // Get current observations
    const observations = marlSystem.env.getAllObservations();
    
    // Calculate rewards
    const rewards = marlSystem.env.calculateRewards(previousScore, currentScore);
    
    // Store experience (actions were stored when executed)
    // This is a simplified version - full implementation would track actions properly
}

// Train MARL system (called periodically during training)
function trainMARL() {
    if (!marlEnabled || !marlTrainingMode || !marlSystem) {
        return;
    }
    
    // Train on accumulated experiences
    if (marlSystem.replayBuffer.length >= marlSystem.batchSize) {
        marlSystem.trainStep();
    }
}

// Export functions for use in game
window.initializeMARL = initializeMARL;
window.setMARLMode = setMARLMode;
window.updateMARL = updateMARL;
window.executeMARLAction = executeMARLAction;
window.integrateMARLWithAIShip = integrateMARLWithAIShip;
window.storeMARLExperience = storeMARLExperience;
window.trainMARL = trainMARL;

// Auto-initialize when AI ships are created
let marlInitialized = false;
function autoInitializeMARL() {
    if (marlInitialized) return;
    
    // Wait for AI ships to be available
    if (typeof aiShips !== 'undefined' && aiShips.length > 0) {
        const numAgents = Math.min(aiShips.length, 5); // Max 5 agents for MARL
        initializeMARL(numAgents, false); // Start in inference mode
        marlInitialized = true;
    }
}

// Try to auto-initialize after a delay
setTimeout(autoInitializeMARL, 1000);

