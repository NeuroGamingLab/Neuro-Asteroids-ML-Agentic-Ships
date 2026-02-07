// ============================================
// Designer Tuệ Hoàng, Eng. 
// ============================================

// Multi-Agent Reinforcement Learning Environment Wrapper
// For cooperative AI ship behaviors

class MARLEnvironment {
    constructor(numAgents = 3) {
        this.numAgents = numAgents;
        this.agents = [];
        this.episodeStep = 0;
        this.maxEpisodeSteps = 1000;
        this.episodeRewards = [];
        
        // State normalization parameters
        this.stateBounds = {
            position: { min: -1000, max: 1000 },
            velocity: { min: -10, max: 10 },
            angle: { min: 0, max: Math.PI * 2 },
            distance: { min: 0, max: 2000 },
            health: { min: 0, max: 3 }
        };
    }
    
    // Initialize environment with agents
    initialize(aiShips, asteroids, enemyShips, playerShip) {
        this.aiShips = aiShips;
        this.asteroids = asteroids;
        this.enemyShips = enemyShips;
        this.playerShip = playerShip;
        this.episodeStep = 0;
        this.episodeRewards = new Array(this.numAgents).fill(0);
        
        // Store initial states for reward calculation
        this.previousStates = this.aiShips.map(ship => ({
            health: ship.health,
            position: { x: ship.x, y: ship.y }
        }));
    }
    
    // Get observation for a specific agent
    getObservation(agentIndex) {
        if (!this.aiShips || agentIndex >= this.aiShips.length) {
            return null;
        }
        
        const agent = this.aiShips[agentIndex];
        if (!agent) return null;
        
        // Normalize state values
        const normalize = (value, min, max) => {
            return (value - min) / (max - min);
        };
        
        // Agent's own state
        const state = {
            // Position (normalized to -1 to 1)
            x: normalize(agent.x, this.stateBounds.position.min, this.stateBounds.position.max) * 2 - 1,
            y: normalize(agent.y, this.stateBounds.position.min, this.stateBounds.position.max) * 2 - 1,
            angle: normalize(agent.angle, this.stateBounds.angle.min, this.stateBounds.angle.max),
            velocityX: normalize(agent.velocityX, this.stateBounds.velocity.min, this.stateBounds.velocity.max),
            velocityY: normalize(agent.velocityY, this.stateBounds.velocity.min, this.stateBounds.velocity.max),
            health: normalize(agent.health, this.stateBounds.health.min, this.stateBounds.health.max),
            phase: (agent.aiPhase - 1) / 2, // Normalize 1-3 to 0-1
            shieldActive: agent.shieldActive ? 1 : 0
        };
        
        // Find nearest asteroid
        const nearestAsteroid = this.findNearest(agent, this.asteroids);
        if (nearestAsteroid) {
            state.nearestAsteroidDistance = normalize(nearestAsteroid.distance, 0, 200);
            state.nearestAsteroidAngle = normalize(nearestAsteroid.angle, 0, Math.PI * 2);
            state.nearestAsteroidSize = normalize(nearestAsteroid.size || 20, 0, 50);
        } else {
            state.nearestAsteroidDistance = 1.0; // Far away
            state.nearestAsteroidAngle = 0;
            state.nearestAsteroidSize = 0;
        }
        
        // Find nearest enemy
        const nearestEnemy = this.findNearest(agent, this.enemyShips);
        if (nearestEnemy) {
            state.nearestEnemyDistance = normalize(nearestEnemy.distance, 0, 400);
            state.nearestEnemyAngle = normalize(nearestEnemy.angle, 0, Math.PI * 2);
            state.nearestEnemyHealth = normalize(nearestEnemy.health || 1, 0, 5);
        } else {
            state.nearestEnemyDistance = 1.0;
            state.nearestEnemyAngle = 0;
            state.nearestEnemyHealth = 0;
        }
        
        // Find nearest ally
        const nearestAlly = this.findNearestAlly(agent, this.aiShips, agentIndex);
        if (nearestAlly) {
            state.nearestAllyDistance = normalize(nearestAlly.distance, 0, 300);
            state.nearestAllyAngle = normalize(nearestAlly.angle, 0, Math.PI * 2);
            state.nearestAllyHealth = normalize(nearestAlly.health || 3, 0, 3);
        } else {
            state.nearestAllyDistance = 1.0;
            state.nearestAllyAngle = 0;
            state.nearestAllyHealth = 1.0;
        }
        
        // Global observations
        state.asteroidCount = Math.min(this.asteroids.length / 10, 1.0); // Normalize
        state.enemyCount = Math.min(this.enemyShips.length / 5, 1.0);
        state.allyCount = Math.min((this.aiShips.length - 1) / 5, 1.0);
        
        // Average ally health
        const totalAllyHealth = this.aiShips
            .filter((s, i) => i !== agentIndex && s)
            .reduce((sum, s) => sum + (s.health || 0), 0);
        const allyCount = Math.max(1, this.aiShips.length - 1);
        state.averageAllyHealth = normalize(totalAllyHealth / allyCount, 0, 3);
        
        // Convert to array for neural network input
        return [
            state.x, state.y, state.angle,
            state.velocityX, state.velocityY,
            state.health, state.phase, state.shieldActive,
            state.nearestAsteroidDistance, state.nearestAsteroidAngle, state.nearestAsteroidSize,
            state.nearestEnemyDistance, state.nearestEnemyAngle, state.nearestEnemyHealth,
            state.nearestAllyDistance, state.nearestAllyAngle, state.nearestAllyHealth,
            state.asteroidCount, state.enemyCount, state.allyCount, state.averageAllyHealth
        ];
    }
    
