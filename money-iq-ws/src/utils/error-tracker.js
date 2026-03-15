/**
 * Error Tracking Module for 3-Strike System
 * Implements automatic symbol blacklisting after consecutive API failures
 */

class ErrorTracker {
	constructor(config = {}) {
		this.config = {
			blacklistThreshold: config.blacklistThreshold || 3,
			blacklistDuration: config.blacklistDuration || 300000, // 5 minutes
			cleanupInterval: config.cleanupInterval || 60000, // 1 minute
			maxErrorHistory: config.maxErrorHistory || 100,
			enableRedis: config.enableRedis || false,
			redisPrefix: config.redisPrefix || "error_tracker:",
		};

		// Symbol error tracking
		this.symbolErrors = new Map();
		this.blacklistedSymbols = new Set();

		// Redis integration (optional)
		this.redisManager = config.redisManager || null;
		if (this.redisManager && this.config.enableRedis) {
			this.loadFromRedis();
		}

		// Start cleanup interval
		this.startCleanupInterval();
	}

	/**
	 * Record an error for a symbol
	 */
	async recordError(symbol, errorMessage = "API Error") {
		const upperSymbol = symbol.toUpperCase();
		const now = Date.now();

		if (!this.symbolErrors.has(upperSymbol)) {
			this.symbolErrors.set(upperSymbol, {
				count: 0,
				lastError: null,
				firstError: now,
				blacklistedUntil: 0,
				errors: [],
			});
		}

		const errorInfo = this.symbolErrors.get(upperSymbol);
		errorInfo.count++;
		errorInfo.lastError = errorMessage;
		errorInfo.errors.push({
			message: errorMessage,
			timestamp: now,
		});

		// Keep only recent errors
		if (errorInfo.errors.length > this.config.maxErrorHistory) {
			errorInfo.errors = errorInfo.errors.slice(-this.config.maxErrorHistory);
		}

		console.log(
			`❌ Error recorded for ${upperSymbol}: ${errorMessage} (${errorInfo.count} total)`,
		);

		// Check if symbol should be blacklisted
		if (errorInfo.count >= this.config.blacklistThreshold) {
			await this.blacklistSymbol(upperSymbol);
		}

		// Save to Redis if enabled
		if (this.redisManager && this.config.enableRedis) {
			await this.saveToRedis(upperSymbol, errorInfo);
		}

		return errorInfo;
	}

	/**
	 * Record successful operation (resets error count)
	 */
	async recordSuccess(symbol) {
		const upperSymbol = symbol.toUpperCase();

		if (this.symbolErrors.has(upperSymbol)) {
			const errorInfo = this.symbolErrors.get(upperSymbol);

			// Reset count but keep history for debugging
			errorInfo.count = 0;
			errorInfo.lastError = null;

			console.log(`✅ Success recorded for ${upperSymbol} - error count reset`);
		}

		// Remove from blacklist if present
		if (this.blacklistedSymbols.has(upperSymbol)) {
			this.blacklistedSymbols.delete(upperSymbol);
			console.log(`🟢 ${upperSymbol} removed from blacklist due to success`);
		}

		// Save to Redis if enabled
		if (this.redisManager && this.config.enableRedis) {
			const errorInfo = this.symbolErrors.get(upperSymbol);
			if (errorInfo) {
				await this.saveToRedis(upperSymbol, errorInfo);
				await this.removeBlacklistFromRedis(upperSymbol);
			}
		}
	}

	/**
	 * Blacklist a symbol temporarily
	 */
	async blacklistSymbol(symbol) {
		const upperSymbol = symbol.toUpperCase();
		const now = Date.now();
		const blacklistUntil = now + this.config.blacklistDuration;

		this.blacklistedSymbols.add(upperSymbol);

		if (this.symbolErrors.has(upperSymbol)) {
			this.symbolErrors.get(upperSymbol).blacklistedUntil = blacklistUntil;
		}

		console.log(
			`🚫 Symbol ${upperSymbol} blacklisted until ${new Date(blacklistUntil).toISOString()}`,
		);

		// Save to Redis if enabled
		if (this.redisManager && this.config.enableRedis) {
			await this.saveBlacklistToRedis(upperSymbol, blacklistUntil);
		}
	}

	/**
	 * Check if symbol is currently blacklisted
	 */
	isBlacklisted(symbol) {
		const upperSymbol = symbol.toUpperCase();
		const now = Date.now();

		if (!this.blacklistedSymbols.has(upperSymbol)) {
			return false;
		}

		// Check if blacklist has expired
		const errorInfo = this.symbolErrors.get(upperSymbol);
		if (errorInfo && errorInfo.blacklistedUntil > 0 && now >= errorInfo.blacklistedUntil) {
			this.blacklistedSymbols.delete(upperSymbol);
			errorInfo.blacklistedUntil = 0;
			console.log(`🟢 ${upperSymbol} blacklist expired, symbol available again`);
			return false;
		}

		return true;
	}

	/**
	 * Filter out blacklisted symbols from a list
	 */
	filterBlacklisted(symbols) {
		return symbols.filter((symbol) => !this.isBlacklisted(symbol));
	}

	/**
	 * Get error information for a symbol
	 */
	getSymbolErrorInfo(symbol) {
		const upperSymbol = symbol.toUpperCase();
		return this.symbolErrors.get(upperSymbol) || null;
	}

	/**
	 * Get all blacklisted symbols
	 */
	getBlacklistedSymbols() {
		return Array.from(this.blacklistedSymbols);
	}

