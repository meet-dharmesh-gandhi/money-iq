/**
 * Integration Example - WebSocket Server with All Modules
 * This demonstrates how all the modules work together
 */

// Module imports
const WebSocketServer = require("ws").Server;
const { config } = require("./src/config");
const RedisManager = require("./src/database/redis-manager");
const AngelOneAPI = require("./src/api/angel-one-handler");
const { MESSAGE_TYPES, CLIENT_STATES } = require("./src/types");

/**
 * Example Integration Class
 * Shows how to integrate all modules for a complete solution
 */
class IntegratedStockServer {
	constructor() {
		this.config = config;
		this.redisManager = new RedisManager();
		this.angelOneAPI = new AngelOneAPI(config.angelOne);
		this.wss = null;
		this.clients = new Map();
		this.subscribedSymbols = new Set();
		this.isRunning = false;
	}

	/**
	 * Initialize all components
	 */
	async initialize() {
		console.log("🚀 Initializing integrated stock server...");

		try {
			// 1. Validate configuration
			const validation = require("./src/config").validateConfig();
			if (!validation.isValid) {
				throw new Error(`Configuration errors: ${validation.errors.join(", ")}`);
			}

			// 2. Initialize Redis (if enabled)
			if (this.config.redis.enabled) {
				console.log("📡 Connecting to Redis...");
				await this.redisManager.connect();
				console.log("✅ Redis connected successfully");
			}

			// 3. Initialize Angel One API (if enabled)
			if (this.config.angelOne.enabled && !this.config.angelOne.useSimulation) {
				console.log("🔐 Authenticating with Angel One...");
				await this.angelOneAPI.authenticate();
				console.log("✅ Angel One authenticated successfully");
			}

			// 4. Create WebSocket server
			this.wss = new WebSocketServer({
				port: this.config.server.port,
				host: this.config.server.host,
			});

			// 5. Setup event handlers
			this.setupWebSocketHandlers();

			// 6. Start data update loop
			this.startDataUpdates();

			this.isRunning = true;
			console.log(
				`✅ Integrated server running on ws://${this.config.server.host}:${this.config.server.port}`,
			);
		} catch (error) {
			console.error("❌ Initialization failed:", error.message);
			throw error;
		}
	}

	/**
	 * Setup WebSocket event handlers
	 */
	setupWebSocketHandlers() {
		this.wss.on("connection", (ws, req) => {
			const clientId = this.generateClientId();

			// Initialize client
			this.clients.set(clientId, {
				ws,
				id: clientId,
				state: CLIENT_STATES.CONNECTED,
				subscribedSymbols: new Set(),
				ip: req.socket.remoteAddress,
				connectTime: Date.now(),
			});

			console.log(`📱 Client connected: ${clientId} (${this.clients.size} total)`);

			// Message handler
			ws.on("message", async (message) => {
				await this.handleClientMessage(clientId, message);
			});

			// Disconnect handler
			ws.on("close", () => {
				const client = this.clients.get(clientId);
				if (client) {
					// Remove client's symbols from global subscription list
					client.subscribedSymbols.forEach((symbol) => {
						const hasOtherSubscribers = Array.from(this.clients.values()).some(
							(c) => c.id !== clientId && c.subscribedSymbols.has(symbol),
						);

						if (!hasOtherSubscribers) {
							this.subscribedSymbols.delete(symbol);
						}
					});

					this.clients.delete(clientId);
				}

				console.log(`📱 Client disconnected: ${clientId} (${this.clients.size} remaining)`);
			});

			// Send welcome message
			this.sendToClient(clientId, {
				type: MESSAGE_TYPES.SYSTEM,
				message: "Connected to MoneyIQ Stock Server",
				serverTime: Date.now(),
			});
		});
	}

