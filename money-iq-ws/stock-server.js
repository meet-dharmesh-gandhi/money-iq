/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const { WebSocketServer } = require("ws");

const FakeDataGenerator = require("./src/data/fake-data-generator");
const IpoNseProvider = require("./src/data/ipo-nse-provider");

const fakeDataGenerator = new FakeDataGenerator();
const ipoNseProvider = new IpoNseProvider({
	cacheTtlMs: Number(process.env.IPO_REFRESH_INTERVAL_MS || 5000),
});

const WS_PORT = process.env.PORT || process.env.WS_PORT || 8080;
const ALL_IPOS_TOKEN = "__ALL_IPOS__";
const ALL_STOCKS_TOKEN = "__ALL_STOCKS__";
const REALTIME_STOCK_API_URL = process.env.REALTIME_STOCK_API_URL;

const clients = new Map();
const globalStockSubscriptions = {};
const globalIpoSubscriptions = {};
const stockPriceHistory = new Map();

let stockUpdateInterval = null;
let ipoUpdateInterval = null;
let isStockUpdateInFlight = false;
let lastRealtimeStockSymbols = [];

const STOCK_UPDATE_FREQUENCY = 2000;
const IPO_UPDATE_FREQUENCY = 5000;
const STOCKS_PER_FRONTEND_BATCH = 6;

function generateClientId() {
	return Math.random().toString(36).substring(2, 11);
}

function sendToClient(ws, type, data = null, clientId = "unknown") {
	if (ws.readyState !== ws.OPEN) {
		return false;
	}

	try {
		ws.send(
			JSON.stringify({
				type,
				data,
				timestamp: Date.now(),
			}),
		);
		return true;
	} catch (error) {
		console.error(`Error sending ${type} to client [${clientId}]:`, error.message);
		return false;
	}
}

function incrementCounters(target, values) {
	values.forEach((value) => {
		target[value] = (target[value] || 0) + 1;
	});
}

function decrementCounters(target, values) {
	values.forEach((value) => {
		if (!target[value]) {
			return;
		}
		if (target[value] <= 1) {
			delete target[value];
			return;
		}
		target[value] -= 1;
	});
}

function hasActiveStockSubscriptions() {
	return Object.keys(globalStockSubscriptions).length > 0;
}

function hasActiveIpoSubscriptions() {
	return Object.keys(globalIpoSubscriptions).length > 0;
}

function normalizeSymbol(rawStock) {
	return (
		rawStock?.identifier ||
		rawStock?.Identifier ||
		rawStock?.ScripName ||
		rawStock?.scripName ||
		rawStock?.symbol ||
		rawStock?.Symbol ||
		rawStock?.tradingSymbol ||
		rawStock?.tradingsymbol ||
		rawStock?.ticker ||
		rawStock?.Ticker ||
		rawStock?.securityId ||
		rawStock?.SecurityId ||
		rawStock?.name ||
		rawStock?.Name ||
		null
	);
}

function toComparableSymbol(value) {
	if (!value) {
		return "";
	}

	return String(value)
		.toUpperCase()
		.replace(/\s+/g, "")
		.replace(/-EQ$/i, "")
		.replace(/\.NS$/i, "");
}

function symbolsMatch(left, right) {
	const l = toComparableSymbol(left);
	const r = toComparableSymbol(right);

	if (!l || !r) {
		return false;
	}

	return l === r;
}

function normalizeNumber(value) {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const cleaned = value.replace(/[,%]/g, "").trim();
		if (!cleaned) {
			return null;
		}

		const parsed = Number(cleaned);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return null;
}

function pushPriceHistory(symbol, ltp) {
	if (!symbol || !Number.isFinite(ltp)) {
		return;
	}

	const current = stockPriceHistory.get(symbol) || [];
	current.push(ltp);

	if (current.length > 60) {
		current.splice(0, current.length - 60);
	}

	stockPriceHistory.set(symbol, current);
}

function getLatestHistoricalBatch(symbol) {
	const prices =
		stockPriceHistory.get(symbol) || fakeDataGenerator.priceHistory.get(symbol) || [];
	return {
		symbol,
		prices,
		pointCount: prices.length,
		timestamp: Date.now(),
	};
}

