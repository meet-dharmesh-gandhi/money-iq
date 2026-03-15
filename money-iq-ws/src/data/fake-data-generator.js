/**
 * Fake Data Generator Module
 * Generates realistic stock market data for testing and development
 */

// Note: This module is self-contained and doesn't need external type imports

/**
 * Predefined stock symbols with realistic characteristics
 */
// const STOCK_UNIVERSE = {
// 	// Large Cap Tech Stocks
// 	TCS: {
// 		name: "Tata Consultancy Services",
// 		basePrice: 3450,
// 		volatility: 0.02,
// 		sector: "IT",
// 		trend: "bullish",
// 		avgVolume: 850000,
// 	},
// 	INFY: {
// 		name: "Infosys Limited",
// 		basePrice: 1580,
// 		volatility: 0.025,
// 		sector: "IT",
// 		trend: "stable",
// 		avgVolume: 1200000,
// 	},
// 	WIPRO: {
// 		name: "Wipro Limited",
// 		basePrice: 445,
// 		volatility: 0.03,
// 		sector: "IT",
// 		trend: "bearish",
// 		avgVolume: 950000,
// 	},
// 	HCLTECH: {
// 		name: "HCL Technologies",
// 		basePrice: 1220,
// 		volatility: 0.028,
// 		sector: "IT",
// 		trend: "stable",
// 		avgVolume: 680000,
// 	},
// 	TECHM: {
// 		name: "Tech Mahindra",
// 		basePrice: 1055,
// 		volatility: 0.032,
// 		sector: "IT",
// 		trend: "bullish",
// 		avgVolume: 720000,
// 	},

// 	// Banking & Financial Services
// 	HDFCBANK: {
// 		name: "HDFC Bank",
// 		basePrice: 1675,
// 		volatility: 0.02,
// 		sector: "Banking",
// 		trend: "stable",
// 		avgVolume: 1100000,
// 	},
// 	ICICIBANK: {
// 		name: "ICICI Bank",
// 		basePrice: 1145,
// 		volatility: 0.025,
// 		sector: "Banking",
// 		trend: "bullish",
// 		avgVolume: 1400000,
// 	},
// 	AXISBANK: {
// 		name: "Axis Bank",
// 		basePrice: 1088,
// 		volatility: 0.035,
// 		sector: "Banking",
// 		trend: "stable",
// 		avgVolume: 1350000,
// 	},
// 	KOTAKBANK: {
// 		name: "Kotak Mahindra Bank",
// 		basePrice: 1765,
// 		volatility: 0.022,
// 		sector: "Banking",
// 		trend: "bullish",
// 		avgVolume: 650000,
// 	},
// 	SBIN: {
// 		name: "State Bank of India",
// 		basePrice: 815,
// 		volatility: 0.04,
// 		sector: "Banking",
// 		trend: "bearish",
// 		avgVolume: 2100000,
// 	},

// 	// FMCG & Consumer Goods
// 	HINDUNILVR: {
// 		name: "Hindustan Unilever",
// 		basePrice: 2380,
// 		volatility: 0.018,
// 		sector: "FMCG",
// 		trend: "stable",
// 		avgVolume: 420000,
// 	},
// 	ITC: {
// 		name: "ITC Limited",
// 		basePrice: 455,
// 		volatility: 0.015,
// 		sector: "FMCG",
// 		trend: "stable",
// 		avgVolume: 1800000,
// 	},
// 	NESTLEIND: {
// 		name: "Nestle India",
// 		basePrice: 2165,
// 		volatility: 0.02,
// 		sector: "FMCG",
// 		trend: "bullish",
// 		avgVolume: 180000,
// 	},

// 	// Energy & Oil
// 	RELIANCE: {
// 		name: "Reliance Industries",
// 		basePrice: 2456,
// 		volatility: 0.025,
// 		sector: "Energy",
// 		trend: "stable",
// 		avgVolume: 3200000,
// 	},
// 	ONGC: {
// 		name: "Oil & Natural Gas Corp",
// 		basePrice: 189,
// 		volatility: 0.035,
// 		sector: "Energy",
// 		trend: "bearish",
// 		avgVolume: 2500000,
// 	},
// 	IOC: {
// 		name: "Indian Oil Corporation",
// 		basePrice: 134,
// 		volatility: 0.04,
// 		sector: "Energy",
// 		trend: "stable",
// 		avgVolume: 1900000,
// 	},