	/**
	 * Handle client messages
	 */
	async handleClientMessage(clientId, message) {
		try {
			const data = JSON.parse(message);
			const client = this.clients.get(clientId);

			if (!client) return;

			switch (data.type) {
				case MESSAGE_TYPES.SUBSCRIBE:
					await this.handleSubscription(clientId, data.symbols);
					break;

				case MESSAGE_TYPES.UNSUBSCRIBE:
					await this.handleUnsubscription(clientId, data.symbols);
					break;

				case MESSAGE_TYPES.PING:
					this.sendToClient(clientId, { type: MESSAGE_TYPES.PONG });
					break;

				default:
					this.sendToClient(clientId, {
						type: MESSAGE_TYPES.ERROR,
						error: "Unknown message type",
					});
			}
		} catch (error) {
			console.error(`❌ Message handling error for ${clientId}:`, error.message);
			this.sendToClient(clientId, {
				type: MESSAGE_TYPES.ERROR,
				error: "Invalid message format",
			});
		}
	}

	/**
	 * Handle symbol subscription
	 */
	async handleSubscription(clientId, symbols) {
		const client = this.clients.get(clientId);
		if (!client || !symbols || !Array.isArray(symbols)) {
			return this.sendToClient(clientId, {
				type: MESSAGE_TYPES.ERROR,
				error: "Invalid subscription request",
			});
		}

		const validSymbols = symbols.filter(
			(s) => typeof s === "string" && /^[A-Z0-9]{1,20}$/.test(s),
		);

		if (validSymbols.length === 0) {
			return this.sendToClient(clientId, {
				type: MESSAGE_TYPES.ERROR,
				error: "No valid symbols provided",
			});
		}

		// Add to client and global subscriptions
		validSymbols.forEach((symbol) => {
			client.subscribedSymbols.add(symbol);
			this.subscribedSymbols.add(symbol);
		});

		// Try to get cached data immediately
		for (const symbol of validSymbols) {
			const cachedData = await this.getCachedStockData(symbol);
			if (cachedData) {
				this.sendToClient(clientId, {
					type: MESSAGE_TYPES.STOCK_UPDATE,
					data: cachedData,
				});
			}
		}

		this.sendToClient(clientId, {
			type: MESSAGE_TYPES.SUBSCRIPTION_ACK,
			symbols: validSymbols,
			message: `Subscribed to ${validSymbols.length} symbols`,
		});

		console.log(`📊 Client ${clientId} subscribed to: ${validSymbols.join(", ")}`);
	}

	/**
	 * Handle symbol unsubscription
	 */
	async handleUnsubscription(clientId, symbols) {
		const client = this.clients.get(clientId);
		if (!client || !symbols || !Array.isArray(symbols)) {
			return this.sendToClient(clientId, {
				type: MESSAGE_TYPES.ERROR,
				error: "Invalid unsubscription request",
			});
		}

		symbols.forEach((symbol) => {
			client.subscribedSymbols.delete(symbol);

			// Remove from global if no other clients are subscribed
			const hasOtherSubscribers = Array.from(this.clients.values()).some(
				(c) => c.id !== clientId && c.subscribedSymbols.has(symbol),
			);

			if (!hasOtherSubscribers) {
				this.subscribedSymbols.delete(symbol);
			}
		});

		this.sendToClient(clientId, {
			type: MESSAGE_TYPES.UNSUBSCRIPTION_ACK,
			symbols: symbols,
			message: `Unsubscribed from ${symbols.length} symbols`,
		});

		console.log(`📊 Client ${clientId} unsubscribed from: ${symbols.join(", ")}`);
	}

	/**
	 * Get cached stock data from Redis
	 */
	async getCachedStockData(symbol) {
		if (!this.config.redis.enabled) return null;

		try {
			return await this.redisManager.getStockPrice(symbol);
		} catch (error) {
			console.error(`❌ Redis cache error for ${symbol}:`, error.message);
			return null;
		}
	}

	/**
	 * Start data update loop
	 */
	startDataUpdates() {
		const updateInterval = this.config.stock.updateInterval;

		setInterval(async () => {
			if (this.subscribedSymbols.size === 0) return;

			await this.fetchAndBroadcastStockData();
		}, updateInterval);

		console.log(`📈 Data updates started (${updateInterval}ms interval)`);
	}

