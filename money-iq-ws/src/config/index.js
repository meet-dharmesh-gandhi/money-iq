/**
 * Configuration Management for WebSocket Server
 * Centralizes all configuration options with environment-based overrides
 */
require("dotenv").config();

/**
 * Get environment variable with fallback
 */
function getEnvVar(key, fallback = undefined, type = "string") {
	const value = process.env[key];

	if (value === undefined) {
		return fallback;
	}

	switch (type) {
		case "number":
			return parseInt(value, 10) || fallback;
		case "boolean":
			return value.toLowerCase() === "true";
		case "json":
			try {
				return JSON.parse(value);
			} catch {
				return fallback;
			}
		default:
			return value;
	}
}

/**
 * WebSocket Server Configuration
 */
const serverConfig = {
	port: getEnvVar("WS_PORT", 8080, "number"),
	host: getEnvVar("WS_HOST", "0.0.0.0"),
	maxClients: getEnvVar("WS_MAX_CLIENTS", 1000, "number"),
	heartbeatInterval: getEnvVar("WS_HEARTBEAT_INTERVAL", 30000, "number"),
	messageRateLimit: getEnvVar("WS_MESSAGE_RATE_LIMIT", 100, "number"),
	maxMessageSize: getEnvVar("WS_MAX_MESSAGE_SIZE", 1024, "number"),
	compressionThreshold: getEnvVar("WS_COMPRESSION_THRESHOLD", 1024, "number"),
	enableCompression: getEnvVar("WS_ENABLE_COMPRESSION", true, "boolean"),
	enableCORS: getEnvVar("WS_ENABLE_CORS", true, "boolean"),
	allowedOrigins: getEnvVar("WS_ALLOWED_ORIGINS", "", "string").split(",").filter(Boolean),
	enableLogging: getEnvVar("WS_ENABLE_LOGGING", true, "boolean"),
	logLevel: getEnvVar("WS_LOG_LEVEL", "info"),
	shutdownTimeout: getEnvVar("WS_SHUTDOWN_TIMEOUT", 10000, "number"),
};

/**
 * Redis Configuration
 */
const redisConfig = {
	enabled: getEnvVar("REDIS_ENABLED", true, "boolean"),
	host: getEnvVar("REDIS_HOST", "localhost"),
	port: getEnvVar("REDIS_PORT", 6379, "number"),
	password: getEnvVar("REDIS_PASSWORD", ""),
	database: getEnvVar("REDIS_DATABASE", 0, "number"),
	keyPrefix: getEnvVar("REDIS_KEY_PREFIX", "moneyiq:"),
	connectTimeout: getEnvVar("REDIS_CONNECT_TIMEOUT", 10000, "number"),
	commandTimeout: getEnvVar("REDIS_COMMAND_TIMEOUT", 5000, "number"),
	retryAttempts: getEnvVar("REDIS_RETRY_ATTEMPTS", 3, "number"),
	retryDelay: getEnvVar("REDIS_RETRY_DELAY", 100, "number"),
	maxRetryDelay: getEnvVar("REDIS_MAX_RETRY_DELAY", 3000, "number"),

	// Cache settings
	defaultTTL: getEnvVar("REDIS_DEFAULT_TTL", 300, "number"), // 5 minutes
	maxTTL: getEnvVar("REDIS_MAX_TTL", 3600, "number"), // 1 hour
	stockDataTTL: getEnvVar("REDIS_STOCK_TTL", 60, "number"), // 1 minute
	lockTTL: getEnvVar("REDIS_LOCK_TTL", 30000, "number"), // 30 seconds

	// Cleanup settings
	enableCleanup: getEnvVar("REDIS_ENABLE_CLEANUP", true, "boolean"),
	cleanupInterval: getEnvVar("REDIS_CLEANUP_INTERVAL", 300000, "number"), // 5 minutes
	maxMemoryPolicy: getEnvVar("REDIS_MAX_MEMORY_POLICY", "allkeys-lru"),
};

/**
 * Angel One API Configuration
 */