// 	// Pharmaceuticals
// 	SUNPHARMA: {
// 		name: "Sun Pharmaceutical",
// 		basePrice: 1785,
// 		volatility: 0.03,
// 		sector: "Pharma",
// 		trend: "bullish",
// 		avgVolume: 420000,
// 	},
// 	DRREDDY: {
// 		name: "Dr Reddys Laboratories",
// 		basePrice: 1245,
// 		volatility: 0.028,
// 		sector: "Pharma",
// 		trend: "stable",
// 		avgVolume: 280000,
// 	},
// 	CIPLA: {
// 		name: "Cipla Limited",
// 		basePrice: 1455,
// 		volatility: 0.025,
// 		sector: "Pharma",
// 		trend: "bullish",
// 		avgVolume: 350000,
// 	},

// 	// Auto & Manufacturing
// 	MARUTI: {
// 		name: "Maruti Suzuki",
// 		basePrice: 10890,
// 		volatility: 0.03,
// 		sector: "Auto",
// 		trend: "stable",
// 		avgVolume: 180000,
// 	},
// 	"M&M": {
// 		name: "Mahindra & Mahindra",
// 		basePrice: 2945,
// 		volatility: 0.035,
// 		sector: "Auto",
// 		trend: "bullish",
// 		avgVolume: 320000,
// 	},
// 	"BAJAJ-AUTO": {
// 		name: "Bajaj Auto",
// 		basePrice: 9125,
// 		volatility: 0.025,
// 		sector: "Auto",
// 		trend: "stable",
// 		avgVolume: 120000,
// 	},

// 	// Metals & Mining
// 	TATASTEEL: {
// 		name: "Tata Steel",
// 		basePrice: 145,
// 		volatility: 0.045,
// 		sector: "Metals",
// 		trend: "bearish",
// 		avgVolume: 2800000,
// 	},
// 	HINDALCO: {
// 		name: "Hindalco Industries",
// 		basePrice: 645,
// 		volatility: 0.04,
// 		sector: "Metals",
// 		trend: "stable",
// 		avgVolume: 1100000,
// 	},
// 	JSWSTEEL: {
// 		name: "JSW Steel",
// 		basePrice: 885,
// 		volatility: 0.038,
// 		sector: "Metals",
// 		trend: "bearish",
// 		avgVolume: 1600000,
// 	},
// };

/**
 * Fake Data Generator Class
 */
class FakeDataGenerator {
	constructor(config = {}) {
		this.config = {
			updateInterval: config.updateInterval || 1000, // 1 second
			priceVariationPercent: config.priceVariationPercent || 2, // ±2%
			volumeVariationPercent: config.volumeVariationPercent || 30, // ±30%
			marketOpenHour: config.marketOpenHour || 9,
			marketOpenMinute: config.marketOpenMinute || 15,
			marketCloseHour: config.marketCloseHour || 15,
			marketCloseMinute: config.marketCloseMinute || 30,
			enableTrends: config.enableTrends !== false, // true by default
			enableVolatility: config.enableVolatility !== false, // true by default
			enableSeasonality: config.enableSeasonality !== false, // true by default
		};

		// Price history for each symbol (last 20 updates)
		this.priceHistory = new Map();

		// Current prices for each symbol
		this.currentPrices = new Map();

		// Market state
		this.marketState = {
			// isOpen: this.isMarketOpen(),
			trend: "stable", // bullish, bearish, stable
			volatility: 1.0, // multiplier
			lastUpdate: Date.now(),
		};

		// Initialize prices
		// this.initializePrices();
	}

	// ===========================================
	// INITIALIZATION METHODS
	// ===========================================

