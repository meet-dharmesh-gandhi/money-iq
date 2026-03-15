// ===========================================
// WEBSOCKET MESSAGE TYPES
// ===========================================

/**
 * All possible WebSocket message types for client-server communication
 */
export const MESSAGE_TYPES = {
	// Client to Server
	PING: "PING",
	SUBSCRIBE: "SUBSCRIBE",
	UNSUBSCRIBE: "UNSUBSCRIBE",

	// Server to Client
	CONNECTED: "CONNECTED",
	PONG: "PONG",
	STOCK_UPDATE: "STOCK_UPDATE",
	IPO_UPDATE: "IPO_UPDATE",
	ERROR: "ERROR",
	SERVER_SHUTDOWN: "SERVER_SHUTDOWN",
	SUBSCRIPTION_ACK: "SUBSCRIPTION_ACK",
	UNSUBSCRIBE_ACK: "UNSUBSCRIBE_ACK",
	SYMBOL_ERROR: "SYMBOL_ERROR",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

/**
 * Base WebSocket message structure
 */
export interface BaseMessage {
	type: MessageType;
	timestamp: number;
	data?: any;
}

/**
 * Client subscription message
 */
export interface SubscriptionMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.SUBSCRIBE;
	symbols: string[];
}

/**
 * Server acknowledgment message
 */
export interface SubscriptionAckMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.SUBSCRIPTION_ACK;
	data: {
		symbols: string[];
		count: number;
	};
}

/**
 * Stock price update message
 */
export interface StockUpdateMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.STOCK_UPDATE;
	data: StockPriceData;
}

/**
 * Error message
 */
export interface ErrorMessage extends BaseMessage {
	type: typeof MESSAGE_TYPES.ERROR;
	data: {
		message: string;
		code?: string;
	};
}

// ===========================================
// STOCK DATA TYPES
// ===========================================

/**
 * Stock price data structure
 */
export interface StockPriceData {
	symbol: string;
	ltp: number; // Last traded price
	percentChange: number;
	volume: number;
	exchange: string;
	tradingSymbol: string;
	symbolToken: string;
	timestamp: number;
}

/**
 * Stock symbol validation result
 */
export interface SymbolValidation {
	valid: string[];
	invalid: string[];
	count: number;
}

// ===========================================
// CLIENT MANAGEMENT TYPES
// ===========================================

/**
 * Connected client data
 */
export interface ClientData {
	id: string;
	connectedAt: number;
	lastActivity: number;
	subscriptions: Set<string>;
	ipAddress?: string;
}

/**
 * Client statistics
 */
export interface ClientStats {
	totalClients: number;
	activeClients: number;
	totalSubscriptions: number;
	topSymbols: string[];
}

// ===========================================
// ERROR HANDLING TYPES
// ===========================================

/**
 * Symbol error tracking information
 */
export interface SymbolErrorInfo {
	count: number;
	lastError: string | null;
	blacklistedUntil: number;
	firstError: number;
}

/**
 * Server error codes
 */
export const ERROR_CODES = {
	INVALID_MESSAGE: "INVALID_MESSAGE",
	INVALID_SYMBOLS: "INVALID_SYMBOLS",
	SUBSCRIPTION_FAILED: "SUBSCRIPTION_FAILED",
	API_ERROR: "API_ERROR",
	RATE_LIMITED: "RATE_LIMITED",
	AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
	INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ===========================================
// CONFIGURATION TYPES
// ===========================================

/**
 * Server configuration
 */
export interface ServerConfig {
	port: number;
	environment: "development" | "production";
	cacheConfig: CacheConfig;
	rateLimiting: RateLimitConfig;
	angelOneConfig: AngelOneConfig;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
	ttl: number; // Time to live in milliseconds
	lockTimeout: number;
	redisUrl: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
	windowMs: number;
	maxRequests: number;
	blacklistThreshold: number;
	blacklistDuration: number;
}

/**
 * Angel One API configuration
 */
export interface AngelOneConfig {
	loginUrl: string;
	quoteUrl: string;
	maxSymbolsPerRequest: number;
	credentials: {
		userId: string;
		password: string;
		totpSecret: string;
		clientLocalIP: string;
		clientPublicIP: string;
		macAddress: string;
		userType: string;
		sourceId: string;
	};
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

/**
 * Angel One API quote request
 */
export interface AngelOneQuoteRequest {
	mode: "FULL" | "OHLC" | "LTP";
	exchangeTokens: {
		[exchange: string]: string[];
	};
}

/**
 * Angel One API quote response
 */
export interface AngelOneQuoteResponse {
	status: boolean;
	message: string;
	data: {
		fetched: StockPriceData[];
		unfetched: string[];
	};
}

/**
 * Angel One authentication response
 */
export interface AngelOneAuthResponse {
	status: boolean;
	message: string;
	data?: {
		jwtToken: string;
		refreshToken: string;
		feedToken: string;
	};
}
