// ============================================
// Designer Tuệ Hoàng, Eng. 
// ============================================

// Multi-Agent Reinforcement Learning System
// MADDPG (Multi-Agent Deep Deterministic Policy Gradient) Implementation
// Simplified version for browser-based training

class MARLSystem {
    constructor(config = {}) {
        this.numAgents = config.numAgents || 3;
        this.training = config.training !== false;
        this.modelPath = config.modelPath || null;
        
        // Environment
        this.env = new MARLEnvironment(this.numAgents);
        
        // Training parameters
        this.learningRate = config.learningRate || 0.001;
        this.gamma = config.gamma || 0.99; // Discount factor
        this.tau = config.tau || 0.01; // Soft update parameter
        this.batchSize = config.batchSize || 64;
        this.bufferSize = config.bufferSize || 10000;
        
        // Experience replay buffer
        this.replayBuffer = [];
        
        // Neural networks (simplified - using simple feedforward networks)
        // In production, would use TensorFlow.js for proper neural networks
        this.actors = []; // Policy networks
        this.critics = []; // Value networks
        this.targetActors = []; // Target policy networks
        this.targetCritics = []; // Target value networks
        
        // Initialize networks for each agent
        this.initializeNetworks();
        
        // Training statistics
        this.episodeCount = 0;
        this.totalRewards = [];
        this.trainingHistory = [];
        
        // Action space
        this.actionSpace = {
            rotation: [-1, 0, 1], // Left, none, right
            thrust: [0, 1],       // No thrust, thrust
            fire: [0, 1],         // Don't fire, fire
            shield: [0, 1]        // Don't activate, activate
        };
    }
    
    // Initialize neural networks (simplified version)
    // In production, use TensorFlow.js for proper implementation
    initializeNetworks() {
        for (let i = 0; i < this.numAgents; i++) {
            // Actor network (policy): state -> action probabilities
            this.actors[i] = this.createSimpleNetwork(21, [64, 32], 4); // 21 inputs, 4 outputs
            
            // Critic network (value): state + actions -> Q-value
            this.critics[i] = this.createSimpleNetwork(21 + 4, [64, 32], 1); // state + actions -> Q
            
            // Target networks (for stable training)
            this.targetActors[i] = this.createSimpleNetwork(21, [64, 32], 4);
            this.targetCritics[i] = this.createSimpleNetwork(21 + 4, [64, 32], 1);
            
            // Initialize target networks with same weights as main networks
            this.copyWeights(this.actors[i], this.targetActors[i]);
            this.copyWeights(this.critics[i], this.targetCritics[i]);
        }
    }
    
    // Create a simple feedforward network (placeholder)
    // In production, replace with TensorFlow.js models
    createSimpleNetwork(inputSize, hiddenSizes, outputSize) {
        const network = {
            layers: [],
            inputSize,
            outputSize
        };
        
        // Input layer
        let prevSize = inputSize;
        hiddenSizes.forEach(hiddenSize => {
            network.layers.push({
                weights: this.randomWeights(prevSize, hiddenSize),
                biases: new Array(hiddenSize).fill(0)
            });
            prevSize = hiddenSize;
        });
        
        // Output layer
        network.layers.push({
            weights: this.randomWeights(prevSize, outputSize),
            biases: new Array(outputSize).fill(0)
        });
        
        return network;
    }
    
    // Random weight initialization
    randomWeights(rows, cols) {
        const weights = [];
        const limit = Math.sqrt(6.0 / (rows + cols));
        for (let i = 0; i < rows; i++) {
            weights[i] = [];
            for (let j = 0; j < cols; j++) {
                weights[i][j] = (Math.random() * 2 - 1) * limit;
            }
        }
        return weights;
    }
    
    // Copy weights from source to target network
    copyWeights(source, target) {
        for (let i = 0; i < source.layers.length; i++) {
            target.layers[i] = {
                weights: source.layers[i].weights.map(row => [...row]),
                biases: [...source.layers[i].biases]
            };
        }
    }
    
    // Forward pass through network
    forward(network, input) {
        let output = input;
        
        for (let i = 0; i < network.layers.length; i++) {
            const layer = network.layers[i];
            const newOutput = [];
            
            for (let j = 0; j < layer.weights[0].length; j++) {
                let sum = layer.biases[j];
                for (let k = 0; k < output.length; k++) {
                    sum += output[k] * layer.weights[k][j];
                }
                // ReLU activation for hidden layers, sigmoid for output
                if (i < network.layers.length - 1) {
                    newOutput[j] = Math.max(0, sum); // ReLU
                } else {
                    newOutput[j] = 1 / (1 + Math.exp(-sum)); // Sigmoid
                }
            }
            
            output = newOutput;
        }
        
        return output;
    }
    