	/**
	 * Initialize current prices and history for all symbols
	 */
	// initializePrices() {
	// 	Object.keys(STOCK_UNIVERSE).forEach((symbol) => {
	// 		const stockInfo = STOCK_UNIVERSE[symbol];
	// 		const currentPrice = this.generateInitialPrice(stockInfo);

	// 		this.currentPrices.set(symbol, currentPrice);
	// 		this.priceHistory.set(symbol, [currentPrice]);
	// 	});

	// 	console.log(
	// 		`📊 Initialized fake data for ${Object.keys(STOCK_UNIVERSE).length} predefined symbols`,
	// 	);
	// 	console.log(`🎲 System will auto-generate data for any additional symbols requested`);
	// }

	/**
	 * Generate initial price with small random variation
	 */
	generateInitialPrice() {
		const variation = (Math.random() - 0.5) * 0.02; // ±1%
		return parseFloat((300 * (1 + variation)).toFixed(2));
	}

	// ===========================================
	// MARKET STATE METHODS
	// ===========================================

	/**
	 * Check if market is currently open (IST)
	 */
	// isMarketOpen() {
	// 	const now = new Date();
	// 	// Convert to IST (UTC + 5:30)
	// 	const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

	// 	const currentHour = istTime.getHours();
	// 	const currentMinute = istTime.getMinutes();
	// 	const currentTime = currentHour * 60 + currentMinute;

	// 	const openTime = this.config.marketOpenHour * 60 + this.config.marketOpenMinute;
	// 	const closeTime = this.config.marketCloseHour * 60 + this.config.marketCloseMinute;

	// 	// Skip weekends (Saturday = 6, Sunday = 0)
	// 	const dayOfWeek = istTime.getDay();
	// 	if (dayOfWeek === 0 || dayOfWeek === 6) {
	// 		return false;
	// 	}

	// 	return currentTime >= openTime && currentTime <= closeTime;
	// }

	/**
	 * Update market state based on time and conditions
	 */
	updateMarketState() {
		// this.marketState.isOpen = this.isMarketOpen();
		this.marketState.lastUpdate = Date.now();

		// Simulate market trends
		if (this.config.enableTrends && Math.random() < 0.05) {
			// 5% chance to change trend
			const trends = ["bullish", "bearish", "stable"];
			this.marketState.trend = trends[Math.floor(Math.random() * trends.length)];
		}

		// Simulate volatility changes
		if (this.config.enableVolatility && Math.random() < 0.03) {
			// 3% chance
			this.marketState.volatility = 0.5 + Math.random() * 1.5; // 0.5x to 2x volatility
		}
	}

	// ===========================================
	// DATA GENERATION METHODS
	// ===========================================

	/**
	 * Generate default stock info for unknown symbols
	 */
	// generateDefaultStockInfo(symbol) {
	// 	// Create reasonable defaults for any symbol
	// 	const sectors = [
	// 		"IT",
	// 		"Banking",
	// 		"FMCG",
	// 		"Energy",
	// 		"Pharma",
	// 		"Auto",
	// 		"Metals",
	// 		"Telecom",
	// 		"Retail",
	// 	];
	// 	const trends = ["bullish", "bearish", "stable"];

	// 	// Use symbol hash to ensure consistent values for same symbol
	// 	const hash = symbol.split("").reduce((a, b) => {
	// 		a = (a << 5) - a + b.charCodeAt(0);
	// 		return a & a;
	// 	}, 0);

	// 	return {
	// 		name: `${symbol} Corporation`,
	// 		basePrice: 100 + (Math.abs(hash) % 2000), // Price between 100-2100
	// 		volatility: 0.015 + (Math.abs(hash) % 100) / 2500, // Volatility 1.5%-5.5%
	// 		sector: sectors[Math.abs(hash) % sectors.length],
	// 		trend: trends[Math.abs(hash) % trends.length],
	// 		avgVolume: 50000 + (Math.abs(hash) % 1000000), // Volume 50k-1050k
	// 	};
	// }

