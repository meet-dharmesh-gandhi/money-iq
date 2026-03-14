export type WebSocketMessageType =
	| "SUBSCRIBE"
	| "UNSUBSCRIBE"
	| "STOCK_UPDATE"
	| "IPO_UPDATE"
	| "CONNECTED"
	| "PING"
	| "PONG"
	| "ERROR"
	| "SERVER_SHUTDOWN"
	| "SUBSCRIPTION_ACK"
	| "SYMBOL_ERROR"
	| "HISTORICAL_BATCH";

export interface WebSocketSubscription {
	section?: "stocks" | "ipos" | "mutual-funds";
	symbols?: string[];
	ipoIds?: string[];
}

export interface WebSocketMessage {
	type: WebSocketMessageType;
	subscription?: WebSocketSubscription;
	symbols?: string[];
	data?: any;
	timestamp: number;
}

export interface StockUpdate {
	symbol: string;
	ltp: number;
	percentChange: number;
	volume?: number;
	timestamp: number;
	exchange?: string;
	tradingSymbol?: string;
	symbolToken?: string;
}

export interface IpoUpdate {
	id: string;
	subscription: number;
	timestamp: number;
}

// Historical price data batch
export interface HistoricalBatch {
	symbol: string;
	prices: number[];
	pointCount: number;
	timestamp: number;
}

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";
