/**
 * Symbol Master Manager for Angel One API
 * Handles downloading, caching, and updating the scrip master file every 24 hours
 */

const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

class SymbolMasterManager {
	constructor(config = {}) {
		this.config = {
			// Download settings
			masterFileUrl:
				config.masterFileUrl ||
				"https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json",
			downloadTimeout: config.downloadTimeout || 30000, // 30 seconds
			updateInterval: config.updateInterval || 24 * 60 * 60 * 1000, // 24 hours

			// Storage settings
			cacheDir: config.cacheDir || path.join(__dirname, "../cache"),
			masterFileName: config.masterFileName || "scrip_master.json",
			backupFileName: config.backupFileName || "scrip_master_backup.json",

			// Retry settings
			maxRetries: config.maxRetries || 3,
			retryDelay: config.retryDelay || 5000, // 5 seconds

			// Validation
			minExpectedSymbols: config.minExpectedSymbols || 5000, // Sanity check
		};

		// Symbol mappings cache
		this.symbolToToken = new Map();
		this.tokenToSymbol = new Map();
		this.lastUpdate = 0;
		this.updateInProgress = false;

		// Redis integration (optional)
		this.redisManager = config.redisManager || null;

		console.log(
			`📋 Symbol Master Manager initialized - Update interval: ${this.config.updateInterval / (60 * 60 * 1000)}h`,
		);
	}

	/**
	 * Initialize symbol master - load from cache and set up auto-update
	 */
	async initialize() {
		try {
			// Ensure cache directory exists
			await this.ensureCacheDir();

			// Try to load from cache first
			const loaded = await this.loadFromCache();

			// If no cache or cache is stale, download fresh data
			if (!loaded || this.isCacheStale()) {
				console.log("📡 Cache missing or stale, downloading fresh symbol master...");
				await this.downloadAndProcess();
			}

			// Set up automatic updates
			this.startAutoUpdate();

			console.log(`✅ Symbol Master initialized with ${this.symbolToToken.size} symbols`);
			return true;
		} catch (error) {
			console.error("❌ Failed to initialize Symbol Master:", error.message);

			// Try to load backup file as last resort
			try {
				await this.loadFromBackup();
				console.log("🔄 Loaded from backup file");
				return true;
			} catch (backupError) {
				console.error("❌ Backup loading also failed:", backupError.message);
				return false;
			}
		}
	}