	getRandomSector() {
		const sectors = [
			"IT",
			"Banking",
			"FMCG",
			"Energy",
			"Pharma",
			"Auto",
			"Metals",
			"Telecom",
			"Retail",
		];
		return sectors[Math.floor(Math.random() * 10)];
	}

	/**
	 * Generate fake data for single symbol
	 */
	generateSymbolData(symbol, stockName, stockSector) {
		// let stockInfo = STOCK_UNIVERSE[symbol];

		// If symbol not in predefined universe, generate default info automatically
		// if (!stockInfo) {
		// 	stockInfo = this.generateDefaultStockInfo(symbol);
		// 	console.log(`🎲 Auto-generated data for new symbol: ${symbol}`);
		// }

		// Initialize price history if this is the first time we see this symbol
		if (!this.currentPrices.has(symbol)) {
			const initialPrice = this.generateInitialPrice();
			this.currentPrices.set(symbol, initialPrice);
			this.priceHistory.set(symbol, [initialPrice]);
		}

		const previousPrice = this.currentPrices.get(symbol);
		const newPrice = this.calculateNewPrice(previousPrice);
		const volume = this.generateVolume();
		const percentChange = this.calculatePercentChange(symbol, newPrice);

		// Update price history
		this.updatePriceHistory(symbol, newPrice);
		this.currentPrices.set(symbol, newPrice);

		return {
			symbol: symbol,
			name: stockName,
			ltp: newPrice,
			previousClose: this.getPreviousClose(symbol),
			change: newPrice - this.getPreviousClose(symbol),
			percentChange: percentChange,
			volume: volume,
			high: this.getDayHigh(symbol),
			low: this.getDayLow(symbol),
			open: this.getDayOpen(symbol),
			sector: stockSector,
			marketCap: this.calculateMarketCap(newPrice),
			timestamp: Date.now(),
			exchange: "NSE",
			trend: this.getSymbolTrend(symbol),
			volatility: 2 * this.marketState.volatility,
		};
	}

	/**
	 * Generate fake data for multiple symbols
	 */
	generateMultipleSymbolsData(symbols) {
		// console.log("symbols:", symbols);
		this.updateMarketState();

		const results = {
			success: true,
			data: {
				fetched: [],
				unfetched: [],
			},
			marketState: {
				// isOpen: this.marketState.isOpen,
				trend: this.marketState.trend,
				volatility: this.marketState.volatility,
			},
			timestamp: Date.now(),
		};

		symbols.forEach((symbol) => {
			try {
				const data = this.generateSymbolData(symbol, symbol, this.getRandomSector());
				results.data.fetched.push(data);
			} catch (error) {
				console.error("Error in generating symbol data:", error);
				results.data.unfetched.push({
					symbol: symbol,
					error: error.message,
				});
			}
		});

		return results;
	}

	/**
	 * Generate fake data for all available symbols
	 */
	// generateAllSymbolsData() {
	// 	const allSymbols = Object.keys(STOCK_UNIVERSE);
	// 	return this.generateMultipleSymbolsData(allSymbols);
	// }

	// ===========================================
	// PRICE CALCULATION METHODS
	// ===========================================

	/**
	 * Calculate new price based on various factors
	 */
	calculateNewPrice(previousPrice) {
		let priceChange = 0;

		// Base random walk
		const randomFactor = (Math.random() - 0.5) * 2; // -1 to +1
		priceChange += randomFactor * this.marketState.volatility * previousPrice;

		// Market trend influence
		if (this.config.enableTrends) {
			const trendMultiplier = this.getTrendMultiplier();
			priceChange += trendMultiplier * this.marketState.volatility * previousPrice * 0.5;
		}

		// Stock-specific trend influence
		const stockTrend = this.marketState.trend;
		if (stockTrend === "bullish") {
			priceChange += Math.random() * this.marketState.volatility * previousPrice * 0.3;
		} else if (stockTrend === "bearish") {
			priceChange -= Math.random() * this.marketState.volatility * previousPrice * 0.3;
		}

		// Market state volatility
		priceChange *= this.marketState.volatility;

		// Mean reversion (prevent prices from drifting too far)
		const driftFromBase = (previousPrice - 300) / 300;
		if (Math.abs(driftFromBase) > 0.5) {
			// 10% drift
			priceChange -= driftFromBase * 300 * 0.1; // Pull back to base
		}

		// Calculate new price
		let newPrice = previousPrice + priceChange;

		if (newPrice > 1000) {
			newPrice = (newPrice + previousPrice) / 10;
		} else if (newPrice < 10) {
			newPrice = (newPrice + previousPrice) * 10;
		}

		// Ensure minimum price (₹1)
		return Math.max(1, parseFloat(newPrice.toFixed(2)));
	}

