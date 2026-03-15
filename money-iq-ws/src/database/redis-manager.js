const Redis = require("redis");

/**
 * Redis Database Manager
 * Handles all Redis operations for caching stock data and distributed locking
 */
class RedisManager {
	constructor(config = {}) {
		this.config = {
			url: config.url || process.env.REDIS_URL || "redis://localhost:6379",
			ttl: config.ttl || 500, // 500ms default TTL
			lockTimeout: config.lockTimeout || 2000, // 2 seconds lock timeout
			retryAttempts: config.retryAttempts || 3,
			retryDelay: config.retryDelay || 1000,
		};

		this.client = null;
		this.isConnected = false;
	}

	/**
	 * Initialize Redis connection
	 */
	async connect() {
		try {
			this.client = Redis.createClient({ url: this.config.url });

			// Event listeners
			this.client.on("error", (err) => {
				console.error("Redis connection error:", err);
				this.isConnected = false;
			});

			this.client.on("connect", () => {
				console.log("✅ Redis connected successfully");
				this.isConnected = true;
			});

			this.client.on("disconnect", () => {
				console.log("🔌 Redis disconnected");
				this.isConnected = false;
			});

			await this.client.connect();
			return true;
		} catch (error) {
			console.error("❌ Redis connection failed:", error.message);
			throw error;
		}
	}

	/**
	 * Disconnect from Redis
	 */
	async disconnect() {
		if (this.client && this.isConnected) {
			try {
				await this.client.quit();
				console.log("✅ Redis connection closed");
				return true;
			} catch (error) {
				console.error("❌ Redis disconnect error:", error.message);
				return false;
			}
		}
	}

	/**
	 * Check if Redis is connected and ready
	 */
	isReady() {
		return this.isConnected && this.client;
	}

	// ===========================================
	// STOCK DATA CACHING METHODS
	// ===========================================

	/**
	 * Cache stock price data
	 */
	async cacheStockPrice(symbol, data) {
		if (!this.isReady()) throw new Error("Redis not connected");

		try {
			const key = `stock:price:${symbol.toUpperCase()}`;
			const value = JSON.stringify({
				...data,
				cachedAt: Date.now(),
			});

			const ttlSeconds = Math.ceil(this.config.ttl / 1000);
			await this.client.setEx(key, ttlSeconds, value);

			return true;
		} catch (error) {
			console.error(`❌ Cache write error for ${symbol}:`, error.message);
			return false;
		}
	}

	/**
	 * Get cached stock price data
	 */
	async getCachedStockPrice(symbol) {
		if (!this.isReady()) return null;

		try {
			const key = `stock:price:${symbol.toUpperCase()}`;
			const data = await this.client.get(key);

			if (!data) return null;

			const parsed = JSON.parse(data);

			// Check if data is still fresh
			const age = Date.now() - parsed.cachedAt;
			if (age > this.config.ttl) {
				// Data is stale, remove it
				await this.client.del(key);
				return null;
			}

			return parsed;
		} catch (error) {
			console.error(`❌ Cache read error for ${symbol}:`, error.message);
			return null;
		}
	}

	/**
	 * Cache multiple stock prices in a batch
	 */
	async batchCacheStockPrices(stockDataArray) {
		if (!this.isReady() || !Array.isArray(stockDataArray)) return 0;

		try {
			const pipeline = this.client.multi();
			const ttlSeconds = Math.ceil(this.config.ttl / 1000);
			let count = 0;

			for (const stockData of stockDataArray) {
				if (stockData.symbol) {
					const key = `stock:price:${stockData.symbol.toUpperCase()}`;
					const value = JSON.stringify({
						...stockData,
						cachedAt: Date.now(),
					});

					pipeline.setEx(key, ttlSeconds, value);
					count++;
				}
			}

			await pipeline.exec();
			console.log(`✅ Cached ${count} stock prices`);
			return count;
		} catch (error) {
			console.error("❌ Batch cache error:", error.message);
			return 0;
		}
	}

