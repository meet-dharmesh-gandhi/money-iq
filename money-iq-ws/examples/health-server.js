/**
 * Health Check Endpoint Example
 * Demonstrates how to add HTTP health checks to the WebSocket server
 */

const http = require("http");
const RedisManager = require("../src/database/redis-manager");
const AngelOneAPI = require("../src/api/angel-one-handler");
const { config } = require("../src/config");

/**
 * Health Check Server
 * Provides HTTP endpoints for monitoring server health
 */
class HealthCheckServer {
	constructor() {
		this.redisManager = new RedisManager();
		this.angelOneAPI = new AngelOneAPI(config.angelOne);
		this.server = null;
		this.startTime = Date.now();
	}

	/**
	 * Start health check server
	 */
	start() {
		this.server = http.createServer(async (req, res) => {
			// Set CORS headers
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "Content-Type");
			res.setHeader("Content-Type", "application/json");

			if (req.method === "OPTIONS") {
				res.writeHead(200);
				res.end();
				return;
			}

			if (req.method !== "GET") {
				res.writeHead(405);
				res.end(JSON.stringify({ error: "Method not allowed" }));
				return;
			}

			try {
				switch (req.url) {
					case "/health":
						await this.handleHealthCheck(res);
						break;
					case "/status":
						await this.handleDetailedStatus(res);
						break;
					case "/metrics":
						await this.handleMetrics(res);
						break;
					default:
						res.writeHead(404);
						res.end(JSON.stringify({ error: "Endpoint not found" }));
				}
			} catch (error) {
				console.error("Health check error:", error.message);
				res.writeHead(500);
				res.end(JSON.stringify({ error: "Internal server error" }));
			}
		});

		const port = config.environment.healthCheckPort || 8081;
		this.server.listen(port, () => {
			console.log(`🏥 Health check server running on http://localhost:${port}`);
			console.log(`   - /health   - Basic health status`);
			console.log(`   - /status   - Detailed component status`);
			console.log(`   - /metrics  - Performance metrics`);
		});
	}

	/**
	 * Basic health check endpoint
	 */
	async handleHealthCheck(res) {
		const checks = await Promise.allSettled([this.checkRedis(), this.checkAngelOne()]);

		const redisHealth =
			checks[0].status === "fulfilled"
				? checks[0].value
				: { status: "error", error: checks[0].reason?.message };
		const angelOneHealth =
			checks[1].status === "fulfilled"
				? checks[1].value
				: { status: "error", error: checks[1].reason?.message };

		const overallStatus =
			redisHealth.status === "healthy" && angelOneHealth.status === "healthy"
				? "healthy"
				: "unhealthy";

		const response = {
			status: overallStatus,
			timestamp: new Date().toISOString(),
			uptime: Date.now() - this.startTime,
			components: {
				redis: redisHealth.status,
				angelOne: angelOneHealth.status,
			},
		};

		const statusCode = overallStatus === "healthy" ? 200 : 503;
		res.writeHead(statusCode);
		res.end(JSON.stringify(response, null, 2));
	}

	/**
	 * Detailed status endpoint
	 */
	async handleDetailedStatus(res) {
		const [redisStatus, angelOneStatus] = await Promise.allSettled([
			this.checkRedis(),
			this.checkAngelOne(),
		]);

		const response = {
			server: {
				status: "running",
				uptime: Date.now() - this.startTime,
				uptimeHuman: this.formatUptime(Date.now() - this.startTime),
				startTime: new Date(this.startTime).toISOString(),
				environment: config.environment.environment,
				version: "1.0.0",
				nodeVersion: process.version,
				platform: process.platform,
			},
			components: {
				redis:
					redisStatus.status === "fulfilled"
						? redisStatus.value
						: {
								status: "error",
								error: redisStatus.reason?.message,
							},
				angelOne:
					angelOneStatus.status === "fulfilled"
						? angelOneStatus.value
						: {
								status: "error",
								error: angelOneStatus.reason?.message,
							},
			},
			configuration: {
				redis: {
					enabled: config.redis.enabled,
					host: config.redis.enabled ? config.redis.host : "disabled",
					port: config.redis.enabled ? config.redis.port : "disabled",
					database: config.redis.enabled ? config.redis.database : "disabled",
				},
				angelOne: {
					enabled: config.angelOne.enabled,
					simulation: config.angelOne.useSimulation,
					hasCredentials: config.angelOne.enabled
						? this.angelOneAPI.hasValidCredentials()
						: false,
				},
				websocket: {
					port: config.server.port,
					host: config.server.host,
					maxClients: config.server.maxClients,
					heartbeatInterval: config.server.heartbeatInterval,
				},
			},
			memory: {
				usage: process.memoryUsage(),
				heap: {
					used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
					total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
				},
			},
		};

		res.writeHead(200);
		res.end(JSON.stringify(response, null, 2));
	}

	/**
	 * Performance metrics endpoint
	 */
	async handleMetrics(res) {
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		const metrics = {
			timestamp: new Date().toISOString(),
			uptime: Date.now() - this.startTime,
			memory: {
				rss: Math.round(memUsage.rss / 1024 / 1024), // MB
				heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
				heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
				external: Math.round(memUsage.external / 1024 / 1024), // MB
			},
			cpu: {
				user: cpuUsage.user,
				system: cpuUsage.system,
			},
			process: {
				pid: process.pid,
				nodeVersion: process.version,
				platform: process.platform,
			},
		};

		// Add Redis metrics if enabled
		if (config.redis.enabled) {
			try {
				metrics.redis = await this.redisManager.getMetrics();
			} catch (error) {
				metrics.redis = { error: error.message };
			}
		}

		res.writeHead(200);
		res.end(JSON.stringify(metrics, null, 2));
	}

	/**
	 * Check Redis health
	 */
	async checkRedis() {
		if (!config.redis.enabled) {
			return { status: "disabled", message: "Redis is disabled in configuration" };
		}

		try {
			const healthCheck = await this.redisManager.healthCheck();
			return {
				status: healthCheck.connected ? "healthy" : "unhealthy",
				connected: healthCheck.connected,
				responseTime: healthCheck.responseTime,
				memory: healthCheck.memory,
			};
		} catch (error) {
			return {
				status: "error",
				error: error.message,
			};
		}
	}

	/**
	 * Check Angel One API health
	 */
	async checkAngelOne() {
		if (!config.angelOne.enabled) {
			return { status: "disabled", message: "Angel One API is disabled in configuration" };
		}

		if (config.angelOne.useSimulation) {
			return { status: "simulation", message: "Angel One is running in simulation mode" };
		}

		try {
			const healthCheck = await this.angelOneAPI.healthCheck();
			return {
				status: healthCheck.status,
				authenticated: healthCheck.authenticated,
				error: healthCheck.error,
			};
		} catch (error) {
			return {
				status: "error",
				error: error.message,
			};
		}
	}

	/**
	 * Format uptime in human readable format
	 */
	formatUptime(ms) {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days}d ${hours % 24}h ${minutes % 60}m`;
		} else if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}

	/**
	 * Stop health check server
	 */
	stop() {
		if (this.server) {
			this.server.close();
			console.log("🏥 Health check server stopped");
		}
	}
}

// Export for use as module
module.exports = HealthCheckServer;

// Example usage
if (require.main === module) {
	const healthServer = new HealthCheckServer();
	healthServer.start();

	// Graceful shutdown
	process.on("SIGINT", () => {
		healthServer.stop();
		process.exit(0);
	});
}
