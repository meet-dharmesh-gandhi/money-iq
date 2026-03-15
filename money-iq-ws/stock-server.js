require("dotenv").config();
const { WebSocketServer } = require("ws");

// 🎲 Fake Data Generator Module - NOW INTEGRATED
const FakeDataGenerator = require("./src/data/fake-data-generator");
const fakeDataGenerator = new FakeDataGenerator();

// Configuration
const WS_PORT = process.env.WS_PORT || 8080;

// Connected clients storage
const clients = new Map();

// 🚀 Global subscription tracking for efficient data generation
const globalSubscriptions = {};

// 🔄 Data update interval tracking
let dataUpdateInterval = null;
const DATA_UPDATE_FREQUENCY = 1000; // 1 second

// Utility function to generate client ID
function generateClientId() {
	return Math.random().toString(36).substring(2, 11);
}

// Utility function to send message to client with detailed logging
function sendToClient(ws, type, data = null, clientId = "unknown") {
	if (ws.readyState === ws.OPEN) {
		try {
			const message = {
				type,
				data,
				timestamp: Date.now(),
			};

			// 🚀 DETAILED OUTGOING MESSAGE LOGGING
			// console.log(`\n📤 ===============================================`);
			// console.log(`📤 SENDING MESSAGE TO CLIENT [${clientId}]`);
			// console.log(`📤 ===============================================`);
			// console.log(`📤 Timestamp: ${new Date().toISOString()}`);
			// console.log(`📤 Message Type: ${type}`);
			// console.log(`📤 Client ID: ${clientId}`);
			// console.log(`📤 Data Size: ${JSON.stringify(message).length} bytes`);
			// console.log("sent message to", clientId);
			// console.log(JSON.stringify(message, undefined, 4));
			// if (data && typeof data === "object") {
			// 	if (data.fetched && Array.isArray(data.fetched)) {
			// 		console.log(`📤 Stock Data Count: ${data.fetched.length} symbols`);
			// 		console.log(`📤 Symbols: [${data.fetched.map((s) => s.symbol).join(", ")}]`);
			// 	} else {
			// 		console.log(`📤 Message Data:`, JSON.stringify(data, null, 2));
			// 	}
			// }
			// console.log(`📤 ===============================================\n`);

			ws.send(JSON.stringify(message));
			return true;
		} catch (error) {
			console.error(`❌ Error sending message to client [${clientId}]:`, error);
			return false;
		}
	}
	return false;
}

