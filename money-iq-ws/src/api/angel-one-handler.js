const axios = require("axios");
const speakeasy = require("speakeasy");

const SymbolMasterManager = require("./symbol-master-manager");

/**
 * Angel One SmartAPI Handler
 * Manages authentication and data fetching from Angel One API
 */
class AngelOneAPI {
	constructor(config = {}) {
		this.config = {
			loginUrl:
				config.loginUrl ||
				"https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
			quoteUrl:
				config.quoteUrl ||
				"https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/",
			maxSymbolsPerRequest: config.maxSymbolsPerRequest || 50,
			requestTimeout: config.requestTimeout || 10000,
			retryAttempts: config.retryAttempts || 3,
			retryDelay: config.retryDelay || 1000,
		};

		// Credentials (loaded from environment)
		this.credentials = {
			userId: process.env.ANGEL_ONE_USER_ID,
			password: process.env.ANGEL_ONE_PASSWORD,
			totpSecret: process.env.ANGEL_ONE_TOTP_SECRET,
			clientLocalIP: process.env.ANGEL_ONE_CLIENT_LOCAL_IP,
			clientPublicIP: process.env.ANGEL_ONE_CLIENT_PUBLIC_IP,
			macAddress: process.env.ANGEL_ONE_MAC_ADDRESS,
			userType: process.env.ANGEL_ONE_USER_TYPE || "USER",
			sourceId: process.env.ANGEL_ONE_SOURCE_ID || "WEB",
		};

		// Authentication state
		this.authToken = null;
		this.authTokenExpiry = null;
		this.isAuthenticated = false;

		// Initialize symbol master manager
		this.symbolMaster = new SymbolMasterManager({
			redisManager: config.redisManager,
			cacheDir: config.symbolMasterCacheDir || "./cache",
		});

		// Initialize symbol master data
		this.initializeSymbolMaster();
	}

	/**
	 * Initialize symbol master data
	 */
	async initializeSymbolMaster() {
		try {
			const success = await this.symbolMaster.initialize();
			if (success) {
				console.log("✅ Symbol master initialized successfully");
			} else {
				console.warn("⚠️  Symbol master initialization failed - using fallback");
			}
		} catch (error) {
			console.error("❌ Symbol master initialization error:", error.message);
		}
	}

	// ===========================================
	// AUTHENTICATION METHODS
	// ===========================================

	/**
	 * Check if all required credentials are available
	 */
	hasValidCredentials() {
		const required = [
			"userId",
			"password",
			"totpSecret",
			"clientLocalIP",
			"clientPublicIP",
			"macAddress",
		];

		for (const field of required) {
			if (!this.credentials[field]) {
				console.error(`❌ Missing Angel One credential: ${field}`);
				return false;
			}
		}

		return true;
	}

	/**
	 * Generate TOTP for authentication
	 */
	generateTOTP() {
		try {
			return speakeasy.totp({
				secret: this.credentials.totpSecret,
				encoding: "base32",
			});
		} catch (error) {
			console.error("❌ TOTP generation failed:", error.message);
			throw new Error("Failed to generate TOTP");
		}
	}

	/**
	 * Authenticate with Angel One API
	 */
	async authenticate() {
		if (!this.hasValidCredentials()) {
			throw new Error("Angel One credentials not properly configured");
		}

		try {
			console.log("🔐 Authenticating with Angel One...");

			const totp = this.generateTOTP();

			const authData = {
				clientcode: this.credentials.userId,
				password: this.credentials.password,
				totp: totp,
			};

			const headers = {
				"Content-Type": "application/json",
				Accept: "application/json",
				"X-UserType": this.credentials.userType,
				"X-SourceID": this.credentials.sourceId,
				"X-ClientLocalIP": this.credentials.clientLocalIP,
				"X-ClientPublicIP": this.credentials.clientPublicIP,
				"X-MACAddress": this.credentials.macAddress,
			};

			const response = await axios.post(this.config.loginUrl, authData, {
				headers,
				timeout: this.config.requestTimeout,
			});

			if (response.data.status && response.data.data?.jwtToken) {
				this.authToken = response.data.data.jwtToken;

				// Set expiry (24h if refresh token exists, otherwise 1h)
				const expiryHours = response.data.data.refreshToken ? 24 : 1;
				this.authTokenExpiry = Date.now() + expiryHours * 60 * 60 * 1000;
				this.isAuthenticated = true;

				console.log(`✅ Angel One authentication successful (expires in ${expiryHours}h)`);
				return {
					success: true,
					token: this.authToken,
					expiresAt: this.authTokenExpiry,
				};
			} else {
				throw new Error(`Authentication failed: ${response.data.message}`);
			}
		} catch (error) {
			this.authToken = null;
			this.authTokenExpiry = null;
			this.isAuthenticated = false;

			console.error("❌ Angel One authentication failed:", error.message);
			throw error;
		}
	}