    // Get action from policy network (with exploration)
    getAction(agentIndex, observation, epsilon = 0.1) {
        if (!observation || observation.length === 0) {
            return this.getRandomAction();
        }
        
        // Epsilon-greedy exploration
        if (Math.random() < epsilon && this.training) {
            return this.getRandomAction();
        }
        
        // Get action probabilities from actor network
        const actionProbs = this.forward(this.actors[agentIndex], observation);
        
        // Convert probabilities to discrete actions
        const action = {
            rotation: this.sampleDiscrete([-1, 0, 1], [actionProbs[0], actionProbs[1], actionProbs[2]]),
            thrust: actionProbs[3] > 0.5 ? 1 : 0,
            fire: actionProbs[4] > 0.5 ? 1 : 0,
            shield: actionProbs[5] > 0.5 ? 1 : 0,
            communication: actionProbs[6] || 0 // Continuous communication signal
        };
        
        return action;
    }
    
    // Get random action for exploration
    getRandomAction() {
        return {
            rotation: this.actionSpace.rotation[Math.floor(Math.random() * 3)],
            thrust: Math.random() > 0.5 ? 1 : 0,
            fire: Math.random() > 0.1 ? 1 : 0, // Fire less frequently
            shield: Math.random() > 0.95 ? 1 : 0, // Shield rarely
            communication: Math.random()
        };
    }
    
    // Sample from discrete distribution
    sampleDiscrete(values, probabilities) {
        const rand = Math.random();
        let sum = 0;
        for (let i = 0; i < probabilities.length; i++) {
            sum += probabilities[i];
            if (rand < sum) {
                return values[i];
            }
        }
        return values[values.length - 1];
    }
    
    // Store experience in replay buffer
    storeExperience(observations, actions, rewards, nextObservations, done) {
        const experience = {
            observations,
            actions,
            rewards,
            nextObservations,
            done
        };
        
        this.replayBuffer.push(experience);
        
        // Limit buffer size
        if (this.replayBuffer.length > this.bufferSize) {
            this.replayBuffer.shift();
        }
    }
    
    // Train on a batch of experiences
    trainStep() {
        if (this.replayBuffer.length < this.batchSize) {
            return; // Not enough experiences
        }
        
        // Sample random batch
        const batch = this.sampleBatch(this.batchSize);
        
        // Train each agent
        for (let agentIndex = 0; agentIndex < this.numAgents; agentIndex++) {
            this.trainAgent(agentIndex, batch);
        }
        
        // Soft update target networks
        this.softUpdateTargets();
    }
    
