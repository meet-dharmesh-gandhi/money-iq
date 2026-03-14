// Types specific to the WebSocket server implementation
// These are used for server-side logic and not exposed to client

export interface ServerClientData {
	symbols: Set<string>;
	id: string;
}

export interface SymbolErrorInfo {
	count: number;
	lastError: string | null;
	blacklistedUntil: number;
}

export interface CacheData {
	exchange: string;
	tradingSymbol: string;
	symbolToken: string;
	ltp: number;
	percentChange: number;
	volume: number;
	timestamp: number;
}

export interface AngelOneQuoteRequest {
	mode: string;
	exchangeTokens: {
		[exchange: string]: string[];
	};
}

export interface AngelOneQuoteResponse {
	status: boolean;
	message: string;
	data: {
		fetched: CacheData[];
		unfetched: string[];
	};
}

export interface AuthenticationResponse {
	status: boolean;
	message: string;
	data?: {
		jwtToken: string;
		refreshToken: string;
		feedToken: string;
	};
}

export interface RateLimitState {
	window: number;
	requests: number[];
}

export interface LockCheck {
	needsRefresh: boolean;
	lockAcquired: boolean;
}