function normalizeRealtimeStock(rawStock) {
	const symbol = normalizeSymbol(rawStock);
	if (!symbol) {
		return null;
	}

	const ltp = normalizeNumber(
		rawStock?.ltp ??
			rawStock?.LTP ??
			rawStock?.lastPrice ??
			rawStock?.LastPrice ??
			rawStock?.price ??
			rawStock?.Price ??
			rawStock?.close ??
			rawStock?.Close ??
			rawStock?.UlaValue,
	);
	if (!Number.isFinite(ltp)) {
		return null;
	}

	const percentChange = normalizeNumber(
		rawStock?.percentChange ??
			rawStock?.PercentChange ??
			rawStock?.changePercent ??
			rawStock?.percentageChange ??
			rawStock?.pChange ??
			rawStock?.PChange,
	);
	const volume = normalizeNumber(
		rawStock?.volume ??
			rawStock?.Volume ??
			rawStock?.totalTradedVolume ??
			rawStock?.TotalTradedVolume ??
			rawStock?.tradeVolume ??
			rawStock?.TradeVolume ??
			rawStock?.vol,
	);

	return {
		symbol,
		ltp,
		percentChange: Number.isFinite(percentChange) ? percentChange : 0,
		volume: Number.isFinite(volume) ? volume : undefined,
		timestamp: Date.now(),
		exchange: rawStock?.exchange || rawStock?.Exchange || rawStock?.segment || "NSE",
		tradingSymbol:
			rawStock?.tradingSymbol ||
			rawStock?.tradingsymbol ||
			rawStock?.ScripName ||
			rawStock?.scripName ||
			symbol,
		symbolToken:
			rawStock?.symbolToken ||
			rawStock?.SymbolToken ||
			rawStock?.identifier ||
			rawStock?.Identifier ||
			rawStock?.token ||
			rawStock?.Token ||
			rawStock?.securityId ||
			rawStock?.SecurityId ||
			rawStock?.Symbol,
	};
}

function extractStocksArray(payload) {
	if (Array.isArray(payload)) {
		return payload;
	}

	const candidates = [
		payload?.data?.data,
		payload?.data?.stocks,
		payload?.data?.items,
		payload?.data?.results,
		payload?.stocksData,
		payload?.stocks,
		payload?.items,
		payload?.results,
		payload?.data,
	];

	for (const candidate of candidates) {
		if (Array.isArray(candidate)) {
			return candidate;
		}
	}

	return [];
}

function chunkArray(values, chunkSize) {
	if (!Array.isArray(values) || values.length === 0) {
		return [];
	}

	const chunks = [];
	for (let index = 0; index < values.length; index += chunkSize) {
		chunks.push(values.slice(index, index + chunkSize));
	}
	return chunks;
}