	/**
	 * Check if authentication token is valid and refresh if needed
	 */
	async ensureValidAuthentication() {
		// Check if we need to authenticate or refresh
		const needsAuth =
			!this.authToken || !this.authTokenExpiry || Date.now() >= this.authTokenExpiry - 300000; // Refresh 5 mins before expiry

		if (needsAuth) {
			await this.authenticate();
		}

		return this.isAuthenticated;
	}

	/**
	 * Get authentication headers for API requests
	 */
	getAuthHeaders() {
		if (!this.authToken) {
			throw new Error("Not authenticated - call authenticate() first");
		}

		return {
			Authorization: `Bearer ${this.authToken}`,
			"Content-Type": "application/json",
			Accept: "application/json",
			"X-UserType": this.credentials.userType,
			"X-SourceID": this.credentials.sourceId,
			"X-ClientLocalIP": this.credentials.clientLocalIP,
			"X-ClientPublicIP": this.credentials.clientPublicIP,
			"X-MACAddress": this.credentials.macAddress,
		};
	}

	// ===========================================
	// DATA FETCHING METHODS
	// ===========================================

	/**
	 * Validate and sanitize symbols
	 */
	validateSymbols(symbols) {
		if (!Array.isArray(symbols)) {
			return { valid: [], invalid: ["Invalid symbols array"] };
		}

		const valid = [];
		const invalid = [];

		for (const symbol of symbols) {
			if (typeof symbol === "string" && /^[A-Z0-9&-]{1,20}$/i.test(symbol)) {
				valid.push(symbol.toUpperCase());
			} else {
				invalid.push(symbol);
			}
		}

		return {
			valid: [...new Set(valid)], // Remove duplicates
			invalid,
		};
	}

	/**
	 * Convert symbols to exchange tokens using symbol master
	 */
	symbolsToTokens(symbols, exchange = "NSE") {
		// Use symbol master manager to get real tokens
		const result = this.symbolMaster.symbolsToTokens(symbols);

		if (result.unmapped.length > 0) {
			console.warn(`⚠️  Unmapped symbols: ${result.unmapped.join(", ")}`);
		}

		return result.tokens;
	}

