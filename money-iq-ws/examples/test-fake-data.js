/**
 * Fake Data Generator Test & Demo
 * Shows how to use the fake data generator module
 */

const FakeDataGenerator = require("../src/data/fake-data-generator");

// Create generator instance
const generator = new FakeDataGenerator({
	updateInterval: 1000, // 1 second updates
	enableTrends: true,
	enableVolatility: true,
});

console.log("🎲 Fake Data Generator Test & Demo");
console.log("=====================================\n");

// Test 1: Get available symbols
console.log("1️⃣ Available Symbols:");
const symbols = generator.getAvailableSymbols();
console.log(`   📊 Total symbols: ${symbols.length}`);
console.log(`   📋 Symbols: ${symbols.slice(0, 10).join(", ")}... (showing first 10)`);
console.log("");

// Test 2: Generate data for single symbol
console.log("2️⃣ Single Symbol Data:");
try {
	const relData = generator.generateSymbolData("RELIANCE");
	console.log("   📈 RELIANCE data:");
	console.log(`   💰 LTP: ₹${relData.ltp}`);
	console.log(`   📊 Change: ${relData.percentChange > 0 ? "+" : ""}${relData.percentChange}%`);
	console.log(`   📅 Volume: ${relData.volume.toLocaleString()}`);
	console.log(`   🏢 Sector: ${relData.sector}`);
	console.log(`   📈 Trend: ${relData.trend}`);
} catch (error) {
	console.log(`   ❌ Error: ${error.message}`);
}
console.log("");

// Test 3: Generate data for multiple symbols
console.log("3️⃣ Multiple Symbols Data:");
const testSymbols = ["TCS", "INFY", "HDFCBANK", "RELIANCE", "ITC"];
const multiData = generator.generateMultipleSymbolsData(testSymbols);

console.log(`   ✅ Success: ${multiData.success}`);
console.log(`   📊 Fetched: ${multiData.data.fetched.length} symbols`);
console.log(`   ❌ Unfetched: ${multiData.data.unfetched.length} symbols`);
console.log(
	`   📈 Market State: ${multiData.marketState.trend} (volatility: ${multiData.marketState.volatility.toFixed(2)}x)`,
);

multiData.data.fetched.slice(0, 3).forEach((stock) => {
	console.log(
		`   📈 ${stock.symbol}: ₹${stock.ltp} (${stock.percentChange > 0 ? "+" : ""}${stock.percentChange}%)`,
	);
});
console.log("");

// Test 4: Market summary
console.log("4️⃣ Market Summary:");
const summary = generator.getMarketSummary();
console.log(`   📊 Total Stocks: ${summary.totalStocks}`);
console.log(
	`   📈 Advancers: ${summary.advancers} | 📉 Decliners: ${summary.decliners} | ➖ Unchanged: ${summary.unchanged}`,
);
console.log(`   📊 Average Change: ${summary.avgChange > 0 ? "+" : ""}${summary.avgChange}%`);
console.log(`   🔊 Total Volume: ${summary.totalVolume.toLocaleString()}`);
console.log(`   ⏰ Market Open: ${summary.marketState.isOpen ? "✅ YES" : "❌ NO"}`);
console.log("");

// Test 5: Symbol info
console.log("5️⃣ Symbol Information:");
const tcsInfo = generator.getSymbolInfo("TCS");
if (tcsInfo) {
	console.log(`   🏢 TCS - ${tcsInfo.name}`);
	console.log(`   💰 Base Price: ₹${tcsInfo.basePrice}`);
	console.log(`   📊 Volatility: ${(tcsInfo.volatility * 100).toFixed(1)}%`);
	console.log(`   🏭 Sector: ${tcsInfo.sector}`);
	console.log(`   📈 Trend: ${tcsInfo.trend}`);
	console.log(`   📅 Avg Volume: ${tcsInfo.avgVolume.toLocaleString()}`);
}
console.log("");

// Test 6: Error handling
console.log("6️⃣ Error Handling:");
try {
	generator.generateSymbolData("INVALID_SYMBOL");
} catch (error) {
	console.log(`   ✅ Correctly caught error: ${error.message}`);
}

const invalidResult = generator.generateMultipleSymbolsData([
	"VALID_SYMBOL",
	"INVALID_SYMBOL",
	"TCS",
]);
console.log(
	`   📊 Valid symbols processed: ${invalidResult.data.fetched.filter((s) => s.symbol === "TCS").length}`,
);
console.log(`   ❌ Invalid symbols: ${invalidResult.data.unfetched.length}`);
console.log("");

// Test 7: Continuous updates demo (uncomment to test)
console.log("7️⃣ Continuous Updates Demo:");
console.log("   📝 Generating 5 updates for TCS (1 second intervals)...");

let updateCount = 0;
const maxUpdates = 5;

const interval = setInterval(() => {
	updateCount++;
	const data = generator.generateSymbolData("TCS");
	console.log(
		`   📈 Update ${updateCount}: TCS = ₹${data.ltp} (${data.percentChange > 0 ? "+" : ""}${data.percentChange}%) [${data.trend}]`,
	);

	if (updateCount >= maxUpdates) {
		clearInterval(interval);
		console.log("   ✅ Continuous updates demo completed");
		console.log("");

		// Final message
		console.log("🎯 Demo Complete!");
		console.log("================");
		console.log(
			"💡 The fake data generator is ready for integration with the WebSocket server.",
		);
		console.log("🔌 To connect it, uncomment the import lines in stock-server.js");
		console.log(
			"📊 Each update generates realistic price movements with trends and volatility",
		);
		console.log("🏪 Market hours are automatically detected (IST 9:15 AM - 3:30 PM)");
		console.log("📈 Data includes: price, volume, trend, sector, market cap, and more");
		console.log("");
	}
}, 1000);

// Graceful shutdown
process.on("SIGINT", () => {
	console.log("\n👋 Demo interrupted by user");
	clearInterval(interval);
	process.exit(0);
});