	/**
	 * Get error summary statistics
	 */
	getErrorStats() {
		const totalSymbolsWithErrors = this.symbolErrors.size;
		const currentlyBlacklisted = this.blacklistedSymbols.size;

		let totalErrors = 0;
		let symbolsAtRisk = 0; // Symbols with 2+ errors

		for (const [symbol, errorInfo] of this.symbolErrors) {
			totalErrors += errorInfo.count;
			if (errorInfo.count >= 2) {
				symbolsAtRisk++;
			}
		}

		return {
			totalSymbolsWithErrors,
			currentlyBlacklisted,
			symbolsAtRisk,
			totalErrors,
			blacklistThreshold: this.config.blacklistThreshold,
			blacklistDuration: this.config.blacklistDuration,
		};
	}

	/**
	 * Clear error history for a symbol
	 */
	clearSymbolErrors(symbol) {
		const upperSymbol = symbol.toUpperCase();
		this.symbolErrors.delete(upperSymbol);
		this.blacklistedSymbols.delete(upperSymbol);
		console.log(`🧹 Cleared error history for ${upperSymbol}`);
	}

	/**
	 * Clear all error data
	 */
	clearAllErrors() {
		this.symbolErrors.clear();
		this.blacklistedSymbols.clear();
		console.log(`🧹 Cleared all error tracking data`);
	}

	/**
	 * Start cleanup interval to remove expired blacklists
	 */
	startCleanupInterval() {
		setInterval(() => {
			this.cleanupExpiredBlacklists();
		}, this.config.cleanupInterval);
	}

	/**
	 * Remove expired blacklists
	 */
	cleanupExpiredBlacklists() {
		const now = Date.now();
		let cleaned = 0;

		for (const symbol of this.blacklistedSymbols) {
			const errorInfo = this.symbolErrors.get(symbol);
			if (errorInfo && errorInfo.blacklistedUntil > 0 && now >= errorInfo.blacklistedUntil) {
				this.blacklistedSymbols.delete(symbol);
				errorInfo.blacklistedUntil = 0;
				cleaned++;
			}
		}

		if (cleaned > 0) {
			console.log(`🧹 Cleaned up ${cleaned} expired blacklists`);
		}
	}

	/**
	 * Export error tracking state for debugging
	 */
	exportState() {
		return {
			symbolErrors: Array.from(this.symbolErrors.entries()),
			blacklistedSymbols: Array.from(this.blacklistedSymbols),
			config: this.config,
			stats: this.getErrorStats(),
		};
	}

	// ===========================================
	// REDIS PERSISTENCE METHODS
	// ===========================================

	/**
	 * Load error tracking data from Redis
	 */
	async loadFromRedis() {
		if (!this.redisManager || !this.config.enableRedis) return;

		try {
			// Load symbol errors
			const errorKeys = await this.redisManager.client.keys(
				`${this.config.redisPrefix}errors:*`,
			);
			for (const key of errorKeys) {
				const symbol = key.replace(`${this.config.redisPrefix}errors:`, "");
				const data = await this.redisManager.getCachedData(key);
				if (data) {
					this.symbolErrors.set(symbol, JSON.parse(data));
				}
			}

			// Load blacklisted symbols
			const blacklistKeys = await this.redisManager.client.keys(
				`${this.config.redisPrefix}blacklist:*`,
			);
			for (const key of blacklistKeys) {
				const symbol = key.replace(`${this.config.redisPrefix}blacklist:`, "");
				const blacklistUntil = await this.redisManager.getCachedData(key);
				if (blacklistUntil && Date.now() < parseInt(blacklistUntil)) {
					this.blacklistedSymbols.add(symbol);
				}
			}

			console.log(
				`📥 Loaded error tracking from Redis: ${this.symbolErrors.size} symbols, ${this.blacklistedSymbols.size} blacklisted`,
			);
		} catch (error) {
			console.error("❌ Error loading from Redis:", error.message);
		}
	}

	/**
	 * Save symbol error data to Redis
	 */
	async saveToRedis(symbol, errorInfo) {
		if (!this.redisManager || !this.config.enableRedis) return;

		try {
			const key = `${this.config.redisPrefix}errors:${symbol}`;
			await this.redisManager.setCachedData(key, JSON.stringify(errorInfo), 86400); // 24 hours TTL
		} catch (error) {
			console.error(`❌ Error saving ${symbol} to Redis:`, error.message);
		}
	}

	/**
	 * Save blacklist to Redis
	 */
	async saveBlacklistToRedis(symbol, blacklistUntil) {
		if (!this.redisManager || !this.config.enableRedis) return;

		try {
			const key = `${this.config.redisPrefix}blacklist:${symbol}`;
			const ttl = Math.ceil((blacklistUntil - Date.now()) / 1000); // Convert to seconds
			await this.redisManager.setCachedData(key, blacklistUntil.toString(), ttl);
		} catch (error) {
			console.error(`❌ Error saving blacklist ${symbol} to Redis:`, error.message);
		}
	}

	/**
	 * Remove blacklist from Redis
	 */
	async removeBlacklistFromRedis(symbol) {
		if (!this.redisManager || !this.config.enableRedis) return;

		try {
			const key = `${this.config.redisPrefix}blacklist:${symbol}`;
			await this.redisManager.client.del(key);
		} catch (error) {
			console.error(`❌ Error removing blacklist ${symbol} from Redis:`, error.message);
		}
	}
}

module.exports = ErrorTracker;
