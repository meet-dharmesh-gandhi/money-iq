export type AngelOneQuoteRequest = {
	mode: "FULL" | "LTP";
	exchangeTokens: Record<string, string[]>;
};

export type AngelOneQuote = {
	exchange: string;
	tradingSymbol: string;
	symbolToken: string;
	ltp: number;
	open?: number;
	high?: number;
	low?: number;
	close?: number;
	lastTradeQty?: number;
	exchFeedTime?: string;
	exchTradeTime?: string;
	netChange?: number;
	percentChange?: number;
	avgPrice?: number;
	tradeVolume?: number;
	opnInterest?: number;
	lowerCircuit?: number;
	upperCircuit?: number;
	"52WeekLow"?: number;
	"52WeekHigh"?: number;
};

export type AngelOneQuoteResponse = {
	status: boolean;
	message: string;
	errorcode: string;
	data: {
		fetched: AngelOneQuote[];
		unfetched: string[];
	};
};
