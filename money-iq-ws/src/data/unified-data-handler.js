/**
 * Unified Stock Data Handler
 * Intelligently switches between Angel One API and fake data based on configuration
 * Environment-aware with fallback support for development
 */

const AngelOneAPI = require("./angel-one-handler");
const FakeDataGenerator = require("../data/fake-data-generator");

class UnifiedDataHandler {
	constructor(config = {}) {
		this.config = {
			// Environment settings
			environment: config.environment || process.env.NODE_ENV || "development",
			forceMode: config.forceMode || null, // 'angel-one', 'fake', or null for auto-detect

			// Angel One settings
			enableAngelOne: config.enableAngelOne !== false, // Default enabled
			angelOneConfig: config.angelOneConfig || {},

			// Fake data settings
			enableFakeData: config.enableFakeData !== false, // Default enabled
			fakeDataConfig: config.fakeDataConfig || {},

			// Fallback behavior
			fallbackToFake: config.fallbackToFake !== false, // Default enabled
			maxRetries: config.maxRetries || 3,
			retryDelay: config.retryDelay || 5000, // 5 seconds
		};

		// Data sources
		this.angelOneAPI = null;
		this.fakeDataGenerator = null;

		// State tracking
		this.activeDataSource = null;
		this.lastError = null;
		this.initializationAttempts = 0;
		this.angelOneAvailable = false;
		this.fakeDataAvailable = false;

		console.log(
			`🎯 Unified Data Handler initializing - Environment: ${this.config.environment}`,
		);

		// Initialize data sources
		this.initializeDataSources();
	}

	/**
	 * Initialize all available data sources
	 */
	async initializeDataSources() {
		try {
			this.initializationAttempts++;

			// Initialize Angel One API if enabled
			if (this.config.enableAngelOne) {
				await this.initializeAngelOne();
			}

			// Initialize fake data generator if enabled
			if (this.config.enableFakeData) {
				await this.initializeFakeData();
			}

			// Determine active data source
			await this.selectDataSource();

			// Log initialization result
			this.logInitializationStatus();
		} catch (error) {
			console.error("❌ Data handler initialization failed:", error.message);
			this.lastError = error;

			// Retry initialization if max retries not exceeded
			if (this.initializationAttempts < this.config.maxRetries) {
				console.log(`⏳ Retrying initialization in ${this.config.retryDelay}ms...`);
				setTimeout(() => {
					this.initializeDataSources();
				}, this.config.retryDelay);
			} else {
				throw new Error(
					`Data handler initialization failed after ${this.config.maxRetries} attempts`,
				);
			}
		}
	}

	/**
	 * Initialize Angel One API
	 */
	async initializeAngelOne() {
		try {
			console.log("📡 Initializing Angel One API...");

			this.angelOneAPI = new AngelOneAPI({
				...this.config.angelOneConfig,
				redisManager: this.config.redisManager,
			});

			// Check if Angel One credentials are available
			if (!this.angelOneAPI.hasValidCredentials()) {
				console.log("⚠️  Angel One credentials not configured");
				this.angelOneAvailable = false;
				return;
			}

			// Test Angel One connectivity (optional auth test)
			if (this.config.environment === "production") {
				console.log("🔐 Testing Angel One authentication...");
				await this.angelOneAPI.authenticate();
				console.log("✅ Angel One authentication successful");
			}

			this.angelOneAvailable = true;
			console.log("✅ Angel One API initialized successfully");
		} catch (error) {
			console.error("❌ Angel One initialization failed:", error.message);
			this.angelOneAvailable = false;
			this.lastError = error;
		}
	}