	/**
	 * Get trend multiplier based on market state
	 */
	getTrendMultiplier() {
		switch (this.marketState.trend) {
			case "bullish":
				return 0.6;
			case "bearish":
				return -0.6;
			case "stable":
			default:
				return 0;
		}
	}

	/**
	 * Generate realistic volume
	 */
	generateVolume() {
		const baseVolume = 1350000;
		const variation = this.config.volumeVariationPercent / 100;
		const randomFactor = (Math.random() - 0.5) * 2 * variation; // -variation to +variation

		// Market hours affect volume
		const volumeMultiplier = 0.8 + Math.random() * 0.4;

		const volume = baseVolume * (1 + randomFactor) * volumeMultiplier;
		return Math.floor(Math.max(1000, volume)); // Minimum 1000 volume
	}

	// ===========================================
	// CALCULATION HELPER METHODS
	// ===========================================

	/**
	 * Calculate percentage change from previous close
	 */
	calculatePercentChange(symbol, currentPrice) {
		const previousClose = this.getPreviousClose(symbol);
		if (previousClose === 0) return 0;

		const change = ((currentPrice - previousClose) / previousClose) * 100;
		return parseFloat(change.toFixed(2));
	}

	/**
	 * Get previous day's closing price
	 */
	getPreviousClose(symbol) {
		const history = this.priceHistory.get(symbol) || [];

		// If we have day's data, use the first price as previous close
		if (history.length > 10) {
			return history[0];
		}

		// Otherwise, use base price as previous close
		return 300;
	}

	/**
	 * Get day's high price
	 */
	getDayHigh(symbol) {
		const history = this.priceHistory.get(symbol) || [];
		if (history.length === 0) return 0;

		return Math.max(...history);
	}

	/**
	 * Get day's low price
	 */
	getDayLow(symbol) {
		const history = this.priceHistory.get(symbol) || [];
		if (history.length === 0) return 0;

		return Math.min(...history);
	}

	/**
	 * Get day's opening price
	 */
	getDayOpen(symbol) {
		const history = this.priceHistory.get(symbol) || [];

		if (history.length > 0) {
			return history[0]; // First price of the day
		}

		return 300;
	}

	/**
	 * Calculate market capitalization (simplified)
	 */
	calculateMarketCap(price) {
		// Fake shares outstanding based on sector and price
		const sharesOutstanding = Math.floor(200 + Math.random() * 600) * 1000000; // 200M-800M

		return Math.floor((price * sharesOutstanding) / 10000000); // In crores
	}

	/**
	 * Get symbol trend
	 */
	getSymbolTrend(symbol) {
		const history = this.priceHistory.get(symbol) || [];

		if (history.length < 3) {
			return this.marketState.trend;
		}

		// Calculate short-term trend
		const recent = history.slice(-3);
		const older = history.slice(-6, -3);

		if (recent.length === 0 || older.length === 0) {
			return this.marketState.trend;
		}

		const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
		const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

		const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

		if (changePercent > 0.5) return "bullish";
		if (changePercent < -0.5) return "bearish";
		return "stable";
	}

	/**
	 * Update price history for symbol
	 */
	updatePriceHistory(symbol, price) {
		let history = this.priceHistory.get(symbol) || [];
		history.push(price);

		// Keep last 60 prices (1 minute at 1-second intervals)
		if (history.length > 60) {
			history = history.slice(-60);
		}

		this.priceHistory.set(symbol, history);
	}
}

module.exports = FakeDataGenerator;
