# Money IQ WebSocket Server

A production-ready, modular WebSocket server for real-time stock market data delivery to the MoneyIQ dashboard. Features intelligent caching, Angel One SmartAPI integration, and comprehensive error handling.

## 🚀 Features

### Core Functionality

- **Real-time Stock Data**: Live price updates with configurable intervals
- **WebSocket Management**: Robust client connection handling with heartbeat monitoring
- **Modular Architecture**: Clean separation of concerns with organized modules
- **Redis Caching**: Intelligent data caching with distributed locking
- **Angel One Integration**: Full SmartAPI integration with TOTP authentication
- **Rate Limiting**: Configurable client and global rate limiting
- **Input Validation**: Comprehensive message and symbol validation
- **Health Monitoring**: Built-in health checks and status reporting

### Production Features

- **Environment-based Configuration**: Comprehensive config management
- **Graceful Shutdown**: Proper cleanup of connections and resources
- **Error Recovery**: Automatic retry mechanisms and fallback strategies
- **Market Hours Awareness**: Dynamic update intervals based on trading hours
- **Security**: Origin validation, IP whitelisting, and input sanitization
- **Logging**: Structured logging with configurable levels and sanitization

## 📁 Project Structure

```
money-iq-ws/
├── stock-server.js           # Main WebSocket server (lightweight)
├── package.json              # Dependencies and scripts
├── .env.example              # Environment configuration template
├── README-SERVER.md          # This documentation
└── src/                      # Modular source code
    ├── api/
    │   └── angel-one-handler.js    # Angel One SmartAPI integration
    ├── config/
    │   └── index.js                # Configuration management
    ├── database/
    │   └── redis-manager.js        # Redis operations manager
    └── types/
        └── index.js                # TypeScript-style type definitions
```

## 🛠️ Quick Start

### 1. Installation

```bash
# Clone/navigate to the directory
cd money-iq-ws

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configuration

Edit `.env` file for your setup:

```bash
# Basic setup (simulation mode)
WS_PORT=8080
# Render uses PORT automatically for public traffic
PORT=8080
REDIS_ENABLED=true
ANGEL_ONE_ENABLED=false
ANGEL_ONE_USE_SIMULATION=true

# Health check / graceful shutdown
SHUTDOWN_GRACE_PERIOD_MS=10000

# Production setup (with real API)
ANGEL_ONE_ENABLED=true
ANGEL_ONE_USE_SIMULATION=false
ANGEL_ONE_USER_ID=your_user_id
ANGEL_ONE_PASSWORD=your_password
# ... other Angel One credentials
```

### 3. Start the Server

```bash
# Development mode
npm run dev

# Production mode
NODE_ENV=production npm start

# With debug logging
DEBUG_MODE=true npm start
```

### 4. Test Connection

```javascript
// JavaScript client example
const ws = new WebSocket("ws://localhost:8080");

ws.onopen = () => {
	// Subscribe to symbols
	ws.send(
		JSON.stringify({
			type: "subscribe",
			symbols: ["RELIANCE", "TCS", "INFY"],
		}),
	);
};

ws.onmessage = (event) => {
	const data = JSON.parse(event.data);
	console.log("Stock update:", data);
};
```

### 5. Health Check Route (HTTP)

The WebSocket server also exposes HTTP health routes on the same port.

```bash
# Health check route (for cron/uptime monitors)
curl http://localhost:8080/health