    // Sample random batch from replay buffer
    sampleBatch(batchSize) {
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
            const randomIndex = Math.floor(Math.random() * this.replayBuffer.length);
            batch.push(this.replayBuffer[randomIndex]);
        }
        return batch;
    }
    
    // Train a single agent (simplified - full implementation would use proper backpropagation)
    trainAgent(agentIndex, batch) {
        // This is a placeholder - full implementation would:
        // 1. Compute target Q-values using target networks
        // 2. Compute current Q-values using critic network
        // 3. Compute critic loss and update critic
        // 4. Compute policy gradient and update actor
        // 5. Use proper backpropagation with TensorFlow.js
        
        // For now, we'll use a simple update rule
        // In production, replace with proper gradient descent
        
        console.log(`[MARL] Training agent ${agentIndex} on batch of ${batch.length} experiences`);
    }
    
    // Soft update target networks
    softUpdateTargets() {
        for (let i = 0; i < this.numAgents; i++) {
            // Soft update: target = tau * main + (1 - tau) * target
            this.softUpdateNetwork(this.actors[i], this.targetActors[i], this.tau);
            this.softUpdateNetwork(this.critics[i], this.targetCritics[i], this.tau);
        }
    }
    
    // Soft update a single network
    softUpdateNetwork(source, target, tau) {
        for (let i = 0; i < source.layers.length; i++) {
            for (let j = 0; j < source.layers[i].weights.length; j++) {
                for (let k = 0; k < source.layers[i].weights[j].length; k++) {
                    target.layers[i].weights[j][k] = 
                        tau * source.layers[i].weights[j][k] + 
                        (1 - tau) * target.layers[i].weights[j][k];
                }
            }
            for (let j = 0; j < source.layers[i].biases.length; j++) {
                target.layers[i].biases[j] = 
                    tau * source.layers[i].biases[j] + 
                    (1 - tau) * target.layers[i].biases[j];
            }
        }
    }
    
    // Train for one episode
    trainEpisode(aiShips, asteroids, enemyShips, playerShip) {
        // Initialize environment
        this.env.initialize(aiShips, asteroids, enemyShips, playerShip);
        let observations = this.env.reset();
        let episodeReward = 0;
        let done = false;
        let step = 0;
        
        while (!done && step < this.env.maxEpisodeSteps) {
            // Get actions for all agents
            const actions = [];
            for (let i = 0; i < this.numAgents; i++) {
                if (observations[i]) {
                    // Epsilon decreases over time
                    const epsilon = Math.max(0.01, 0.1 * (1 - this.episodeCount / 1000));
                    actions.push(this.getAction(i, observations[i], epsilon));
                } else {
                    actions.push(this.getRandomAction());
                }
            }
            
            // Execute actions (will be handled by game loop)
            // For now, we'll simulate the step
            
            // Get next observations and rewards
            const stepResult = this.env.step(actions);
            const nextObservations = stepResult.observations;
            const rewards = stepResult.rewards;
            done = stepResult.done;
            
            // Store experience
            this.storeExperience(observations, actions, rewards, nextObservations, done);
            
            // Train on batch
            if (this.replayBuffer.length >= this.batchSize) {
                this.trainStep();
            }
            
            // Update for next step
            observations = nextObservations;
            episodeReward += rewards.reduce((a, b) => a + b, 0);
            step++;
        }
        
        // Update statistics
        this.episodeCount++;
        this.totalRewards.push(episodeReward);
        const stats = this.env.getEpisodeStats();
        
        this.trainingHistory.push({
            episode: this.episodeCount,
            totalReward: episodeReward,
            averageReward: episodeReward / this.numAgents,
            steps: step,
            ...stats
        });
        
        // Log progress
        if (this.episodeCount % 10 === 0) {
            const avgReward = this.totalRewards.slice(-10).reduce((a, b) => a + b, 0) / 10;
            console.log(`[MARL] Episode ${this.episodeCount}: Avg Reward = ${avgReward.toFixed(2)}`);
        }
        
        return episodeReward;
    }
    
    // Get actions for inference (no exploration)
    getActionsForInference(observations) {
        const actions = [];
        for (let i = 0; i < this.numAgents; i++) {
            if (observations[i]) {
                actions.push(this.getAction(i, observations[i], 0)); // No exploration
            } else {
                actions.push(this.getRandomAction());
            }
        }
        return actions;
    }
    
    // Save model (simplified - would serialize network weights)
    saveModel(path) {
        const modelData = {
            actors: this.actors,
            critics: this.critics,
            episodeCount: this.episodeCount,
            trainingHistory: this.trainingHistory
        };
        
        // In production, would save to file or localStorage
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('marl_model', JSON.stringify(modelData));
            console.log('[MARL] Model saved to localStorage');
        }
    }
    
    // Load model
    loadModel(path) {
        if (typeof localStorage !== 'undefined') {
            const modelData = localStorage.getItem('marl_model');
            if (modelData) {
                const data = JSON.parse(modelData);
                this.actors = data.actors;
                this.critics = data.critics;
                this.episodeCount = data.episodeCount || 0;
                this.trainingHistory = data.trainingHistory || [];
                
                // Update target networks
                for (let i = 0; i < this.numAgents; i++) {
                    this.copyWeights(this.actors[i], this.targetActors[i]);
                    this.copyWeights(this.critics[i], this.targetCritics[i]);
                }
                
                console.log('[MARL] Model loaded from localStorage');
                return true;
            }
        }
        return false;
    }
    
    // Get training statistics
    getStats() {
        if (this.totalRewards.length === 0) {
            return {
                episodes: 0,
                averageReward: 0,
                bestReward: 0
            };
        }
        
        const avgReward = this.totalRewards.reduce((a, b) => a + b, 0) / this.totalRewards.length;
        const bestReward = Math.max(...this.totalRewards);
        
        return {
            episodes: this.episodeCount,
            averageReward: avgReward,
            bestReward: bestReward,
            recentAverage: this.totalRewards.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, this.totalRewards.length)
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MARLSystem;
} else {
    window.MARLSystem = MARLSystem;
}