	/**
	 * Initialize fake data generator
	 */
	async initializeFakeData() {
		try {
			console.log("🎲 Initializing fake data generator...");

			this.fakeDataGenerator = new FakeDataGenerator(this.config.fakeDataConfig);

			// Test fake data generation
			const testData = this.fakeDataGenerator.generateStockData(["AAPL", "GOOGL", "MSFT"]);
			if (testData && testData.length > 0) {
				this.fakeDataAvailable = true;
				console.log("✅ Fake data generator initialized successfully");
			} else {
				throw new Error("Fake data generator test failed");
			}
		} catch (error) {
			console.error("❌ Fake data initialization failed:", error.message);
			this.fakeDataAvailable = false;
			this.lastError = error;
		}
	}

	/**
	 * Select the appropriate data source based on configuration and availability
	 */
	async selectDataSource() {
		// Force mode overrides everything
		if (this.config.forceMode) {
			switch (this.config.forceMode) {
				case "angel-one":
					if (this.angelOneAvailable) {
						this.activeDataSource = "angel-one";
						console.log("🔒 Forced to use Angel One API");
					} else {
						throw new Error("Angel One API forced but not available");
					}
					break;
				case "fake":
					if (this.fakeDataAvailable) {
						this.activeDataSource = "fake";
						console.log("🔒 Forced to use fake data");
					} else {
						throw new Error("Fake data forced but not available");
					}
					break;
				default:
					throw new Error(`Invalid force mode: ${this.config.forceMode}`);
			}
			return;
		}

		// Environment-based selection
		switch (this.config.environment) {
			case "production":
				// Production: prefer Angel One, fallback to fake if allowed
				if (this.angelOneAvailable) {
					this.activeDataSource = "angel-one";
					console.log("🚀 Production mode: using Angel One API");
				} else if (this.fakeDataAvailable && this.config.fallbackToFake) {
					this.activeDataSource = "fake";
					console.log(
						"⚠️  Production mode: Angel One unavailable, falling back to fake data",
					);
				} else {
					throw new Error("No data source available for production");
				}
				break;

			case "development":
			case "test":
				// Development: prefer Angel One if configured, fallback to fake
				if (this.angelOneAvailable) {
					this.activeDataSource = "angel-one";
					console.log("🧪 Development mode: using Angel One API");
				} else if (this.fakeDataAvailable) {
					this.activeDataSource = "fake";
					console.log("🎲 Development mode: using fake data (Angel One not configured)");
				} else {
					throw new Error("No data source available for development");
				}
				break;

			default:
				throw new Error(`Unknown environment: ${this.config.environment}`);
		}
	}

	/**
	 * Fetch stock quotes using active data source
	 */
	async fetchStockQuotes(symbols) {
		if (!this.activeDataSource) {
			throw new Error("No active data source - initialization may have failed");
		}

		try {
			switch (this.activeDataSource) {
				case "angel-one":
					return await this.fetchFromAngelOne(symbols);
				case "fake":
					return await this.fetchFromFakeData(symbols);
				default:
					throw new Error(`Unknown data source: ${this.activeDataSource}`);
			}
		} catch (error) {
			console.error(`❌ Error fetching from ${this.activeDataSource}:`, error.message);

			// Attempt fallback if configured and available
			if (
				this.config.fallbackToFake &&
				this.activeDataSource !== "fake" &&
				this.fakeDataAvailable
			) {
				console.log("🔄 Attempting fallback to fake data...");
				return await this.fetchFromFakeData(symbols);
			}

			throw error;
		}
	}

	/**
	 * Fetch data from Angel One API
	 */
	async fetchFromAngelOne(symbols) {
		if (!this.angelOneAPI) {
			throw new Error("Angel One API not initialized");
		}

		console.log(`📡 Fetching ${symbols.length} symbols from Angel One API`);

		const result = await this.angelOneAPI.fetchStockQuotes(symbols);

		if (!result.success) {
			throw new Error(result.error || "Angel One API request failed");
		}

		// Transform to unified format
		return {
			success: true,
			dataSource: "angel-one",
			data: result.data,
			stats: result.stats,
			timestamp: Date.now(),
		};
	}