const angelOneConfig = {
	enabled: getEnvVar("ANGEL_ONE_ENABLED", false, "boolean"),
	useSimulation: getEnvVar("ANGEL_ONE_USE_SIMULATION", true, "boolean"),

	// API URLs
	loginUrl: getEnvVar(
		"ANGEL_ONE_LOGIN_URL",
		"https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
	),
	quoteUrl: getEnvVar(
		"ANGEL_ONE_QUOTE_URL",
		"https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/",
	),

	// Request limits
	maxSymbolsPerRequest: getEnvVar("ANGEL_ONE_MAX_SYMBOLS", 50, "number"),
	requestTimeout: getEnvVar("ANGEL_ONE_REQUEST_TIMEOUT", 10000, "number"),
	retryAttempts: getEnvVar("ANGEL_ONE_RETRY_ATTEMPTS", 3, "number"),
	retryDelay: getEnvVar("ANGEL_ONE_RETRY_DELAY", 1000, "number"),
	rateLimitDelay: getEnvVar("ANGEL_ONE_RATE_LIMIT_DELAY", 100, "number"),

	// Authentication refresh settings
	tokenRefreshThreshold: getEnvVar("ANGEL_ONE_TOKEN_REFRESH_THRESHOLD", 300000, "number"), // 5 minutes
	maxAuthRetries: getEnvVar("ANGEL_ONE_MAX_AUTH_RETRIES", 3, "number"),

	// Credentials (loaded in the handler)
	credentials: {
		userId: getEnvVar("ANGEL_ONE_USER_ID"),
		password: getEnvVar("ANGEL_ONE_PASSWORD"),
		totpSecret: getEnvVar("ANGEL_ONE_TOTP_SECRET"),
		clientLocalIP: getEnvVar("ANGEL_ONE_CLIENT_LOCAL_IP"),
		clientPublicIP: getEnvVar("ANGEL_ONE_CLIENT_PUBLIC_IP"),
		macAddress: getEnvVar("ANGEL_ONE_MAC_ADDRESS"),
		userType: getEnvVar("ANGEL_ONE_USER_TYPE", "USER"),
		sourceId: getEnvVar("ANGEL_ONE_SOURCE_ID", "WEB"),
	},
};

/**
 * Stock Data Configuration
 */
const stockConfig = {
	// Update intervals
	updateInterval: getEnvVar("STOCK_UPDATE_INTERVAL", 5000, "number"), // 5 seconds
	marketHoursUpdateInterval: getEnvVar("STOCK_MARKET_HOURS_INTERVAL", 1000, "number"), // 1 second
	afterHoursUpdateInterval: getEnvVar("STOCK_AFTER_HOURS_INTERVAL", 30000, "number"), // 30 seconds

	// Market hours (IST)
	marketOpenHour: getEnvVar("STOCK_MARKET_OPEN_HOUR", 9, "number"),
	marketOpenMinute: getEnvVar("STOCK_MARKET_OPEN_MINUTE", 15, "number"),
	marketCloseHour: getEnvVar("STOCK_MARKET_CLOSE_HOUR", 15, "number"),
	marketCloseMinute: getEnvVar("STOCK_MARKET_CLOSE_MINUTE", 30, "number"),

	// Default symbols to track
	defaultSymbols: getEnvVar("STOCK_DEFAULT_SYMBOLS", "RELIANCE,TCS,INFY,HDFC,ICICIBANK", "string")
		.split(",")
		.filter(Boolean),
	maxSymbolsPerClient: getEnvVar("STOCK_MAX_SYMBOLS_PER_CLIENT", 50, "number"),
	maxTotalSymbols: getEnvVar("STOCK_MAX_TOTAL_SYMBOLS", 500, "number"),

	// Data validation
	maxPriceChangePercent: getEnvVar("STOCK_MAX_PRICE_CHANGE_PERCENT", 20, "number"),
	minValidPrice: getEnvVar("STOCK_MIN_VALID_PRICE", 0.01, "number"),
	maxValidPrice: getEnvVar("STOCK_MAX_VALID_PRICE", 100000, "number"),
};

/**
 * Environment Configuration
 */
const envConfig = {
	environment: getEnvVar("NODE_ENV", "development"),
	isDevelopment: getEnvVar("NODE_ENV", "development") === "development",
	isProduction: getEnvVar("NODE_ENV", "production") === "production",
	isTest: getEnvVar("NODE_ENV", "test") === "test",

	// Debug settings
	enableDebugMode: getEnvVar("DEBUG_MODE", false, "boolean"),
	debugModules: getEnvVar("DEBUG_MODULES", "", "string").split(",").filter(Boolean),

	// Performance monitoring
	enableMetrics: getEnvVar("ENABLE_METRICS", false, "boolean"),
	metricsPort: getEnvVar("METRICS_PORT", 9090, "number"),

	// Health checks
	enableHealthCheck: getEnvVar("ENABLE_HEALTH_CHECK", true, "boolean"),
	healthCheckInterval: getEnvVar("HEALTH_CHECK_INTERVAL", 60000, "number"),
	healthCheckPort: getEnvVar("HEALTH_CHECK_PORT", 8081, "number"),
};

/**
 * Security Configuration
 */
