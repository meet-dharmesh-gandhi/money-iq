# MoneyIQ WebSocket Server Setup

## Overview

This project uses a separate WebSocket server for real-time stock data integration with Angel One SmartAPI. The WebSocket server is located in a separate repository (`money-iq-ws`) and runs independently of the Next.js application.

## Repository Structure

- **Main Application**: `money-iq/` - Next.js frontend and API routes
- **WebSocket Server**: `money-iq-ws/` - Separate Node.js WebSocket server with `stock-server.js`

## Quick Start

1. **Install Dependencies** (for both repositories):

    ```bash
    # Main application
    cd money-iq
    npm install

    # WebSocket server
    cd ../money-iq-ws
    npm install
    ```

2. **Set Up Environment Variables**:

    ```bash
    # In money-iq-ws directory
    cp .env.example .env.local
    # Edit .env.local with your Angel One API credentials (for production)
    ```

3. **Start Development Environment**:

    ```bash
    # Terminal 1: Start Next.js app (from money-iq directory)
    npm run dev

    # Terminal 2: Start WebSocket server (from money-iq directory)
    npm run dev-ws
    ```

4. **Access the Application**:
    - Web App: http://localhost:3000
    - WebSocket Server: ws://localhost:8080

## Environment Modes

### Development Mode (Default)

- **Command**: `npm run dev-ws`
- **Behavior**: Uses simulated stock data
- **Features**:
    - No API credentials required
    - Realistic randomized stock prices
    - 3-strike error simulation for testing
    - Full Redis caching simulation

### Production Mode

- **Command**: `NODE_ENV=production npm run start-ws`
- **Behavior**: Connects to real Angel One API
- **Requirements**:
    - Angel One API credentials in .env.local
    - Redis server running
    - Valid network configuration

## WebSocket Server Features

### Real-Time Data

- **Stock Prices**: Live updates from Angel One API
- **Demand-Driven**: Only fetches data when clients are subscribed
- **Rate Limiting**: Respects Angel One's 10 req/sec limit
- **Caching**: Redis-based caching with 500ms TTL

### Error Handling

- **3-Strike System**: Automatic symbol blacklisting after 3 consecutive fails
- **Graceful Degradation**: Continues serving other symbols if some fail
- **Connection Recovery**: Automatic reconnection with exponential backoff

### Smart Caching

- **Lock Mechanism**: Prevents duplicate API calls
- **TTL Management**: 500ms cache lifetime for fresh data
- **Memory Efficient**: Only caches actively requested symbols

## Angel One API Integration

### Required Credentials

```env
ANGEL_ONE_API_KEY=your_api_key_here
ANGEL_ONE_USER_ID=your_user_id_here
ANGEL_ONE_PASSWORD=your_password_here
ANGEL_ONE_TOTP_SECRET=your_totp_secret_here
```

### Network Configuration

```env
ANGEL_ONE_CLIENT_LOCAL_IP=192.168.1.100
ANGEL_ONE_CLIENT_PUBLIC_IP=203.0.113.1
ANGEL_ONE_MAC_ADDRESS=AA:BB:CC:DD:EE:FF
```

### Getting Credentials

1. Sign up at [Angel One SmartAPI](https://smartapi.angelone.in/)
2. Create a new application
3. Get API key and set up 2FA for TOTP secret
4. Configure your network details

## Client Integration

### WebSocket Connection

The Next.js frontend automatically connects to the WebSocket server:

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

const YourComponent = () => {
  const {
    status,
    subscribe,
    unsubscribe,
    currentSubscription
  } = useWebSocket({
    onStockUpdate: (data) => {
      console.log('Stock update:', data);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  // Subscribe to symbols
  const handleSubscribe = () => {
    subscribe({
      symbols: new Set(['TCS', 'INFY', 'RELIANCE'])
    });
  };

  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={handleSubscribe}>
        Subscribe to Stocks
      </button>
    </div>
  );
};
```

## Monitoring & Debugging

### Server Logs

The WebSocket server provides comprehensive logging:

- Connection events (🔗)
- Subscription changes (📋)
- API calls (📡)
- Cache operations
- Error tracking (❌)

### Client Debugging

Open browser console to see:

- WebSocket connection status
- Subscription confirmations
- Real-time data updates
- Error messages

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
    - Ensure WebSocket server in `money-iq-ws` repository is running (`npm run dev-ws` from main repo)
    - Check port 8080 is available
    - Verify firewall settings

2. **No Real Data in Production**
    - Verify Angel One API credentials in .env.local
    - Check network configuration
    - Ensure Redis is running

3. **Rate Limiting Errors**
    - Normal behavior - server automatically handles rate limits
    - Check logs for blackisted symbols
    - Reduce subscription frequency if needed

4. **Cache Issues**
    - Restart Redis server
    - Check REDIS_URL configuration
    - Verify Redis connection in server logs

### Development Tips

- Use development mode for initial testing
- Monitor server logs for API integration issues
- Test with small symbol sets first
- Use browser dev tools to inspect WebSocket messages

## Production Deployment

### Prerequisites

- Redis server running
- Angel One API credentials configured
- Proper network configuration
- SSL/TLS for WebSocket connections (WSS)

### Environment Setup

```bash
NODE_ENV=production
ANGEL_ONE_API_KEY=your_real_api_key
# ... other production credentials
```

### Process Management

Consider using PM2 or similar for production:

```bash
# From money-iq-ws directory
pm2 start stock-server.js --name "stock-websocket"
```

## API Reference

### WebSocket Message Types

#### Client → Server

```json
{
	"type": "SUBSCRIBE",
	"symbols": ["TCS", "INFY", "RELIANCE"],
	"timestamp": 1234567890
}
```

```json
{
	"type": "UNSUBSCRIBE",
	"timestamp": 1234567890
}
```

```json
{
	"type": "PING",
	"timestamp": 1234567890
}
```

#### Server → Client

```json
{
	"type": "CONNECTED",
	"data": {
		"message": "MoneyIQ WebSocket Server Ready"
	},
	"timestamp": 1234567890
}
```

```json
{
	"type": "STOCK_UPDATE",
	"data": {
		"symbol": "TCS",
		"price": 3287.5,
		"change": 15.25,
		"changePercent": 0.46,
		"lastUpdated": "2024-01-24T10:32:15.123Z"
	},
	"timestamp": 1234567890
}
```

```json
{
	"type": "ERROR",
	"data": {
		"message": "Failed to fetch data for symbol: INVALID"
	},
	"timestamp": 1234567890
}
```