	/**
	 * Download symbol master file from Angel One
	 */
	async downloadSymbolMaster() {
		for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
			try {
				console.log(
					`📡 Downloading symbol master (attempt ${attempt}/${this.config.maxRetries})...`,
				);

				const response = await axios.get(this.config.masterFileUrl, {
					timeout: this.config.downloadTimeout,
					headers: {
						"User-Agent": "Money-IQ-WebSocket-Server/1.0",
						Accept: "application/json",
					},
				});

				// Validate response
				if (!Array.isArray(response.data)) {
					throw new Error("Invalid response format - expected array");
				}

				if (response.data.length < this.config.minExpectedSymbols) {
					throw new Error(
						`Too few symbols received: ${response.data.length} (expected at least ${this.config.minExpectedSymbols})`,
					);
				}

				console.log(`✅ Downloaded ${response.data.length} symbols from Angel One`);
				return response.data;
			} catch (error) {
				console.error(`❌ Download attempt ${attempt} failed:`, error.message);

				if (attempt < this.config.maxRetries) {
					console.log(`⏳ Retrying in ${this.config.retryDelay}ms...`);
					await this.delay(this.config.retryDelay);
				} else {
					throw error;
				}
			}
		}
	}

	/**
	 * Process downloaded symbol data and build lookup maps
	 */
	processSymbolData(symbolData) {
		const symbolToToken = new Map();
		const tokenToSymbol = new Map();

		let processed = 0;
		let skipped = 0;

		for (const item of symbolData) {
			try {
				// Extract relevant fields from Angel One format
				const symbol = item.symbol?.trim()?.toUpperCase();
				const token = item.token?.toString();
				const exchange = item.exch_seg;
				const instrumentType = item.instrumenttype;

				// Only process equity symbols from NSE
				if (!symbol || !token || exchange !== "NSE" || instrumentType !== "EQ") {
					skipped++;
					continue;
				}

				// Clean symbol (remove -EQ suffix if present)
				const cleanSymbol = symbol.replace("-EQ", "");

				// Build mappings
				symbolToToken.set(cleanSymbol, token);
				tokenToSymbol.set(token, cleanSymbol);

				processed++;
			} catch (error) {
				skipped++;
				console.warn(`⚠️  Error processing symbol:`, error.message);
			}
		}

		console.log(`📊 Symbol processing complete: ${processed} processed, ${skipped} skipped`);

		return { symbolToToken, tokenToSymbol };
	}

	/**
	 * Download and process symbol master file
	 */
	async downloadAndProcess() {
		if (this.updateInProgress) {
			console.log("⏳ Update already in progress...");
			return false;
		}

		this.updateInProgress = true;

		try {
			// Download fresh data
			const symbolData = await this.downloadSymbolMaster();

			// Create backup of current data before updating
			await this.createBackup();

			// Process the data
			const { symbolToToken, tokenToSymbol } = this.processSymbolData(symbolData);

			// Save to cache file
			const cacheData = {
				symbolToToken: Array.from(symbolToToken.entries()),
				tokenToSymbol: Array.from(tokenToSymbol.entries()),
				lastUpdate: Date.now(),
				totalSymbols: symbolToToken.size,
				downloadedAt: new Date().toISOString(),
			};

			await this.saveToCache(cacheData);

			// Update in-memory maps
			this.symbolToToken = symbolToToken;
			this.tokenToSymbol = tokenToSymbol;
			this.lastUpdate = Date.now();

			// Save to Redis if available
			if (this.redisManager) {
				await this.saveToRedis(cacheData);
			}

			console.log(
				`✅ Symbol master updated successfully - ${symbolToToken.size} symbols loaded`,
			);
			return true;
		} catch (error) {
			console.error("❌ Symbol master update failed:", error.message);
			return false;
		} finally {
			this.updateInProgress = false;
		}
	}

	/**
	 * Get token for a symbol
	 */
	getToken(symbol) {
		const upperSymbol = symbol?.toUpperCase?.();
		return this.symbolToToken.get(upperSymbol) || null;
	}

	/**
	 * Get symbol for a token
	 */
	getSymbol(token) {
		return this.tokenToSymbol.get(token?.toString?.()) || null;
	}

	/**
	 * Convert array of symbols to tokens
	 */
	symbolsToTokens(symbols) {
		const tokens = [];
		const unmapped = [];

		for (const symbol of symbols) {
			const token = this.getToken(symbol);
			if (token) {
				tokens.push(token);
			} else {
				unmapped.push(symbol);
			}
		}

		return { tokens, unmapped };
	}

	/**
	 * Check if symbol exists in master data
	 */
	hasSymbol(symbol) {
		return this.symbolToToken.has(symbol?.toUpperCase?.());
	}

	/**
	 * Get symbol master statistics
	 */
	getStats() {
		return {
			totalSymbols: this.symbolToToken.size,
			lastUpdate: this.lastUpdate,
			lastUpdateFormatted: new Date(this.lastUpdate).toISOString(),
			isStale: this.isCacheStale(),
			updateInProgress: this.updateInProgress,
			nextUpdateDue: this.lastUpdate + this.config.updateInterval,
			cacheAge: Date.now() - this.lastUpdate,
		};
	}

	// ===========================================
	// CACHE MANAGEMENT
	// ===========================================

	async ensureCacheDir() {
		try {
			await fs.mkdir(this.config.cacheDir, { recursive: true });
		} catch (error) {
			console.error("Error creating cache directory:", error.message);
		}
	}

	getCacheFilePath() {
		return path.join(this.config.cacheDir, this.config.masterFileName);
	}

	getBackupFilePath() {
		return path.join(this.config.cacheDir, this.config.backupFileName);
	}

	async saveToCache(data) {
		const filePath = this.getCacheFilePath();
		await fs.writeFile(filePath, JSON.stringify(data, null, 2));
		console.log(`💾 Symbol master saved to cache: ${filePath}`);
	}

	async loadFromCache() {
		try {
			const filePath = this.getCacheFilePath();
			const data = JSON.parse(await fs.readFile(filePath, "utf8"));

			this.symbolToToken = new Map(data.symbolToToken);
			this.tokenToSymbol = new Map(data.tokenToSymbol);
			this.lastUpdate = data.lastUpdate || 0;

			console.log(`📥 Loaded ${this.symbolToToken.size} symbols from cache`);
			return true;
		} catch (error) {
			console.log("📁 No cache file found or invalid format");
			return false;
		}
	}

	async createBackup() {
		try {
			const source = this.getCacheFilePath();
			const backup = this.getBackupFilePath();

			const data = await fs.readFile(source);
			await fs.writeFile(backup, data);

			console.log("🔄 Created backup of symbol master");
		} catch (error) {
			console.warn("⚠️  Could not create backup:", error.message);
		}
	}

	async loadFromBackup() {
		const backupPath = this.getBackupFilePath();
		const data = JSON.parse(await fs.readFile(backupPath, "utf8"));

		this.symbolToToken = new Map(data.symbolToToken);
		this.tokenToSymbol = new Map(data.tokenToSymbol);
		this.lastUpdate = data.lastUpdate || 0;

		console.log(`🔄 Loaded ${this.symbolToToken.size} symbols from backup`);
	}

	isCacheStale() {
		return Date.now() - this.lastUpdate > this.config.updateInterval;
	}

	// ===========================================
	// REDIS INTEGRATION
	// ===========================================

	async saveToRedis(data) {
		if (!this.redisManager) return;

		try {
			await this.redisManager.setCachedData(
				"symbol_master_data",
				JSON.stringify(data),
				86400,
			); // 24 hours TTL
			console.log("💾 Symbol master saved to Redis");
		} catch (error) {
			console.error("❌ Error saving to Redis:", error.message);
		}
	}

	// ===========================================
	// AUTO-UPDATE SYSTEM
	// ===========================================

	startAutoUpdate() {
		// Initial check in 1 minute, then every hour
		setTimeout(() => {
			this.checkForUpdate();
			setInterval(
				() => {
					this.checkForUpdate();
				},
				60 * 60 * 1000,
			); // Check every hour
		}, 60 * 1000);

		console.log("🕐 Auto-update scheduler started");
	}

	async checkForUpdate() {
		if (this.isCacheStale() && !this.updateInProgress) {
			console.log("⏰ Cache is stale, triggering update...");
			await this.downloadAndProcess();
		}
	}

	/**
	 * Force manual update (for admin use)
	 */
	async forceUpdate() {
		console.log("🔄 Forcing symbol master update...");
		return await this.downloadAndProcess();
	}

	delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

module.exports = SymbolMasterManager;