async function fetchRealtimeStocks() {
	if (!REALTIME_STOCK_API_URL) {
		throw new Error("REALTIME_STOCK_API_URL is required");
	}

	const requestUrl = new URL(REALTIME_STOCK_API_URL);

	const response = await fetch(requestUrl.toString(), {
		method: "GET",
		headers: {
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`Stock API request failed with status ${response.status}`);
	}

	const payload = await response.json();

	const rawStocks = extractStocksArray(payload);
	if (!Array.isArray(rawStocks) || rawStocks.length === 0) {
		throw new Error("Stock API payload did not contain a stocks array");
	}

	const normalizedStocks = rawStocks
		.map((stock) => normalizeRealtimeStock(stock))
		.filter(Boolean);

	if (normalizedStocks.length === 0) {
		throw new Error("Stock API payload did not contain valid stock records");
	}

	normalizedStocks.forEach((stock) => pushPriceHistory(stock.symbol, stock.ltp));
	lastRealtimeStockSymbols = normalizedStocks.map((stock) => stock.symbol);

	return {
		stocks: normalizedStocks,
	};
}

function startStockUpdates() {
	if (stockUpdateInterval) {
		return;
	}

	stockUpdateInterval = setInterval(async () => {
		if (isStockUpdateInFlight) {
			return;
		}

		if (!hasActiveStockSubscriptions()) {
			stopStockUpdates();
			return;
		}

		isStockUpdateInFlight = true;
		try {
			const symbols = Object.keys(globalStockSubscriptions);
			const fallbackSymbols = symbols.filter((symbol) => symbol !== ALL_STOCKS_TOKEN);
			let latestUpdates = [];

			try {
				const realtimeResult = await fetchRealtimeStocks();
				latestUpdates = realtimeResult.stocks;
			} catch (error) {
				console.error("Stock API update failed, falling back to fake data:", error.message);
				const symbolsForFallback =
					fallbackSymbols.length > 0 ? fallbackSymbols : lastRealtimeStockSymbols;
				const fakeDataResult =
					fakeDataGenerator.generateMultipleSymbolsData(symbolsForFallback);
				if (fakeDataResult.success && fakeDataResult.data.fetched.length > 0) {
					latestUpdates = fakeDataResult.data.fetched;
				}
			}

			if (latestUpdates.length === 0) {
				return;
			}

			const stockChunks = chunkArray(latestUpdates, STOCKS_PER_FRONTEND_BATCH);

			clients.forEach((clientData, ws) => {
				if (clientData.mode !== "stocks" || clientData.subscriptions.size === 0) {
					return;
				}

				const subscriptions = clientData.subscriptions;
				const wantsAllStocks = subscriptions.has(ALL_STOCKS_TOKEN);
				const clientSymbols = Array.from(subscriptions);
				stockChunks.forEach((chunk) => {
					if (wantsAllStocks) {
						sendToClient(ws, "STOCK_UPDATE", chunk, clientData.id);
						return;
					}

					const relevantChunk = chunk
						.map((stock) => {
							const matchedClientSymbol = clientSymbols.find((clientSymbol) =>
								symbolsMatch(clientSymbol, stock.symbol),
							);

							if (!matchedClientSymbol) {
								return null;
							}

							return {
								...stock,
								symbol: matchedClientSymbol,
							};
						})
						.filter(Boolean);

					if (relevantChunk.length > 0) {
						sendToClient(ws, "STOCK_UPDATE", relevantChunk, clientData.id);
					}
				});
			});
		} finally {
			isStockUpdateInFlight = false;
		}
	}, STOCK_UPDATE_FREQUENCY);
}

function stopStockUpdates() {
	if (!stockUpdateInterval) {
		return;
	}

	clearInterval(stockUpdateInterval);
	stockUpdateInterval = null;
	console.log("Stock updates stopped (no active stock subscriptions)");
}

function startIpoUpdates() {
	if (ipoUpdateInterval) {
		return;
	}

	ipoUpdateInterval = setInterval(async () => {
		if (!hasActiveIpoSubscriptions()) {
			stopIpoUpdates();
			return;
		}

		const snapshot = await ipoNseProvider.fetchSnapshot();
		if (!Array.isArray(snapshot) || snapshot.length === 0) {
			return;
		}

		clients.forEach((clientData, ws) => {
			if (clientData.mode !== "ipos" || clientData.subscriptions.size === 0) {
				return;
			}

			const subscriptions = clientData.subscriptions;
			const relevantIpos = subscriptions.has(ALL_IPOS_TOKEN)
				? snapshot
				: snapshot.filter(
						(ipo) => subscriptions.has(ipo.id) || subscriptions.has(ipo.name),
					);

			if (relevantIpos.length > 0) {
				sendToClient(ws, "IPO_UPDATE", relevantIpos, clientData.id);
			}
		});
	}, IPO_UPDATE_FREQUENCY);
}

function stopIpoUpdates() {
	if (!ipoUpdateInterval) {
		return;
	}

	clearInterval(ipoUpdateInterval);
	ipoUpdateInterval = null;
	console.log("IPO updates stopped (no active IPO subscriptions)");
}

function clearClientSubscription(clientData) {
	const previous = Array.from(clientData.subscriptions);
	if (clientData.mode === "stocks") {
		decrementCounters(globalStockSubscriptions, previous);
	} else if (clientData.mode === "ipos") {
		decrementCounters(globalIpoSubscriptions, previous);
	}

	clientData.subscriptions.clear();
	clientData.mode = null;

	if (!hasActiveStockSubscriptions()) {
		stopStockUpdates();
	}
	if (!hasActiveIpoSubscriptions()) {
		stopIpoUpdates();
	}
}

function handleSubscribe(ws, clientData, message) {
	const mode = message.mode || message.section || "stocks";
	const rawSubscriptions = Array.isArray(message.subscriptions)
		? message.subscriptions
		: mode === "ipos"
			? message.ipoIds || []
			: message.symbols || [];

	clearClientSubscription(clientData);

	const nextSubscriptions = Array.from(new Set(rawSubscriptions.filter(Boolean)));
	if (mode === "stocks" && nextSubscriptions.length === 0) {
		nextSubscriptions.push(ALL_STOCKS_TOKEN);
	}

	if (nextSubscriptions.length === 0) {
		sendToClient(ws, "HISTORICAL_BATCH", [], clientData.id);
		return;
	}

	clientData.mode = mode;
	nextSubscriptions.forEach((value) => clientData.subscriptions.add(value));

	if (mode === "ipos") {
		incrementCounters(globalIpoSubscriptions, nextSubscriptions);
		startIpoUpdates();
		return;
	}

	incrementCounters(globalStockSubscriptions, nextSubscriptions);
	startStockUpdates();

	const historicalData = nextSubscriptions.includes(ALL_STOCKS_TOKEN)
		? []
		: nextSubscriptions.map((symbol) => getLatestHistoricalBatch(symbol));
	sendToClient(ws, "HISTORICAL_BATCH", historicalData, clientData.id);
}

function startWebSocketServer() {
	const wss = new WebSocketServer({ port: WS_PORT });

	wss.on("connection", (ws) => {
		const clientId = generateClientId();
		const clientData = {
			id: clientId,
			connectedAt: Date.now(),
			mode: null,
			subscriptions: new Set(),
			lastActivity: Date.now(),
		};

		clients.set(ws, clientData);
		console.log(`Client connected [${clientId}] - Total clients: ${clients.size}`);

		sendToClient(
			ws,
			"CONNECTED",
			{
				message: "Connected to MoneyIQ WebSocket Server",
				clientId,
				environment: process.env.NODE_ENV || "development",
			},
			clientId,
		);

		ws.on("message", (rawData) => {
			clientData.lastActivity = Date.now();
			try {
				const message = JSON.parse(rawData.toString());

				switch (message.type) {
					case "PING":
						sendToClient(ws, "PONG", { clientId }, clientId);
						break;
					case "SUBSCRIBE":
						handleSubscribe(ws, clientData, message);
						break;
					case "UNSUBSCRIBE":
						clearClientSubscription(clientData);
						break;
					default:
						sendToClient(
							ws,
							"ERROR",
							{
								message: `Unknown message type: ${message.type}`,
								supportedTypes: ["PING", "SUBSCRIBE", "UNSUBSCRIBE"],
							},
							clientId,
						);
				}
			} catch (error) {
				sendToClient(
					ws,
					"ERROR",
					{
						message: "Invalid message format",
						error: error.message,
					},
					clientId,
				);
			}
		});

		ws.on("close", () => {
			console.log(`Client disconnected [${clientId}] - Total clients: ${clients.size - 1}`);
			clearClientSubscription(clientData);
			clients.delete(ws);
		});

		ws.on("error", (error) => {
			console.error(`WebSocket error for [${clientId}]:`, error.message);
			clearClientSubscription(clientData);
			clients.delete(ws);
		});
	});

	console.log(
		`WebSocket server running on ws://localhost:${WS_PORT}, ${process.env.NODE_ENV || "development"}`,
	);

	return wss;
}

process.on("SIGINT", () => {
	console.log("Stopping the server...");

	stopStockUpdates();
	stopIpoUpdates();

	clients.forEach((clientData, ws) => {
		sendToClient(
			ws,
			"SERVER_SHUTDOWN",
			{
				message: "Server shutting down",
			},
			clientData.id,
		);
		try {
			ws.close();
		} catch (error) {
			console.error("Error closing client connection:", error.message);
		}
	});

	console.log("Server stopped");
	process.exit(0);
});

process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
	process.exit(1);
});

console.log("Starting MoneyIQ WebSocket Server...");
startWebSocketServer();
