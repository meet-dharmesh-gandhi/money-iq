# 📚 **QUICK REFERENCE GUIDE**

Fast reference for Money-IQ WebSocket server modules.

## 🚀 **ONE-LINER SETUP**

```javascript
const UnifiedDataHandler = require("./src/data/unified-data-handler");
const dataHandler = new UnifiedDataHandler();
const data = await dataHandler.fetchStockQuotes(["AAPL", "GOOGL"]);
```

## 🧩 **MODULE IMPORTS**

```javascript
// Core data handling
const UnifiedDataHandler = require("./src/data/unified-data-handler");
const AngelOneAPI = require("./src/api/angel-one-handler");
const FakeDataGenerator = require("./src/data/fake-data-generator");
const SymbolMasterManager = require("./src/api/symbol-master-manager");

// Infrastructure
const ErrorTracker = require("./src/utils/error-tracker");
const MessageRateLimit = require("./src/middleware/rate-limiter");
const RedisManager = require("./src/database/redis-manager");

// Configuration
const config = require("./src/config");
```

## ⚙️ **COMMON CONFIGURATIONS**

### **Development (Fake Data Only)**

```javascript
const dataHandler = new UnifiedDataHandler({
	environment: "development",
	forceMode: "fake",
});
```

### **Production (Angel One Only)**

```javascript
const dataHandler = new UnifiedDataHandler({
	environment: "production",
	forceMode: "angel-one",
});
```

### **Auto-Detect with Fallback**

```javascript
const dataHandler = new UnifiedDataHandler({
	environment: process.env.NODE_ENV,
	fallbackToFake: true,
});
```

## 🛡️ **ERROR TRACKING**

```javascript
const errorTracker = new ErrorTracker();

// Record an error (auto-blacklist after 3 strikes)
await errorTracker.recordError("AAPL", "API timeout");

// Record success (resets error count)
await errorTracker.recordSuccess("AAPL");

// Check if blacklisted
if (errorTracker.isBlacklisted("AAPL")) {
	console.log("Symbol temporarily blacklisted");
}

// Filter out blacklisted symbols
const validSymbols = errorTracker.filterBlacklisted(["AAPL", "GOOGL", "MSFT"]);
```

## ⚡ **RATE LIMITING**

```javascript
const rateLimiter = new MessageRateLimit();

// WebSocket middleware
const middleware = rateLimiter.middleware();
middleware(ws, req);

// Check rate limit
const result = ws.checkRateLimit("message");
if (!result.allowed) {
	// Handle rate limit
}
```

## 📊 **HEALTH CHECKS**

```javascript
// Data handler status
const status = dataHandler.getStatus();
console.log("Active source:", status.activeDataSource);

// Error tracker stats
const errorStats = errorTracker.getErrorStats();
console.log("Blacklisted symbols:", errorStats.currentlyBlacklisted);

// Rate limiter stats
const rateLimitStats = rateLimiter.getStats();
console.log("Active clients:", rateLimitStats.activeClients);
```

## 🔄 **ADMIN OPERATIONS**

```javascript
// Switch data source
await dataHandler.switchDataSource("fake");

// Force symbol master update
await symbolMaster.forceUpdate();

// Clear error tracking
errorTracker.clearAllErrors();

// Reset client rate limits
rateLimiter.resetClient(clientId);
```

## 📡 **WEBSOCKET PATTERNS**

### **Basic Message Handler**

```javascript
ws.on("message", async (message) => {
	const rateCheck = ws.checkRateLimit();
	if (!rateCheck.allowed) return;

	try {
		const { symbols } = JSON.parse(message);
		const validSymbols = errorTracker.filterBlacklisted(symbols);
		const result = await dataHandler.fetchStockQuotes(validSymbols);

		ws.send(
			JSON.stringify({
				type: "stock_data",
				data: result.data.fetched,
				source: result.dataSource,
			}),
		);
	} catch (error) {
		ws.send(JSON.stringify({ type: "error", message: error.message }));
	}
});
```

### **Subscription Management**

```javascript
class SubscriptionManager {
	constructor() {
		this.subscriptions = new Map(); // clientId -> Set of symbols
	}

	subscribe(clientId, symbols) {
		if (!this.subscriptions.has(clientId)) {
			this.subscriptions.set(clientId, new Set());
		}
		symbols.forEach((symbol) => this.subscriptions.get(clientId).add(symbol));
	}

	unsubscribe(clientId, symbols = null) {
		if (symbols) {
			const clientSymbols = this.subscriptions.get(clientId);
			if (clientSymbols) {
				symbols.forEach((symbol) => clientSymbols.delete(symbol));
			}
		} else {
			this.subscriptions.delete(clientId);
		}
	}

	getSubscriptions(clientId) {
		return Array.from(this.subscriptions.get(clientId) || []);
	}
}
```

## 🐛 **DEBUGGING SNIPPETS**

### **Test Data Sources**

```javascript
// Test Angel One
const angelOne = new AngelOneAPI();
const hasCredentials = angelOne.hasValidCredentials();
console.log("Angel One configured:", hasCredentials);

// Test fake data
const fakeGen = new FakeDataGenerator();
const fakeData = fakeGen.generateStockData(["TEST"]);
console.log("Fake data working:", fakeData.length > 0);
```

### **Inspect Symbol Master**

```javascript
const symbolMaster = new SymbolMasterManager();
await symbolMaster.initialize();
const stats = symbolMaster.getStats();
console.log("Symbol master stats:", stats);

const token = symbolMaster.getToken("AAPL");
console.log("AAPL token:", token);
```

### **Monitor Error Patterns**

```javascript
setInterval(() => {
	const stats = errorTracker.getErrorStats();
	console.log("Error tracking:", {
		blacklisted: stats.currentlyBlacklisted,
		atRisk: stats.symbolsAtRisk,
		totalErrors: stats.totalErrors,
	});
}, 60000); // Every minute
```

## 📋 **ENVIRONMENT VARIABLES CHECKLIST**

```bash
# Required for production
✅ NODE_ENV=production
✅ ANGEL_ONE_USER_ID=your_user_id
✅ ANGEL_ONE_PASSWORD=your_password
✅ ANGEL_ONE_TOTP_SECRET=your_totp_secret
✅ REDIS_HOST=your_redis_host

# Optional but recommended
✅ WEBSOCKET_PORT=8080
✅ RATE_LIMIT_MAX_MESSAGES=50
✅ ERROR_BLACKLIST_THRESHOLD=3
```

## 🔗 **USEFUL ENDPOINTS**

```bash
# Health check
GET http://localhost:8081/health

# Refresh data sources
POST http://localhost:8081/admin/refresh-data-sources

# Switch to fake data
POST http://localhost:8081/admin/switch-data-source
Body: { "source": "fake" }

# Clear error tracking
DELETE http://localhost:8081/admin/error-tracker
```

## ⚡ **PERFORMANCE TIPS**

- **Batch symbol requests** (max 50 per call)
- **Cache frequently requested symbols**
- **Use Redis for cross-instance state**
- **Monitor memory usage** in long-running processes
- **Set appropriate TTLs** for different data types
- **Use connection pooling** for high-traffic scenarios

---

**📖 For complete documentation, see [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)**