	/**
	 * Check if symbols need refresh
	 */
	async symbolsNeedRefresh(symbols) {
		if (!this.isReady() || !Array.isArray(symbols)) return symbols;

		const staleSymbols = [];

		try {
			for (const symbol of symbols) {
				const cached = await this.getCachedStockPrice(symbol);
				if (!cached) {
					staleSymbols.push(symbol);
				}
			}

			return staleSymbols;
		} catch (error) {
			console.error("❌ Symbols refresh check error:", error.message);
			return symbols; // Return all symbols on error
		}
	}

	// ===========================================
	// DISTRIBUTED LOCKING METHODS
	// ===========================================

	/**
	 * Acquire distributed lock
	 */
	async acquireLock(lockKey, timeout = null) {
		if (!this.isReady()) return false;

		const actualTimeout = timeout || this.config.lockTimeout;

		try {
			const lockValue = Date.now().toString();
			const acquired = await this.client.setNX(lockKey, lockValue);

			if (acquired) {
				// Set expiry for the lock
				await this.client.expire(lockKey, Math.ceil(actualTimeout / 1000));
				console.log(`🔒 Lock acquired: ${lockKey}`);
				return true;
			}

			// Check if existing lock is stale
			const existingValue = await this.client.get(lockKey);
			if (existingValue) {
				const lockTime = parseInt(existingValue);
				const age = Date.now() - lockTime;

				if (age > actualTimeout) {
					// Lock is stale, force release and try again
					await this.client.del(lockKey);
					console.log(`🔓 Released stale lock: ${lockKey}`);
					return this.acquireLock(lockKey, timeout); // Recursive retry
				}
			}

			return false;
		} catch (error) {
			console.error(`❌ Lock acquisition error for ${lockKey}:`, error.message);
			return false;
		}
	}

	/**
	 * Release distributed lock
	 */
	async releaseLock(lockKey) {
		if (!this.isReady()) return false;

		try {
			const deleted = await this.client.del(lockKey);
			if (deleted > 0) {
				console.log(`🔓 Lock released: ${lockKey}`);
				return true;
			}
			return false;
		} catch (error) {
			console.error(`❌ Lock release error for ${lockKey}:`, error.message);
			return false;
		}
	}

	// ===========================================
	// CLEANUP AND MAINTENANCE METHODS
	// ===========================================

	/**
	 * Clear all cached stock prices
	 */
	async clearStockCache() {
		if (!this.isReady()) return 0;

		try {
			const keys = await this.client.keys("stock:price:*");
			if (keys.length === 0) return 0;

			const deleted = await this.client.del(keys);
			console.log(`🧹 Cleared ${deleted} cached stock prices`);
			return deleted;
		} catch (error) {
			console.error("❌ Cache clear error:", error.message);
			return 0;
		}
	}

	/**
	 * Get cache statistics
	 */
	async getCacheStats() {
		if (!this.isReady()) return null;

		try {
			const keys = await this.client.keys("stock:price:*");
			const lockKeys = await this.client.keys("*:lock");

			return {
				totalCachedStocks: keys.length,
				activeLocks: lockKeys.length,
				cacheKeys: keys,
				lockKeys: lockKeys,
			};
		} catch (error) {
			console.error("❌ Cache stats error:", error.message);
			return null;
		}
	}

	/**
	 * Health check for Redis connection
	 */
	async healthCheck() {
		if (!this.isReady()) {
			return { status: "disconnected", error: "Not connected to Redis" };
		}

		try {
			const start = Date.now();
			await this.client.ping();
			const latency = Date.now() - start;

			return {
				status: "healthy",
				latency: `${latency}ms`,
				connected: this.isConnected,
				config: {
					url: this.config.url,
					ttl: this.config.ttl,
					lockTimeout: this.config.lockTimeout,
				},
			};
		} catch (error) {
			return {
				status: "unhealthy",
				error: error.message,
			};
		}
	}
}

module.exports = RedisManager;