    // Get observations for all agents
    getAllObservations() {
        const observations = [];
        for (let i = 0; i < this.numAgents; i++) {
            observations.push(this.getObservation(i));
        }
        return observations;
    }
    
    // Find nearest entity to agent
    findNearest(agent, entities) {
        let nearest = null;
        let nearestDistance = Infinity;
        
        entities.forEach(entity => {
            if (!entity) return;
            const dx = entity.x - agent.x;
            const dy = entity.y - agent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                const angle = Math.atan2(dy, dx);
                nearest = { distance, angle, ...entity };
            }
        });
        
        return nearest;
    }
    
    // Find nearest ally (excluding self)
    findNearestAlly(agent, allies, agentIndex) {
        let nearest = null;
        let nearestDistance = Infinity;
        
        allies.forEach((ally, index) => {
            if (index === agentIndex || !ally) return;
            const dx = ally.x - agent.x;
            const dy = ally.y - agent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                const angle = Math.atan2(dy, dx);
                nearest = { distance, angle, health: ally.health };
            }
        });
        
        return nearest;
    }
    
    // Calculate rewards for all agents (cooperative)
    calculateRewards(previousScore, currentScore) {
        const rewards = [];
        
        for (let i = 0; i < this.numAgents; i++) {
            if (!this.aiShips[i]) {
                rewards.push(0);
                continue;
            }
            
            const agent = this.aiShips[i];
            const prevState = this.previousStates[i];
            let reward = 0;
            
            // Individual rewards
            // Survival reward
            reward += 0.1;
            
            // Health change
            if (agent.health < prevState.health) {
                reward -= 10; // Damage taken
            }
            
            // Death penalty
            if (agent.health <= 0) {
                reward -= 100;
            }
            
            // Cooperative rewards
            // Formation maintenance (if near allies)
            const nearbyAllies = this.countNearbyAllies(agent, i, 100);
            if (nearbyAllies > 0) {
                reward += 0.5 * Math.min(nearbyAllies, 2); // Up to 1.0
            }
            
            // Mutual protection (if protecting low-health ally)
            const lowHealthAlly = this.findLowHealthAlly(agent, i);
            if (lowHealthAlly && this.isProtecting(agent, lowHealthAlly)) {
                reward += 5;
            }
            
            // Flocking bonus
            reward += 0.2 * Math.min(nearbyAllies, 3); // Up to 0.6
            
            rewards.push(reward);
            this.episodeRewards[i] += reward;
        }
        
        // Score-based rewards (shared)
        const scoreDiff = currentScore - previousScore;
        if (scoreDiff > 0) {
            const sharedReward = scoreDiff * 2; // Shared among all agents
            rewards.forEach((r, i) => {
                rewards[i] = r + sharedReward / this.numAgents;
            });
        }
        
        // Update previous states
        this.previousStates = this.aiShips.map(ship => ({
            health: ship.health,
            position: { x: ship.x, y: ship.y }
        }));
        
        return rewards;
    }
    
    // Count nearby allies
    countNearbyAllies(agent, agentIndex, radius) {
        let count = 0;
        this.aiShips.forEach((ally, index) => {
            if (index === agentIndex || !ally) return;
            const dx = ally.x - agent.x;
            const dy = ally.y - agent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < radius) count++;
        });
        return count;
    }
    
    // Find low-health ally
    findLowHealthAlly(agent, agentIndex) {
        let lowHealthAlly = null;
        let minHealth = 3;
        
        this.aiShips.forEach((ally, index) => {
            if (index === agentIndex || !ally) return;
            if (ally.health < minHealth && ally.health > 0) {
                minHealth = ally.health;
                lowHealthAlly = ally;
            }
        });
        
        return lowHealthAlly;
    }
    
    // Check if agent is protecting an ally
    isProtecting(agent, ally) {
        const dx = ally.x - agent.x;
        const dy = ally.y - agent.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if agent is between ally and nearest threat
        const nearestEnemy = this.findNearest(ally, this.enemyShips);
        if (!nearestEnemy) return false;
        
        // Agent is protecting if close to ally and facing threat direction
        return distance < 80 && distance > 20;
    }
    
    // Check if episode is done
    isDone() {
        // Episode ends if:
        // 1. Max steps reached
        if (this.episodeStep >= this.maxEpisodeSteps) return true;
        
        // 2. All agents dead
        const aliveAgents = this.aiShips.filter(ship => ship && ship.health > 0).length;
        if (aliveAgents === 0) return true;
        
        return false;
    }
    
    // Step environment
    step(actions) {
        this.episodeStep++;
        
        // Execute actions (will be handled by game loop)
        // Actions format: [{rotation, thrust, fire, shield, communication}, ...]
        
        return {
            observations: this.getAllObservations(),
            rewards: this.calculateRewards(0, 0), // Score tracking will be added
            done: this.isDone(),
            info: {
                step: this.episodeStep,
                aliveAgents: this.aiShips.filter(s => s && s.health > 0).length
            }
        };
    }
    
    // Reset environment
    reset() {
        this.episodeStep = 0;
        this.episodeRewards = new Array(this.numAgents).fill(0);
        this.previousStates = [];
        
        return this.getAllObservations();
    }
    
    // Get episode statistics
    getEpisodeStats() {
        return {
            totalReward: this.episodeRewards.reduce((a, b) => a + b, 0),
            averageReward: this.episodeRewards.reduce((a, b) => a + b, 0) / this.numAgents,
            steps: this.episodeStep,
            aliveAgents: this.aiShips.filter(s => s && s.health > 0).length
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MARLEnvironment;
} else {
    window.MARLEnvironment = MARLEnvironment;
}