	/**
	 * Fetch and broadcast stock data
	 */
	async fetchAndBroadcastStockData() {
		try {
			const symbols = Array.from(this.subscribedSymbols);
			let stockData = [];

			// Try Angel One API first
			if (this.config.angelOne.enabled) {
				const result = await this.angelOneAPI.fetchStockQuotes(symbols);
				if (result.success && result.data.fetched.length > 0) {
					stockData = result.data.fetched;
				}
			}

			// Fallback to simulation data
			if (stockData.length === 0) {
				stockData = this.generateSimulationData(symbols);
			}

			// Cache data in Redis
			if (this.config.redis.enabled) {
				const cachePromises = stockData.map((data) =>
					this.redisManager.setStockPrice(data.symbol, data),
				);
				await Promise.all(cachePromises);
			}

			// Broadcast to subscribed clients
			stockData.forEach((data) => {
				this.broadcastStockUpdate(data);
			});
		} catch (error) {
			console.error("❌ Data fetch/broadcast error:", error.message);
		}
	}

	/**
	 * Generate simulation data for testing
	 */
	generateSimulationData(symbols) {
		return symbols.map((symbol) => ({
			symbol,
			ltp: 1000 + Math.random() * 1000,
			percentChange: (Math.random() - 0.5) * 4,
			volume: Math.floor(Math.random() * 1000000),
			timestamp: Date.now(),
		}));
	}

	/**
	 * Broadcast stock update to subscribed clients
	 */
	broadcastStockUpdate(stockData) {
		this.clients.forEach((client) => {
			if (client.subscribedSymbols.has(stockData.symbol)) {
				this.sendToClient(client.id, {
					type: MESSAGE_TYPES.STOCK_UPDATE,
					data: stockData,
				});
			}
		});
	}

	/**
	 * Send message to specific client
	 */
	sendToClient(clientId, data) {
		const client = this.clients.get(clientId);
		if (client && client.ws.readyState === client.ws.OPEN) {
			try {
				client.ws.send(JSON.stringify(data));
			} catch (error) {
				console.error(`❌ Send error to ${clientId}:`, error.message);
			}
		}
	}

	/**
	 * Generate unique client ID
	 */
	generateClientId() {
		return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Get server status
	 */
	getStatus() {
		return {
			isRunning: this.isRunning,
			connectedClients: this.clients.size,
			subscribedSymbols: this.subscribedSymbols.size,
			redisConnected: this.redisManager.isConnected(),
			angelOneAuthenticated: this.angelOneAPI.getAuthStatus().isAuthenticated,
			uptime: Date.now(),
		};
	}

	/**
	 * Graceful shutdown
	 */
	async shutdown() {
		console.log("🔄 Shutting down integrated server...");

		this.isRunning = false;

		// Close WebSocket connections
		this.clients.forEach((client) => {
			client.ws.close();
		});

		// Close WebSocket server
		if (this.wss) {
			this.wss.close();
		}

		// Disconnect from Redis
		if (this.config.redis.enabled) {
			await this.redisManager.disconnect();
		}

		console.log("✅ Server shutdown complete");
	}
}

// Example usage
async function runIntegrationExample() {
	const server = new IntegratedStockServer();

	try {
		await server.initialize();

		// Set up graceful shutdown
		process.on("SIGINT", async () => {
			console.log("\n⚠️  Received shutdown signal...");
			await server.shutdown();
			process.exit(0);
		});

		process.on("SIGTERM", async () => {
			console.log("\n⚠️  Received termination signal...");
			await server.shutdown();
			process.exit(0);
		});

		// Log status every 30 seconds
		setInterval(() => {
			const status = server.getStatus();
			console.log(
				`📊 Status: ${status.connectedClients} clients, ${status.subscribedSymbols} symbols, Redis: ${status.redisConnected ? "✅" : "❌"}, Angel One: ${status.angelOneAuthenticated ? "✅" : "❌"}`,
			);
		}, 30000);
	} catch (error) {
		console.error("❌ Integration example failed:", error.message);
		process.exit(1);
	}
}

// Export for use as module
module.exports = IntegratedStockServer;

// Run if called directly
if (require.main === module) {
	runIntegrationExample();
}
