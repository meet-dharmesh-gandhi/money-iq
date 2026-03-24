export type WebSocketMessageType =
	| "STOCK_UPDATE"
	| "IPO_UPDATE"
	| "HISTORICAL_BATCH"
	| "CONNECTED"
	| "PONG"
	| "ERROR"
	| "UNSUBSCRIBE"
	| "SUBSCRIBE"
	| "PING"
	| "SERVER_SHUTDOWN";

export interface WebSocketSubscription {
	mode?: "stocks" | "ipos" | "mutual-funds";
	section?: "stocks" | "ipos" | "mutual-funds";
	symbols?: string[];
	ipoIds?: string[];
	subscriptions?: string[];
}

export interface WebSocketMessage {
	type: WebSocketMessageType;
	subscription?: WebSocketSubscription;
	mode?: "stocks" | "ipos" | "mutual-funds";
	section?: "stocks" | "ipos" | "mutual-funds";
	symbols?: string[];
	ipoIds?: string[];
	subscriptions?: string[];
	data?: unknown;
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
	name: string;
	stage: "Open" | "Upcoming" | "Listing";
	sourceTag: "Current" | "Upcoming";
	priceBand: string;
	closesOn: string;
	lotSize: number;
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