// Initialize WebSocket server
function startWebSocketServer() {
	// 🎲 Initialize fake data generator
	// console.log("🎲 Initializing fake data generator...");
	// try {
	// fakeDataGenerator.reset(); // Ensure clean state
	// console.log("✅ Fake data generator ready");
	// console.log(`📊 Available symbols: ${fakeDataGenerator.getAvailableSymbols().length}`);
	// } catch (error) {
	// 	console.log(`⚠️ Fake data generator error: ${error.message}`);
	// }

	const wss = new WebSocketServer({ port: WS_PORT });

	wss.on("connection", (ws) => {
		if (dataUpdateInterval === null) {
			startContinuousDataUpdates();
		}
		const clientId = generateClientId();
		const clientData = {
			id: clientId,
			connectedAt: Date.now(),
			subscriptions: new Set(),
			lastActivity: Date.now(),
		};

		// Store client data
		clients.set(ws, clientData);

		console.log(`🔌 Client connected [${clientId}] - Total clients: ${clients.size}`);

		// Send welcome message
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

		// Handle incoming messages
		ws.on("message", (data) => {
			clientData.lastActivity = Date.now();

			try {
				const message = JSON.parse(data.toString());

				// 🚀 DETAILED REQUEST LOGGING - Print all received data
				// console.log(`\n📨 ===============================================`);
				// console.log(`📨 NEW MESSAGE FROM CLIENT [${clientId}]`);
				// console.log(`📨 ===============================================`);
				// console.log(`📨 Timestamp: ${new Date().toISOString()}`);
				// console.log(`📨 Client ID: ${clientId}`);
				// console.log(`📨 Message Type: ${message.type || "UNKNOWN"}`);
				// console.log(`📨 Raw Message Data:`, JSON.stringify(message, null, 2));
				// if (message.symbols) {
				// 	console.log(`📨 Symbols Requested: [${message.symbols.join(", ")}]`);
				// 	console.log(`📨 Symbol Count: ${message.symbols.length}`);
				// }
				// console.log(
				// 	`📨 Client Last Activity: ${new Date(clientData.lastActivity).toISOString()}`,
				// );
				// console.log(
				// 	`📨 Client Subscriptions: [${Array.from(clientData.subscriptions).join(", ") || "NONE"}]`,
				// );
				// console.log(`📨 Total Active Clients: ${clients.size}`);
				// console.log(`📨 ===============================================\n`);
				console.log("Client", clientId, "message:");
				// console.log(data.toString());

				// Handle different message types
				switch (message.type) {
					case "PING":
						// console.log(`🏓 PING received from [${clientId}] - sending PONG`);
						sendToClient(ws, "PONG", { clientId }, clientId);
						break;
					case "SUBSCRIBE":
						// console.log(`📊 SUBSCRIPTION REQUEST from [${clientId}]`);
						console.log("subscribe");
						// console.log(data);
						if (message.symbols && Array.isArray(message.symbols)) {
							// Accept any symbols as sent by client - no modification needed

							// Store subscriptions
							const previousSubscriptions = clientData.subscriptions;
							clientData.subscriptions.clear();
							message.symbols.forEach((symbol) =>
								clientData.subscriptions.add(symbol),
							);
							// 🚀 Update global subscriptions for data generation efficiency
							previousSubscriptions.forEach((_, symbol) => {
								if (symbol in globalSubscriptions) {
									globalSubscriptions[symbol] += 1;
								} else {
									globalSubscriptions[symbol] = 1;
								}
							});
							// console.log(globalSubscriptions);
							// previousSubscriptions.forEach((sub) => {
							// 	if (!clientData.subscriptions.has(sub)) {
							// 		globalSubscriptions.delete(sub);
							// 	}
							// });
							// clientData.subscriptions.forEach((sub) => {
							// 	globalSubscriptions.add(sub);
							// });
							// clients.forEach((client) => {
							// 	client.subscriptions.forEach((symbol) =>
							// 		globalSubscriptions.add(symbol),
							// 	);
							// });

							// console.log(
							// 	`📊 Previous subscriptions: [${previousSubscriptions.join(", ") || "NONE"}]`,
							// );
							// console.log(
							// 	`📊 New subscriptions: [${message.symbols.join(", ") || "NONE"}]`,
							// );
							// console.log(
							// 	`📊 Global subscriptions: [${Array.from(globalSubscriptions).join(", ") || "NONE"}]`,
							// );
							// console.log(`📊 Subscription change for [${clientId}]: ✅ SUCCESS`);

							// Send acknowledgment
							// sendToClient(
							// 	ws,
							// 	"SUBSCRIPTION_ACK",
							// 	{
							// 		symbols: message.symbols,
							// 		count: message.symbols.length,
							// 	},
							// 	clientId,
							// );
							// 🎲 Generate and send immediate data + historical data
							// console.log(message.symbols, message.symbols.length);
							if (message.symbols.length > 0) {
								const fakeDataResult =
									fakeDataGenerator.generateMultipleSymbolsData(message.symbols);
								// console.log("fake data:", fakeDataResult);
								if (
									fakeDataResult.success &&
									fakeDataResult.data.fetched.length > 0
								) {
									// console.log(
									// 	`🎲 Generated immediate data for ${fakeDataResult.data.fetched.length} symbols`,
									// );

									historicalData = [];
									// Send historical data for sparklines
									message.symbols.forEach(
										(symbol) =>
											historicalData.push(
												fakeDataGenerator.priceHistory.get(symbol) ?? [],
											), // Last 20 points for sparklines
										// if (priceHistory.length > 1) {
										// sendToClient(
										// 	ws,
										// 	"HISTORICAL_BATCH",
										// 	{
										// 		symbol,
										// 		prices: priceHistory,
										// 		pointCount: priceHistory.length,
										// 		timestamp: Date.now(),
										// 	},
										// 	clientId,
										// );
										// }
									);

									sendToClient(ws, "HISTORICAL_BATCH", historicalData, clientId);
								}
							} else {
								sendToClient(ws, "HISTORICAL_BATCH", [], clientId);
							}
						}
						break;

					case "UNSUBSCRIBE":
						const unsubscribedSymbols = clientData.subscriptions;
						clientData.subscriptions.clear();

						// 🚀 Update global subscriptions
						Object.keys(globalSubscriptions).forEach((symbol) => {
							if (unsubscribedSymbols.has(symbol)) {
								if (globalSubscriptions[symbol] === 1) {
									delete globalSubscriptions[symbol];
								} else {
									globalSubscriptions[symbol] -= 1;
								}
							}
						});
						// globalSubscriptions.clear();
						// clients.forEach((client) => {
						// 	if (client.id !== clientId) {
						// 		// Exclude current client
						// 		client.subscriptions.forEach((symbol) =>
						// 			globalSubscriptions.add(symbol),
						// 		);
						// 	}
						// });

						console.log(`Client [${clientId}] unsubscribed`);
						// console.log(
						// 	`📊 Remaining global subscriptions: [${Array.from(globalSubscriptions).join(", ") || "NONE"}]`,
						// );

						sendToClient(
							ws,
							"UNSUBSCRIBE_ACK",
							{
								message: "Unsubscribed from all symbols",
								previousSymbols: unsubscribedSymbols,
								count: unsubscribedSymbols.length,
							},
							clientId,
						);

						// 🚀 Stop continuous updates if no subscriptions remain
						if (
							Object.entries(globalSubscriptions).length === 0 &&
							dataUpdateInterval
						) {
							stopContinuousDataUpdates();
						}
						break;

					default:
						console.warn(`❓ Unknown message type from [${clientId}]:`, message.type);
						console.log(`❓ Full unknown message:`, JSON.stringify(message, null, 2));
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
				console.log("Invalid message from client", clientId);
				console.log(data);
				// console.error(`\n📝 ===============================================`);
				// console.error(`📝 MESSAGE PARSE ERROR FROM CLIENT [${clientId}]`);
				// console.error(`📝 ===============================================`);
				// console.error(`📝 Error: ${error.message}`);
				// console.error(`📝 Raw data received:`, data.toString());
				// console.error(`📝 Data length: ${data.length} bytes`);
				// console.error(`📝 Client IP: ${ws._socket?.remoteAddress || "unknown"}`);
				// console.error(`📝 ===============================================\n`);
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

		// Handle client disconnect
		ws.on("close", () => {
			const disconnectedSubscriptions = clientData.subscriptions;
			console.log(
				`🔌 Client disconnected [${clientId}] - Total clients: ${clients.size - 1}`,
			);
			// console.log(
			// 	`🔌 Client had subscriptions: [${disconnectedSubscriptions.join(", ") || "NONE"}]`,
			// );

			clients.delete(ws);

			clientData.subscriptions.clear();

			// 🚀 Update global subscriptions
			Object.keys(globalSubscriptions).forEach((symbol) => {
				if (disconnectedSubscriptions.has(symbol)) {
					if (globalSubscriptions[symbol] === 1) {
						delete globalSubscriptions[symbol];
					} else {
						globalSubscriptions[symbol] -= 1;
					}
				}
			});
			// console.log(
			// 	`🔌 Updated global subscriptions: [${Array.from(globalSubscriptions).join(", ") || "NONE"}]`,
			// );

			// 🚀 Stop continuous updates if no subscriptions remain
			if (Object.entries(globalSubscriptions).length === 0 && dataUpdateInterval) {
				stopContinuousDataUpdates();
			}
		});

		// Handle WebSocket errors
		ws.on("error", (error) => {
			console.error(`🔌 WebSocket error for [${clientId}]:`, error.message);
			clients.delete(ws);
		});
	});

	console.log(
		`🚀 WebSocket server running on ws://localhost:${WS_PORT}, ${process.env.NODE_ENV || "development"}`,
	);
	// console.log(`🛡️ Environment: ${process.env.NODE_ENV || "development"}`);
	// console.log(`📊 Ready to accept connections`);
	// console.log(`🎲 Fake Data Generator: INTEGRATED and active`);
	// console.log(`📡 Request logging: ENABLED (detailed logging active)`);
	// console.log(`🔍 Global subscription tracking: ENABLED`);

	return wss;
}

// 🚀 Continuous data update functions
function startContinuousDataUpdates() {
	// console.log("📊 Starting continuous data updates...");

	dataUpdateInterval = setInterval(async () => {
		// if (globalSubscriptions.size === 0) {
		// 	stopContinuousDataUpdates();
		// 	return;
		// }

		// Generate fresh data for all subscribed symbols
		const symbols = Object.keys(globalSubscriptions);
		const fakeDataResult = fakeDataGenerator.generateMultipleSymbolsData(symbols);
		// console.log("fakeDataResult:", fakeDataResult);

		if (fakeDataResult.success && fakeDataResult.data.fetched.length > 0) {
			// console.log(
			// 	`🔄 Broadcasting data update to ${clients.size} clients for ${fakeDataResult.data.fetched.length} symbols`,
			// );

			// Broadcast to all subscribed clients
			clients.forEach((clientData, ws) => {
				const clientSymbols = Array.from(clientData.subscriptions);
				const relevantData = fakeDataResult.data.fetched.filter((stock) =>
					clientSymbols.includes(stock.symbol),
				);

				sendToClient(ws, "STOCK_UPDATE", relevantData, clientData.id);
				// if (relevantData.length > 0) {
				// 	// Send individual stock updates
				// 	relevantData.forEach((stock) => {
				// 	});
				// }
			});
		} else {
			console.log("⚠️ Failed to generate continuous update data");
		}
	}, DATA_UPDATE_FREQUENCY);

	// console.log(`📊 Continuous updates started (${DATA_UPDATE_FREQUENCY}ms interval - 1 second)`);
}

function stopContinuousDataUpdates() {
	if (dataUpdateInterval) {
		clearInterval(dataUpdateInterval);
		dataUpdateInterval = null;
		console.log("⏹️ Continuous data updates stopped (no active subscriptions)");
	}
}

// Graceful shutdown handler
process.on("SIGINT", () => {
	console.log("Stopping the server...");

	// Stop continuous data updates
	stopContinuousDataUpdates();

	// Notify all clients
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
			console.error("Error closing client connection:", error);
		}
	});

	console.log("Server stopped");
	process.exit(0);
});

// Error handlers
process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
	process.exit(1);
});

// Start the server
console.log("Starting MoneyIQ WebSocket Server...");
startWebSocketServer();
