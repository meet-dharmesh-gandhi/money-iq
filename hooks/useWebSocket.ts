import { useCallback, useEffect, useRef, useState } from "react";
import type {
	WebSocketMessage,
	WebSocketSubscription,
	WebSocketStatus,
	StockUpdate,
	IpoUpdate,
	HistoricalBatch,
} from "@/types/websocket";

interface UseWebSocketOptions {
	onStockUpdate?: (update: StockUpdate[]) => void;
	onIpoUpdate?: (update: IpoUpdate[]) => void;
	onHistoricalBatch?: (batch: HistoricalBatch) => void;
	onError?: (error: Error) => void;
}

const buildSubscribeMessage = (subscription: WebSocketSubscription) => ({
	type: "SUBSCRIBE",
	mode: subscription.mode || subscription.section,
	section: subscription.section,
	subscriptions: Array.from(subscription.subscriptions || []),
	symbols: Array.from(subscription.symbols || []),
	ipoIds: Array.from(subscription.ipoIds || []),
	timestamp: Date.now(),
});

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
	const [status, setStatus] = useState<WebSocketStatus>("disconnected");
	const [currentSubscription, setCurrentSubscription] = useState<WebSocketSubscription | null>(
		null,
	);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const maxReconnectAttempts = 5;
	const baseReconnectDelay = 1000; // 1 second

	// Stabilize event handlers with useCallback to prevent reconnection loops
	const stableOnStockUpdate = (update: StockUpdate[]) => {
		options.onStockUpdate?.(update);
	};

	const stableOnIpoUpdate = (update: IpoUpdate[]) => {
		options.onIpoUpdate?.(update);
	};

	const stableOnHistoricalBatch = (update: HistoricalBatch) => {
		options.onHistoricalBatch?.(update);
	};

	const stableOnError = (error: Error) => {
		options.onError?.(error);
	};

	const subscribe = (subscription: WebSocketSubscription, triedOnce = false) => {
		setCurrentSubscription(subscription);

		// Send subscription to WebSocket server
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			if (
				currentSubscription &&
				currentSubscription.section &&
				subscription.section &&
				currentSubscription.section !== subscription.section
			) {
				wsRef.current.send(
					JSON.stringify({
						type: "UNSUBSCRIBE",
						timestamp: Date.now(),
					}),
				);
			}

			const message = buildSubscribeMessage(subscription);

			console.log("📋 Subscribing:", {
				mode: message.mode,
				section: message.section,
				subscriptions: message.subscriptions,
				symbols: message.symbols,
				ipoIds: message.ipoIds,
			});
			wsRef.current.send(JSON.stringify(message));
		} else {
			console.warn("⚠️ WebSocket not connected, cannot subscribe");
			if (!triedOnce) {
				setTimeout(() => subscribe(subscription, true), 1000);
			}
		}
	};

	const unsubscribe = useCallback(() => {
		setCurrentSubscription(null);

		// Send unsubscribe to WebSocket server
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			const message = {
				type: "UNSUBSCRIBE",
				timestamp: Date.now(),
			};

			console.log("📋 Unsubscribing from all symbols");
			wsRef.current.send(JSON.stringify(message));
		}
	}, []);

	// Connect on mount only, don't reconnect on dependency changes
	useEffect(() => {
		let mounted = true;

		// Always connect to the separate WebSocket server
		const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

		const connectOnce = () => {
			if (!mounted) return;

			console.log("🔗 Connecting to stock WebSocket server:", wsUrl);

			try {
				setStatus("connecting");
				wsRef.current = new WebSocket(wsUrl);

				wsRef.current.onopen = () => {
					if (!mounted) return;
					setStatus("connected");
					reconnectAttemptsRef.current = 0;
					console.log("✅ Connected to MoneyIQ WebSocket server");

					// Re-subscribe to current subscription if any
					if (currentSubscription) {
						const message = buildSubscribeMessage(currentSubscription);
						wsRef.current?.send(JSON.stringify(message));
					}
				};

				wsRef.current.onclose = () => {
					if (!mounted) return;
					setStatus("disconnected");
					console.log("🔌 WebSocket disconnected, attempting reconnect...");

					// Auto-reconnect with exponential backoff
					if (reconnectAttemptsRef.current < maxReconnectAttempts) {
						const delay =
							baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
						reconnectTimeoutRef.current = setTimeout(() => {
							reconnectAttemptsRef.current++;
							connectOnce(); // Recursive call for auto-reconnect
						}, delay);
					}
				};

				wsRef.current.onerror = (error) => {
					if (!mounted) return;
					setStatus("error");
					console.error("❌ WebSocket connection error:", error);
					stableOnError(new Error("WebSocket connection error"));
				};

				wsRef.current.onmessage = (event) => {
					if (!mounted) return;
					try {
						const message: WebSocketMessage = JSON.parse(event.data);

						switch (message.type) {
							case "CONNECTED":
								console.log("🎯 WebSocket server ready:", message.data?.message);
								break;
							case "STOCK_UPDATE":
								if (message.data && stableOnStockUpdate) {
									stableOnStockUpdate(message.data);
								}
								break;
							case "IPO_UPDATE":
								if (message.data && stableOnIpoUpdate) {
									const payload = Array.isArray(message.data)
										? message.data
										: [message.data];
									stableOnIpoUpdate(payload);
								}
								break;
							case "HISTORICAL_BATCH":
								if (message.data && stableOnHistoricalBatch) {
									if (Array.isArray(message.data)) {
										message.data.forEach((batch) => {
											if (
												batch &&
												typeof batch === "object" &&
												"symbol" in batch
											) {
												stableOnHistoricalBatch(batch as HistoricalBatch);
											}
										});
									} else {
										stableOnHistoricalBatch(message.data as HistoricalBatch);
									}
								}
								break;
							case "PONG":
								// Keepalive response - connection is healthy
								break;
							case "ERROR":
								console.error("⚠️ WebSocket server error:", message.data?.message);
								stableOnError(
									new Error(message.data?.message || "WebSocket error"),
								);
								break;
							case "SERVER_SHUTDOWN":
								console.log("🛑 WebSocket server shutting down");
								setStatus("disconnected");
								break;
							default:
								console.warn("❓ Unknown message type:", message.type);
						}
					} catch (error) {
						console.error("📝 Failed to parse WebSocket message:", error);
					}
				};
			} catch (error) {
				if (!mounted) return;
				setStatus("error");
				console.error("💥 WebSocket connection failed:", error);
				stableOnError(error as Error);
			}
		};

		connectOnce();

		return () => {
			mounted = false;
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}

			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
		};
	}, []); // Remove options dependency to prevent reconnection loops

	// // Send keepalive every 30 seconds when connected
	// useEffect(() => {
	// 	if (status !== "connected") return;

	// 	const keepaliveInterval = setInterval(() => {
	// 		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
	// 			const message = {
	// 				type: "PING",
	// 				timestamp: Date.now(),
	// 			};
	// 			wsRef.current.send(JSON.stringify(message));
	// 		}
	// 	}, 30000);

	// 	return () => clearInterval(keepaliveInterval);
	// }, [status]);

	return {
		status,
		subscribe,
		unsubscribe,
		currentSubscription,
	};
};