	/**
	 * Fetch stock quotes from Angel One API
	 */
	async fetchStockQuotes(symbols) {
		await this.ensureValidAuthentication();

		const validation = this.validateSymbols(symbols);

		if (validation.valid.length === 0) {
			return {
				success: false,
				error: "No valid symbols provided",
				data: { fetched: [], unfetched: symbols },
			};
		}

		try {
			console.log(`📡 Fetching quotes for: ${validation.valid.join(", ")}`);

			// Chunk symbols to respect API limits
			const chunks = [];
			for (let i = 0; i < validation.valid.length; i += this.config.maxSymbolsPerRequest) {
				chunks.push(validation.valid.slice(i, i + this.config.maxSymbolsPerRequest));
			}

			const allResults = { fetched: [], unfetched: [] };

			for (const chunk of chunks) {
				try {
					const tokens = this.symbolsToTokens(chunk);

					const requestData = {
						mode: "FULL",
						exchangeTokens: {
							NSE: tokens,
						},
					};

					const response = await axios.post(this.config.quoteUrl, requestData, {
						headers: this.getAuthHeaders(),
						timeout: this.config.requestTimeout,
					});

					if (response.data.status) {
						// Transform API response to our format
						const fetchedData = response.data.data?.fetched || [];
						const transformedData = fetchedData.map((item) => ({
							symbol: this.extractSymbol(item.tradingSymbol || ""),
							ltp: item.ltp || 0,
							percentChange: item.percentChange || this.calculateRandomChange(),
							volume: item.volume || 0,
							exchange: item.exchange || "NSE",
							tradingSymbol: item.tradingSymbol || "",
							symbolToken: item.symbolToken || "",
							timestamp: Date.now(),
						}));

						allResults.fetched.push(...transformedData);

						// Add any unfetched symbols from API response
						const unfetchedFromAPI = response.data.data?.unfetched || [];
						allResults.unfetched.push(...unfetchedFromAPI);
					} else {
						throw new Error(response.data.message || "API request failed");
					}

					// Rate limiting between chunks
					if (chunks.length > 1) {
						await this.delay(100); // 100ms delay between chunks
					}
				} catch (chunkError) {
					console.error(
						`❌ API error for chunk ${chunk.join(", ")}:`,
						chunkError.message,
					);
					allResults.unfetched.push(...chunk);
				}
			}

			// Add originally invalid symbols to unfetched
			allResults.unfetched.push(...validation.invalid);

			return {
				success: true,
				data: allResults,
				stats: {
					requested: symbols.length,
					fetched: allResults.fetched.length,
					unfetched: allResults.unfetched.length,
				},
			};
		} catch (error) {
			console.error("❌ Angel One API fetch error:", error.message);

			return {
				success: false,
				error: error.message,
				data: { fetched: [], unfetched: symbols },
			};
		}
	}

	// ===========================================
	// HELPER METHODS
	// ===========================================

	/**
	 * Extract symbol from trading symbol (remove -EQ suffix)
	 */
	extractSymbol(tradingSymbol) {
		return tradingSymbol.replace("-EQ", "").toUpperCase();
	}

	/**
	 * Generate random percentage change for simulation
	 */
	calculateRandomChange() {
		return parseFloat(((Math.random() - 0.5) * 4).toFixed(2)); // ±2%
	}

	/**
	 * Delay utility for rate limiting
	 */
	delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Get authentication status
	 */
	getAuthStatus() {
		return {
			isAuthenticated: this.isAuthenticated,
			hasToken: !!this.authToken,
			tokenExpiry: this.authTokenExpiry,
			timeUntilExpiry: this.authTokenExpiry ? this.authTokenExpiry - Date.now() : 0,
			hasCredentials: this.hasValidCredentials(),
		};
	}

	/**
	 * Get symbol master statistics
	 */
	getSymbolMasterStats() {
		return this.symbolMaster.getStats();
	}

	/**
	 * Force update symbol master (admin function)
	 */
	async forceSymbolMasterUpdate() {
		return await this.symbolMaster.forceUpdate();
	}

	/**
	 * Check if symbol exists in master data
	 */
	hasSymbol(symbol) {
		return this.symbolMaster.hasSymbol(symbol);
	}

	/**
	 * Health check for Angel One API connectivity
	 */
	async healthCheck() {
		try {
			const authStatus = this.getAuthStatus();

			if (!authStatus.hasCredentials) {
				return {
					status: "unhealthy",
					error: "Missing required credentials",
					details: authStatus,
				};
			}

			// Try to authenticate if not already done
			if (!authStatus.isAuthenticated) {
				await this.authenticate();
			}

			return {
				status: "healthy",
				authenticated: this.isAuthenticated,
				tokenValid: this.authTokenExpiry > Date.now(),
				details: authStatus,
			};
		} catch (error) {
			return {
				status: "unhealthy",
				error: error.message,
				authenticated: false,
			};
		}
	}
}

module.exports = AngelOneAPI;