# Alias route with same payload
curl http://localhost:8080/status
```

Example response:

```json
{
	"status": "healthy",
	"uptimeMs": 124832,
	"clients": 3,
	"stocks": {
		"activeSymbols": 7,
		"totalSubscriptions": 14
	},
	"ipos": {
		"activeIpos": 2,
		"totalSubscriptions": 2
	},
	"environment": "development",
	"timestamp": 1761178043621
}
```

During shutdown, this route returns HTTP `503` with `"status": "draining"` so load balancers and monitors know the instance is exiting.

## 🔧 Configuration

### Environment Variables

#### Server Configuration

```bash
WS_PORT=8080                    # WebSocket server port
PORT=8080                       # Platform-provided public port (Render/Heroku)
WS_HOST=0.0.0.0                 # Server host
WS_MAX_CLIENTS=1000             # Maximum concurrent connections
WS_HEARTBEAT_INTERVAL=30000     # Heartbeat interval (ms)
SHUTDOWN_GRACE_PERIOD_MS=10000  # Max wait for graceful shutdown
```

### Render Cron Keepalive

Use Render Cron Job to ping:

```text
GET https://<your-render-service>.onrender.com/health
```

Recommended interval: every 5 minutes.

#### Redis Configuration

```bash
REDIS_ENABLED=true              # Enable Redis caching
REDIS_HOST=localhost            # Redis server host
REDIS_PORT=6379                 # Redis server port
REDIS_STOCK_TTL=60              # Stock data cache TTL (seconds)
```

#### Angel One API

```bash
ANGEL_ONE_ENABLED=false         # Enable Angel One API
ANGEL_ONE_USE_SIMULATION=true   # Use simulation mode
ANGEL_ONE_USER_ID=              # Your Angel One user ID
ANGEL_ONE_PASSWORD=             # Your Angel One password
ANGEL_ONE_TOTP_SECRET=          # Your TOTP secret key
```

#### Security Settings

```bash
SECURITY_ENABLE_RATE_LIMITING=true     # Enable rate limiting
SECURITY_CLIENT_RATE_LIMIT=100         # Messages per minute per client
SECURITY_TRUSTED_ORIGINS=               # Allowed origins (comma-separated)
```

See `.env.example` for complete configuration options.

## 📡 WebSocket API

### Message Types

#### Subscribe to Symbols

```javascript
{
    "type": "subscribe",
    "symbols": ["RELIANCE", "TCS", "INFY"]
}
```

#### Unsubscribe from Symbols

```javascript
{
    "type": "unsubscribe",
    "symbols": ["RELIANCE"]
}
```

#### Ping (Heartbeat)

```javascript
{
    "type": "ping"
}
```

### Server Messages

#### Stock Data Update

```javascript
{
    "type": "stock_update",
    "data": {
        "symbol": "RELIANCE",
        "ltp": 2456.30,
        "percentChange": 1.25,
        "volume": 1234567,
        "timestamp": 1703123456789
    }
}
```

#### Error Messages

```javascript
{
    "type": "error",
    "error": "Invalid symbol format",
    "details": "Symbol must be alphanumeric"
}
```

#### System Messages

```javascript
{
    "type": "pong"
}
```

## 🏗️ Architecture

### Modular Design

The server is built with a modular architecture for maintainability and scalability:

#### Core Modules

1. **WebSocket Server** (`stock-server.js`)
    - Lightweight main server file (140 lines)
    - Client connection management
    - Message routing and validation
    - Clean shutdown handling

2. **Type System** (`src/types/index.js`)
    - Comprehensive type definitions
    - Message format constants
    - Data structure interfaces
    - Error handling enums

3. **Redis Manager** (`src/database/redis-manager.js`)
    - Complete Redis operations wrapper
    - Stock data caching with TTL management
    - Distributed locking for concurrent access
    - Batch operations and cleanup utilities
    - Connection health monitoring

4. **Angel One Handler** (`src/api/angel-one-handler.js`)
    - Full SmartAPI integration
    - TOTP authentication management
    - Symbol validation and mapping
    - Rate limiting and retry logic
    - Simulation mode for development

5. **Configuration Manager** (`src/config/index.js`)
    - Environment-based configuration
    - Validation and error checking
    - Security settings management
    - Performance tuning options

### Data Flow

```
Client Request → WebSocket Server → Symbol Validation → Cache Check (Redis)
                                                     ↓
Cache Hit ← Redis Manager ←──────────────────────────┘
    ↓
Client Response ← WebSocket Server ←─────────────────────┘

Cache Miss → Angel One API → Data Processing → Cache Store → Client Response
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
    - Check if port 8080 is available
    - Verify firewall settings
    - Check server logs for errors

2. **Redis Connection Error**
    - Ensure Redis server is running
    - Verify Redis host/port configuration
    - Check Redis authentication settings

3. **Angel One Authentication Failed**
    - Verify all credentials in .env file
    - Check TOTP secret is correctly configured
    - Ensure Angel One account is active

4. **High Memory Usage**
    - Enable Redis cleanup: `REDIS_ENABLE_CLEANUP=true`
    - Reduce cache TTL: `REDIS_STOCK_TTL=30`
    - Limit max clients: `WS_MAX_CLIENTS=500`

### Debug Mode

Enable comprehensive logging:

```bash
DEBUG_MODE=true LOG_LEVEL=debug npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ for the MoneyIQ dashboard application**