const securityConfig = {
	enableRateLimiting: getEnvVar("SECURITY_ENABLE_RATE_LIMITING", true, "boolean"),
	clientRateLimit: getEnvVar("SECURITY_CLIENT_RATE_LIMIT", 100, "number"), // messages per minute
	globalRateLimit: getEnvVar("SECURITY_GLOBAL_RATE_LIMIT", 10000, "number"), // messages per minute

	enableInputValidation: getEnvVar("SECURITY_ENABLE_INPUT_VALIDATION", true, "boolean"),
	maxMessageLength: getEnvVar("SECURITY_MAX_MESSAGE_LENGTH", 1024, "number"),
	maxSubscriptionsPerClient: getEnvVar("SECURITY_MAX_SUBSCRIPTIONS", 100, "number"),

	enableOriginCheck: getEnvVar("SECURITY_ENABLE_ORIGIN_CHECK", true, "boolean"),
	trustedOrigins: getEnvVar(
		"SECURITY_TRUSTED_ORIGINS",
		"http://localhost:3000,https://localhost:3000",
		"string",
	)
		.split(",")
		.filter(Boolean),

	enableIPWhitelist: getEnvVar("SECURITY_ENABLE_IP_WHITELIST", false, "boolean"),
	whitelistedIPs: getEnvVar("SECURITY_WHITELISTED_IPS", "", "string").split(",").filter(Boolean),
};

/**
 * Logging Configuration
 */
const loggingConfig = {
	level: getEnvVar("LOG_LEVEL", "info"),
	enableConsole: getEnvVar("LOG_ENABLE_CONSOLE", true, "boolean"),
	enableFile: getEnvVar("LOG_ENABLE_FILE", false, "boolean"),
	filePath: getEnvVar("LOG_FILE_PATH", "./logs/stock-server.log"),
	maxFileSize: getEnvVar("LOG_MAX_FILE_SIZE", "10M"),
	maxFiles: getEnvVar("LOG_MAX_FILES", 5, "number"),

	// Structured logging
	enableStructured: getEnvVar("LOG_ENABLE_STRUCTURED", false, "boolean"),
	includeTimestamp: getEnvVar("LOG_INCLUDE_TIMESTAMP", true, "boolean"),
	includeLevel: getEnvVar("LOG_INCLUDE_LEVEL", true, "boolean"),

	// Sensitive data filtering
	enableSanitization: getEnvVar("LOG_ENABLE_SANITIZATION", true, "boolean"),
	sanitizeFields: getEnvVar("LOG_SANITIZE_FIELDS", "password,token,secret,key", "string").split(
		",",
	),
};

/**
 * Complete configuration object
 */
const config = {
	server: serverConfig,
	redis: redisConfig,
	angelOne: angelOneConfig,
	stock: stockConfig,
	environment: envConfig,
	security: securityConfig,
	logging: loggingConfig,
};

/**
 * Validation functions
 */
function validateConfig() {
	const errors = [];

	// Server validation
	if (config.server.port < 1 || config.server.port > 65535) {
		errors.push("Server port must be between 1 and 65535");
	}

	if (config.server.maxClients < 1) {
		errors.push("Max clients must be greater than 0");
	}

	// Redis validation (if enabled)
	if (config.redis.enabled) {
		if (!config.redis.host) {
			errors.push("Redis host is required when Redis is enabled");
		}

		if (config.redis.port < 1 || config.redis.port > 65535) {
			errors.push("Redis port must be between 1 and 65535");
		}
	}

	// Angel One validation (if enabled)
	if (config.angelOne.enabled && !config.angelOne.useSimulation) {
		const requiredCreds = [
			"userId",
			"password",
			"totpSecret",
			"clientLocalIP",
			"clientPublicIP",
			"macAddress",
		];

		for (const cred of requiredCreds) {
			if (!config.angelOne.credentials[cred]) {
				errors.push(`Angel One credential '${cred}' is required when Angel One is enabled`);
			}
		}
	}

	// Stock configuration validation
	if (config.stock.maxSymbolsPerClient < 1) {
		errors.push("Max symbols per client must be greater than 0");
	}

	if (config.stock.maxTotalSymbols < config.stock.maxSymbolsPerClient) {
		errors.push("Max total symbols must be greater than or equal to max symbols per client");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Get configuration summary for logging
 */
function getConfigSummary() {
	return {
		environment: config.environment.environment,
		server: {
			port: config.server.port,
			host: config.server.host,
			maxClients: config.server.maxClients,
		},
		redis: {
			enabled: config.redis.enabled,
			host: config.redis.enabled ? config.redis.host : "disabled",
			port: config.redis.enabled ? config.redis.port : "disabled",
		},
		angelOne: {
			enabled: config.angelOne.enabled,
			simulation: config.angelOne.enabled ? config.angelOne.useSimulation : "disabled",
		},
		security: {
			rateLimiting: config.security.enableRateLimiting,
			originCheck: config.security.enableOriginCheck,
			inputValidation: config.security.enableInputValidation,
		},
	};
}

/**
 * Export configuration and utilities
 */
module.exports = {
	config,
	validateConfig,
	getConfigSummary,
	getEnvVar,
};