	/**
	 * Fetch data from fake data generator
	 */
	async fetchFromFakeData(symbols) {
		if (!this.fakeDataGenerator) {
			throw new Error("Fake data generator not initialized");
		}

		console.log(`🎲 Generating fake data for ${symbols.length} symbols`);

		const data = this.fakeDataGenerator.generateStockData(symbols);

		return {
			success: true,
			dataSource: "fake",
			data: {
				fetched: data,
				unfetched: [],
			},
			stats: {
				requested: symbols.length,
				fetched: data.length,
				unfetched: 0,
			},
			timestamp: Date.now(),
		};
	}

	/**
	 * Get status of data handler and sources
	 */
	getStatus() {
		return {
			environment: this.config.environment,
			activeDataSource: this.activeDataSource,
			initializationAttempts: this.initializationAttempts,
			lastError: this.lastError?.message || null,

			// Source availability
			sources: {
				angelOne: {
					available: this.angelOneAvailable,
					hasCredentials: this.angelOneAPI?.hasValidCredentials() || false,
					symbolMasterStats: this.angelOneAPI?.getSymbolMasterStats() || null,
				},
				fakeData: {
					available: this.fakeDataAvailable,
				},
			},

			// Configuration
			config: {
				enableAngelOne: this.config.enableAngelOne,
				enableFakeData: this.config.enableFakeData,
				fallbackToFake: this.config.fallbackToFake,
				forceMode: this.config.forceMode,
			},
		};
	}

	/**
	 * Get Angel One specific status
	 */
	getAngelOneStatus() {
		if (!this.angelOneAPI) {
			return { available: false, error: "Not initialized" };
		}

		return {
			available: this.angelOneAvailable,
			...this.angelOneAPI.getAuthStatus(),
			symbolMasterStats: this.angelOneAPI.getSymbolMasterStats(),
		};
	}

	/**
	 * Force refresh of data sources
	 */
	async refreshDataSources() {
		console.log("🔄 Refreshing data sources...");

		// Reset state
		this.activeDataSource = null;
		this.lastError = null;
		this.angelOneAvailable = false;
		this.fakeDataAvailable = false;

		// Re-initialize
		await this.initializeDataSources();
	}

	/**
	 * Switch data source (admin function)
	 */
	async switchDataSource(newSource) {
		console.log(`🔄 Switching data source to: ${newSource}`);

		switch (newSource) {
			case "angel-one":
				if (!this.angelOneAvailable) {
					throw new Error("Angel One API not available");
				}
				this.activeDataSource = "angel-one";
				break;
			case "fake":
				if (!this.fakeDataAvailable) {
					throw new Error("Fake data generator not available");
				}
				this.activeDataSource = "fake";
				break;
			default:
				throw new Error(`Invalid data source: ${newSource}`);
		}

		console.log(`✅ Switched to ${newSource} data source`);
	}

	/**
	 * Log initialization status
	 */
	logInitializationStatus() {
		console.log(`
┌─────────────────────────────────────────────────────────────┐
│                  DATA HANDLER INITIALIZED                   │
├─────────────────────────────────────────────────────────────┤
│ Environment:     ${this.config.environment.padEnd(43)} │
│ Active Source:   ${(this.activeDataSource || "none").padEnd(43)} │
│ Angel One:       ${(this.angelOneAvailable ? "✅ Available" : "❌ Unavailable").padEnd(43)} │
│ Fake Data:       ${(this.fakeDataAvailable ? "✅ Available" : "❌ Unavailable").padEnd(43)} │
│ Fallback Enabled: ${(this.config.fallbackToFake ? "✅ Yes" : "❌ No").padEnd(42)} │
└─────────────────────────────────────────────────────────────┘`);
	}

	/**
	 * Cleanup resources
	 */
	cleanup() {
		console.log("🧹 Cleaning up data handler...");

		if (this.angelOneAPI) {
			// Cleanup Angel One API if needed
		}

		if (this.fakeDataGenerator) {
			// Cleanup fake data generator if needed
		}

		this.activeDataSource = null;
	}
}

module.exports = UnifiedDataHandler;
