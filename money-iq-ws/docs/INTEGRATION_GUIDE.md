# 🏗️ **SERVER INTEGRATION DOCUMENTATION**

This documentation explains how to integrate all the production-ready modules into your WebSocket server for a complete, enterprise-grade stock data system.

## 📋 **TABLE OF CONTENTS**

1. [Quick Setup](#quick-setup)
2. [Module Overview](#module-overview)
3. [Configuration Guide](#configuration-guide)
4. [Integration Examples](#integration-examples)
5. [Environment Setup](#environment-setup)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 **QUICK SETUP**

### **Basic Integration (5 minutes)**

```javascript
const UnifiedDataHandler = require("./src/data/unified-data-handler");
const ErrorTracker = require("./src/utils/error-tracker");
const MessageRateLimit = require("./src/middleware/rate-limiter");
const RedisManager = require("./src/database/redis-manager");
const config = require("./src/config");

// Initialize core services
const redisManager = new RedisManager(config.redis);
const errorTracker = new ErrorTracker({ redisManager, enableRedis: true });
const rateLimiter = new MessageRateLimit();
const dataHandler = new UnifiedDataHandler({
	environment: process.env.NODE_ENV,
	redisManager,
});

// Your WebSocket server setup
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws, req) => {
	// Apply rate limiting
	const rateLimitCheck = rateLimiter.middleware();
	rateLimitCheck(ws, req);

	ws.on("message", async (message) => {
		// Check rate limits
		const rateCheck = ws.checkRateLimit();
		if (!rateCheck.allowed) {
			ws.send(
				JSON.stringify({
					type: "error",
					message: "Rate limit exceeded",
					retryAfter: rateCheck.retryAfter,
				}),
			);
			return;
		}

		try {
			const data = JSON.parse(message);
			if (data.type === "subscribe" && data.symbols) {
				// Filter blacklisted symbols
				const symbols = errorTracker.filterBlacklisted(data.symbols);

				// Fetch data using unified handler
				const result = await dataHandler.fetchStockQuotes(symbols);

				// Track success
				for (const stock of result.data.fetched) {
					await errorTracker.recordSuccess(stock.symbol);
				}

				ws.send(
					JSON.stringify({
						type: "stock_data",
						data: result.data.fetched,
						source: result.dataSource,
					}),
				);
			}
		} catch (error) {
			// Track error
			await errorTracker.recordError("API_GENERAL", error.message);

			ws.send(
				JSON.stringify({
					type: "error",
					message: "Request failed",
				}),
			);
		}
	});
});

console.log("🚀 WebSocket server running on port 8080");
```

---

## 🧩 **MODULE OVERVIEW**

### **Core Data Services**

| Module                  | Purpose                     | Status   | Integration Priority |
| ----------------------- | --------------------------- | -------- | -------------------- |
| **UnifiedDataHandler**  | Smart data source switching | ✅ Ready | **HIGH**             |
| **AngelOneAPI**         | Real market data            | ✅ Ready | MEDIUM               |
| **FakeDataGenerator**   | Development data            | ✅ Ready | LOW                  |
| **SymbolMasterManager** | Symbol↔Token mapping        | ✅ Ready | MEDIUM               |

### **Infrastructure Services**

| Module               | Purpose                 | Status   | Integration Priority |
| -------------------- | ----------------------- | -------- | -------------------- |
| **ErrorTracker**     | 3-strike blacklisting   | ✅ Ready | **HIGH**             |
| **MessageRateLimit** | Client abuse prevention | ✅ Ready | **HIGH**             |
| **RedisManager**     | Caching & persistence   | ✅ Ready | MEDIUM               |
| **Config**           | Environment management  | ✅ Ready | **HIGH**             |

---

## ⚙️ **CONFIGURATION GUIDE**

### **Environment Variables**

Create `.env` file in your server root:

```bash
# Environment
NODE_ENV=development  # or 'production'

# Angel One API Credentials (optional for dev)
ANGEL_ONE_USER_ID=your_user_id
ANGEL_ONE_PASSWORD=your_password
ANGEL_ONE_TOTP_SECRET=your_totp_secret
ANGEL_ONE_CLIENT_LOCAL_IP=192.168.1.100
ANGEL_ONE_CLIENT_PUBLIC_IP=203.0.113.1
ANGEL_ONE_MAC_ADDRESS=00:11:22:33:44:55

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DATABASE=0

# Server Configuration
WEBSOCKET_PORT=8080
RATE_LIMIT_MAX_MESSAGES=50
RATE_LIMIT_WINDOW_MS=60000
ERROR_BLACKLIST_THRESHOLD=3
```

### **Configuration Object**

```javascript
const serverConfig = {
	// Data handler configuration
	dataHandler: {
		environment: process.env.NODE_ENV,
		forceMode: null, // 'angel-one', 'fake', or null
		enableAngelOne: true,
		enableFakeData: true,
		fallbackToFake: true,
		angelOneConfig: {
			symbolMasterCacheDir: "./cache/symbols",
			requestTimeout: 10000,
			maxSymbolsPerRequest: 50,
			retryAttempts: 3,
		},
		fakeDataConfig: {
			volatilityFactor: 0.02,
			trendStrength: 0.1,
			updateInterval: 1000,
		},
	},

	// Error tracking configuration
	errorTracker: {
		blacklistThreshold: 3,
		blacklistDuration: 300000, // 5 minutes
		maxErrorHistory: 100,
		enableRedis: true,
		redisPrefix: "error_tracker:",
	},

	// Rate limiting configuration
	rateLimiter: {
		windowMs: 60000, // 1 minute
		maxMessages: 50,
		burstLimit: 10,
		burstWindowMs: 1000,
		cooldownMs: 30000,
	},

	// Redis configuration
	redis: {
		host: process.env.REDIS_HOST || "localhost",
		port: parseInt(process.env.REDIS_PORT) || 6379,
		password: process.env.REDIS_PASSWORD,
		database: parseInt(process.env.REDIS_DATABASE) || 0,
		defaultTTL: 500, // 500ms default cache
		lockTTL: 60000, // 1 minute lock TTL
	},
};
```

---

## 🔗 **INTEGRATION EXAMPLES**

### **Example 1: Basic WebSocket Server**

```javascript
const express = require('express');
const { WebSocketServer } = require('ws');
const UnifiedDataHandler = require('./src/data/unified-data-handler');
const ErrorTracker = require('./src/utils/error-tracker');
const MessageRateLimit = require('./src/middleware/rate-limiter');
const RedisManager = require('./src/database/redis-manager');
const config = require('./src/config');

class StockWebSocketServer {
	constructor() {
		this.initializeServices();
		this.setupWebSocketServer();
		this.setupHealthEndpoints();
	}

	async initializeServices() {
		// Initialize core services
		this.redis = new RedisManager(config.redis);

		this.errorTracker = new ErrorTracker({
			...config.errorTracker,
			redisManager: this.redis,
		});

		this.rateLimiter = new MessageRateLimit(config.rateLimiter);

		this.dataHandler = new UnifiedDataHandler({
			...config.dataHandler,
			redisManager: this.redis,
		});

		// Wait for initialization
		await this.dataHandler.initializeDataSources();

		console.log('✅ All services initialized');
	}

	setupWebSocketServer() {
		this.wss = new WebSocketServer({ port: 8080 });

		this.wss.on('connection', (ws, req) => {
			// Apply middleware
			const rateMiddleware = this.rateLimiter.middleware();
			rateMiddleware(ws, req);

			// Set up connection tracking
			ws.isAlive = true;
			ws.subscribedSymbols = new Set();

			ws.on('pong', () => {
				ws.isAlive = true;
			});

			ws.on('message', async (message) => {
				await this.handleMessage(ws, message);
			});

			ws.on('close', () => {
				console.log(`Client disconnected: ${ws.clientId}`);
			});
		});

		// Set up ping/pong for connection health
		const pingInterval = setInterval(() => {
			this.wss.clients.forEach((ws) => {
				if (ws.isAlive === false) {
					return ws.terminate();
				}

				ws.isAlive = false;
				ws.ping();
			});
		}, 30000);

		this.wss.on('close', () => {
			clearInterval(pingInterval);
		});

		console.log('🚀 WebSocket server listening on port 8080');
	}

	async handleMessage(ws, message) {
		// Rate limiting check
		const rateCheck = ws.checkRateLimit('message');
		if (!rateCheck.allowed) {
			ws.send(JSON.stringify({
				type: 'error',
				code: 'RATE_LIMITED',
				message: 'Rate limit exceeded',
				retryAfter: rateCheck.retryAfter
			}));
			return;
		}

		try {
			const data = JSON.parse(message);

			switch (data.type) {
				case 'subscribe':
					await this.handleSubscribe(ws, data);
					break;
				case 'unsubscribe':
					await this.handleUnsubscribe(ws, data);
					break;
				case 'ping':
					ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
					break;
				default:
					ws.send(JSON.stringify({
						type: 'error',
						code: 'UNKNOWN_MESSAGE_TYPE',
						message: \`Unknown message type: \${data.type}\`
					}));
			}
		} catch (error) {
			await this.errorTracker.recordError('MESSAGE_PARSING', error.message);

			ws.send(JSON.stringify({
				type: 'error',
				code: 'INVALID_MESSAGE',
				message: 'Invalid message format'
			}));
		}
	}

	async handleSubscribe(ws, data) {
		const { symbols } = data;

		if (!Array.isArray(symbols) || symbols.length === 0) {
			ws.send(JSON.stringify({
				type: 'error',
				code: 'INVALID_SYMBOLS',
				message: 'Invalid symbols array'
			}));
			return;
		}

		try {
			// Filter out blacklisted symbols
			const validSymbols = this.errorTracker.filterBlacklisted(symbols);
			const blacklistedSymbols = symbols.filter(s => !validSymbols.includes(s));

			if (blacklistedSymbols.length > 0) {
				ws.send(JSON.stringify({
					type: 'warning',
					code: 'SYMBOLS_BLACKLISTED',
					message: 'Some symbols are temporarily blacklisted',
					symbols: blacklistedSymbols
				}));
			}

			if (validSymbols.length === 0) {
				ws.send(JSON.stringify({
					type: 'error',
					code: 'NO_VALID_SYMBOLS',
					message: 'All requested symbols are blacklisted'
				}));
				return;
			}

			// Fetch data
			const result = await this.dataHandler.fetchStockQuotes(validSymbols);

			if (result.success) {
				// Track successful fetches
				for (const stock of result.data.fetched) {
					await this.errorTracker.recordSuccess(stock.symbol);
					ws.subscribedSymbols.add(stock.symbol);
				}

				// Track failed fetches
				for (const symbol of result.data.unfetched) {
					await this.errorTracker.recordError(symbol, 'API fetch failed');
				}

				// Send response
				ws.send(JSON.stringify({
					type: 'subscription_success',
					symbols: validSymbols,
					data: result.data.fetched,
					source: result.dataSource,
					stats: result.stats
				}));

			} else {
				// Track general failure
				for (const symbol of validSymbols) {
					await this.errorTracker.recordError(symbol, 'Subscription failed');
				}

				ws.send(JSON.stringify({
					type: 'error',
					code: 'SUBSCRIPTION_FAILED',
					message: 'Failed to fetch stock data'
				}));
			}

		} catch (error) {
			console.error('Subscription error:', error.message);

			// Track error for all requested symbols
			for (const symbol of symbols) {
				await this.errorTracker.recordError(symbol, error.message);
			}

			ws.send(JSON.stringify({
				type: 'error',
				code: 'SUBSCRIPTION_ERROR',
				message: 'Internal subscription error'
			}));
		}
	}

	async handleUnsubscribe(ws, data) {
		const { symbols } = data;

		if (Array.isArray(symbols)) {
			symbols.forEach(symbol => ws.subscribedSymbols.delete(symbol));
		} else {
			ws.subscribedSymbols.clear();
		}

		ws.send(JSON.stringify({
			type: 'unsubscription_success',
			symbols: symbols || 'all'
		}));
	}

	setupHealthEndpoints() {
		const app = express();
		app.use(express.json());

		// Health check endpoint
		app.get('/health', (req, res) => {
			const status = {
				server: 'healthy',
				timestamp: new Date().toISOString(),
				dataHandler: this.dataHandler.getStatus(),
				errorTracker: this.errorTracker.getErrorStats(),
				rateLimiter: this.rateLimiter.getStats(),
				websocket: {
					connections: this.wss.clients.size
				}
			};

			res.json(status);
		});

		// Admin endpoint - force data source refresh
		app.post('/admin/refresh-data-sources', async (req, res) => {
			try {
				await this.dataHandler.refreshDataSources();
				res.json({ success: true, message: 'Data sources refreshed' });
			} catch (error) {
				res.status(500).json({ success: false, error: error.message });
			}
		});

		// Admin endpoint - switch data source
		app.post('/admin/switch-data-source', async (req, res) => {
			try {
				const { source } = req.body;
				await this.dataHandler.switchDataSource(source);
				res.json({ success: true, message: \`Switched to \${source}\` });
			} catch (error) {
				res.status(400).json({ success: false, error: error.message });
			}
		});

		// Admin endpoint - clear error tracking
		app.delete('/admin/error-tracker', (req, res) => {
			this.errorTracker.clearAllErrors();
			res.json({ success: true, message: 'Error tracking cleared' });
		});

		app.listen(8081, () => {
			console.log('🏥 Health check server listening on port 8081');
		});
	}
}

// Start the server
const server = new StockWebSocketServer();
```

### **Example 2: Minimal Integration**

```javascript
// minimal-server.js - Simplest possible integration
const UnifiedDataHandler = require("./src/data/unified-data-handler");
const WebSocket = require("ws");

const dataHandler = new UnifiedDataHandler();
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
	ws.on("message", async (message) => {
		try {
			const { symbols } = JSON.parse(message);
			const result = await dataHandler.fetchStockQuotes(symbols);
			ws.send(JSON.stringify(result));
		} catch (error) {
			ws.send(JSON.stringify({ error: error.message }));
		}
	});
});

console.log("📡 Basic WebSocket server running on port 8080");
```

---

## 🌍 **ENVIRONMENT SETUP**

### **Development Environment**

```bash
# .env.development
NODE_ENV=development
WEBSOCKET_PORT=8080

# Optional - Angel One credentials for testing
# ANGEL_ONE_USER_ID=test_user
# ANGEL_ONE_PASSWORD=test_pass
# ... other Angel One settings

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Behavior**: Uses fake data by default, falls back to Angel One if configured.

### **Production Environment**

```bash
# .env.production
NODE_ENV=production
WEBSOCKET_PORT=8080

# Required - Angel One credentials
ANGEL_ONE_USER_ID=production_user_id
ANGEL_ONE_PASSWORD=production_password
ANGEL_ONE_TOTP_SECRET=production_totp_secret
ANGEL_ONE_CLIENT_LOCAL_IP=192.168.1.100
ANGEL_ONE_CLIENT_PUBLIC_IP=203.0.113.1
ANGEL_ONE_MAC_ADDRESS=00:11:22:33:44:55

# Required - Redis for production
REDIS_HOST=redis.production.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password
REDIS_DATABASE=0
```

**Behavior**: Uses Angel One API exclusively, fallback to fake data only if explicitly configured.

### **Testing Environment**

```bash
# .env.test
NODE_ENV=test
WEBSOCKET_PORT=8080

# Force fake data for consistent tests
FORCE_DATA_SOURCE=fake
```

**Behavior**: Forces fake data for predictable testing.

---

## 📊 **MONITORING & HEALTH CHECKS**

### **Health Check Endpoints**

```bash
# Basic health check
curl http://localhost:8081/health

# Response
{
  "server": "healthy",
  "timestamp": "2026-03-09T10:30:00.000Z",
  "dataHandler": {
    "environment": "development",
    "activeDataSource": "fake",
    "sources": {
      "angelOne": { "available": false },
      "fakeData": { "available": true }
    }
  },
  "errorTracker": {
    "totalSymbolsWithErrors": 0,
    "currentlyBlacklisted": 0,
    "symbolsAtRisk": 0
  },
  "rateLimiter": {
    "totalClients": 5,
    "activeClients": 3,
    "clientsInCooldown": 0
  }
}
```

### **Monitoring Metrics**

```javascript
// Custom monitoring integration
const { StatsD } = require('node-statsd');
const statsd = new StatsD();

// Track data source usage
statsd.increment(\`data_source.\${result.dataSource}.requests\`);

// Track rate limiting
statsd.increment('rate_limit.violations', rateLimitViolations);

// Track error rates
statsd.gauge('error_tracker.blacklisted_symbols', blacklistedCount);
```

### **Log Monitoring**

```javascript
// Structured logging setup
const winston = require("winston");

const logger = winston.createLogger({
	level: "info",
	format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
	transports: [
		new winston.transports.File({ filename: "app.log" }),
		new winston.transports.Console(),
	],
});

// Use in your handlers
logger.info("Stock data fetched", {
	symbols: symbols.length,
	source: result.dataSource,
	duration: fetchDuration,
});
```

---

## 🔍 **TROUBLESHOOTING**

### **Common Issues**

#### **1. Angel One API Not Working**

**Symptoms**:

- "Angel One credentials not configured"
- "Authentication failed"
- Falling back to fake data in production

**Solutions**:

```bash
# Check environment variables
echo $ANGEL_ONE_USER_ID
echo $ANGEL_ONE_TOTP_SECRET

# Test TOTP generation
node -e "
const speakeasy = require('speakeasy');
console.log(speakeasy.totp({
  secret: process.env.ANGEL_ONE_TOTP_SECRET,
  encoding: 'base32'
}));
"

# Verify network connectivity
curl https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword
```

#### **2. Redis Connection Issues**

**Symptoms**:

- "Redis connection failed"
- Error tracking not persisting
- Cache misses

**Solutions**:

```bash
# Test Redis connection
redis-cli -h localhost -p 6379 ping

# Check Redis logs
redis-cli monitor

# Test from Node.js
node -e "
const Redis = require('redis');
const client = Redis.createClient();
client.on('error', console.error);
client.connect().then(() => console.log('Connected'));
"
```

#### **3. Symbol Master Download Issues**

**Symptoms**:

- "Symbol master download failed"
- "Too few symbols received"
- Token mapping errors

**Solutions**:

```bash
# Test URL manually
curl https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json

# Check cache directory
ls -la ./cache/

# Force refresh
curl -X POST http://localhost:8081/admin/refresh-symbol-master
```

#### **4. Rate Limiting Too Aggressive**

**Symptoms**:

- Clients frequently rate limited
- "Rate limit exceeded" errors
- Poor user experience

**Solutions**:

```javascript
// Adjust rate limiting configuration
const rateLimiter = new MessageRateLimit({
	windowMs: 60000, // Increase window
	maxMessages: 100, // Increase limit
	burstLimit: 20, // Increase burst
	cooldownMs: 15000, // Reduce cooldown
});
```

#### **5. Memory Usage Growing**

**Symptoms**:

- Increasing memory usage over time
- Server slowdown
- Out of memory errors

**Solutions**:

```javascript
// Enable cleanup monitoring
setInterval(() => {
	const memUsage = process.memoryUsage();
	console.log("Memory usage:", {
		rss: Math.round(memUsage.rss / 1024 / 1024) + "MB",
		heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
	});

	// Force garbage collection if needed
	if (global.gc && memUsage.heapUsed > 500 * 1024 * 1024) {
		global.gc();
	}
}, 30000);
```

### **Performance Optimization**

#### **1. Redis Caching Strategy**

```javascript
// Optimize cache TTLs
const cacheConfig = {
	stockData: 500, // 500ms for real-time data
	symbolMaster: 86400, // 24 hours for symbol data
	errorTracking: 3600, // 1 hour for error data
};
```

#### **2. Connection Pooling**

```javascript
// WebSocket connection limits
const wss = new WebSocket.Server({
	port: 8080,
	maxPayload: 16 * 1024, // 16KB max message
	backlog: 100, // Connection queue limit
	clientTracking: true, // Enable client tracking
});
```

#### **3. Batch Processing**

```javascript
// Batch symbol requests
const BATCH_SIZE = 50;
const symbolBatches = [];

for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
	symbolBatches.push(symbols.slice(i, i + BATCH_SIZE));
}

const results = await Promise.all(
	symbolBatches.map((batch) => dataHandler.fetchStockQuotes(batch)),
);
```

---

## 🚀 **PRODUCTION DEPLOYMENT CHECKLIST**

### **Pre-Deployment**

- [ ] Environment variables configured
- [ ] Angel One credentials tested
- [ ] Redis server accessible
- [ ] Symbol master cache directory created
- [ ] Monitoring endpoints configured
- [ ] Log levels set appropriately
- [ ] Rate limiting tuned for expected load
- [ ] Error tracking thresholds configured

### **Deployment**

- [ ] Deploy with PM2 or similar process manager
- [ ] Configure reverse proxy (nginx/haproxy)
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up log rotation
- [ ] Configure monitoring alerts

### **Post-Deployment**

- [ ] Health checks passing
- [ ] Symbol master updating automatically
- [ ] Error tracking working correctly
- [ ] Rate limiting functioning
- [ ] WebSocket connections stable
- [ ] Monitoring dashboards configured
- [ ] Load testing completed
- [ ] Backup procedures in place

---

## 📞 **SUPPORT**

For additional support with integration:

1. **Check Health Endpoints**: http://localhost:8081/health
2. **Review Server Logs**: All modules provide detailed logging
3. **Monitor Error Tracking**: Use error tracker stats for debugging
4. **Test Individual Modules**: Each module can be tested in isolation

---

**🎉 Congratulations! You now have a complete, production-ready WebSocket server with enterprise-grade features including intelligent data source switching, comprehensive error tracking, rate limiting, and Redis caching.**
