/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const { WebSocketServer } = require("ws");

const FakeDataGenerator = require("./src/data/fake-data-generator");
const IpoNseProvider = require("./src/data/ipo-nse-provider");

const fakeDataGenerator = new FakeDataGenerator();
const ipoNseProvider = new IpoNseProvider({
	cacheTtlMs: Number(process.env.IPO_REFRESH_INTERVAL_MS || 5000),
});

const WS_PORT = process.env.WS_PORT || 8080;
const ALL_IPOS_TOKEN = "__ALL_IPOS__";

const clients = new Map();
const globalStockSubscriptions = {};
const globalIpoSubscriptions = {};

let stockUpdateInterval = null;
let ipoUpdateInterval = null;

const STOCK_UPDATE_FREQUENCY = 1000;
const IPO_UPDATE_FREQUENCY = 5000;

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

function startStockUpdates() {
	if (stockUpdateInterval) {
		return;
	}

	stockUpdateInterval = setInterval(() => {
		if (!hasActiveStockSubscriptions()) {
			stopStockUpdates();
			return;
		}

		const symbols = Object.keys(globalStockSubscriptions);
		const fakeDataResult = fakeDataGenerator.generateMultipleSymbolsData(symbols);
		if (!fakeDataResult.success || fakeDataResult.data.fetched.length === 0) {
			return;
		}

		clients.forEach((clientData, ws) => {
			if (clientData.mode !== "stocks" || clientData.subscriptions.size === 0) {
				return;
			}

			const clientSymbols = Array.from(clientData.subscriptions);
			const relevantData = fakeDataResult.data.fetched.filter((stock) =>
				clientSymbols.includes(stock.symbol),
			);

			if (relevantData.length > 0) {
				sendToClient(ws, "STOCK_UPDATE", relevantData, clientData.id);
			}
		});
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

	const fakeDataResult = fakeDataGenerator.generateMultipleSymbolsData(nextSubscriptions);
	if (fakeDataResult.success && fakeDataResult.data.fetched.length > 0) {
		const historicalData = nextSubscriptions.map(
			(symbol) => fakeDataGenerator.priceHistory.get(symbol) ?? [],
		);
		sendToClient(ws, "HISTORICAL_BATCH", historicalData, clientData.id);
	} else {
		sendToClient(ws, "HISTORICAL_BATCH", [], clientData.id);
	}
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
