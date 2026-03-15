# MoneyIQ - Project Context & Implementation Guide

## Project Overview

MoneyIQ is a comprehensive financial dashboard application built with Next.js 16.1.6, providing real-time stock market data, mutual funds tracking, IPO information, and financial news. The application integrates with Angel One SmartAPI for live market data and features a sophisticated WebSocket architecture for real-time updates.

## Architecture Overview

```
MoneyIQ Application
├── Frontend (Next.js 16.1.6)
│   ├── Dashboard Components (Modular Architecture)
│   ├── Authentication System
│   ├── Real-time Data Display
│   └── WebSocket Client Integration
│
├── Separate WebSocket Server (stock-server.js)
│   ├── Angel One SmartAPI Integration
│   ├── Redis Caching Layer
│   ├── Rate Limiting & Error Handling
│   └── Demand-Driven Data Fetching
│
├── Database Layer
│   ├── MongoDB (User Data, Watchlists)
│   └── Redis (Real-time Caching)
│
└── External APIs
    ├── Angel One SmartAPI (Stock Data)
    └── News API (Financial News)
```

## Key Architectural Decisions

### 1. Separate WebSocket Server Architecture

**Decision**: Implement WebSocket functionality as a completely separate Node.js server rather than integrating it into the Next.js API routes.

**Reasoning**:

- **Development Experience**: Avoids HMR conflicts with Next.js development server
- **Performance**: Dedicated process for real-time data handling
- **Scalability**: Independent scaling of WebSocket and web servers
- **Debugging**: Separate logs and error handling for easier troubleshooting
- **Production Deployment**: Flexibility in deployment strategies

**Implementation**:

- WebSocket server runs on port 8080 (`stock-server.js`)
- Client connects via `useWebSocket.ts` hook
- Completely independent of Next.js process

### 2. Demand-Driven Data Fetching

**Decision**: Only fetch stock data when clients are actively subscribed to symbols.

**Reasoning**:

- **API Efficiency**: Respect Angel One's rate limits (10 req/sec)
- **Resource Management**: No unnecessary API calls when no clients connected
- **Cost Optimization**: Minimize API usage charges
- **Performance**: Reduce server load

**Implementation**:

- Track active client subscriptions in real-time
- Start/stop data fetching based on subscription state
- Smart subscription management with symbol-level tracking

### 3. Redis Caching with Lock Mechanism

**Decision**: Implement Redis caching with distributed locking to prevent duplicate API calls.

**Reasoning**:

- **Performance**: 500ms TTL provides balance between freshness and efficiency
- **Concurrency Safety**: Lock mechanism prevents race conditions
- **Scalability**: Supports multiple WebSocket server instances
- **Memory Efficiency**: Only cache actively requested symbols

**Implementation**:

- Cache key format: `stock:price:{symbol}`
- Lock key format: `stock:lock:{symbol}`
- Automatic cleanup of expired locks and cached data

### 4. 3-Strike Error Handling System

**Decision**: Implement automatic symbol blacklisting after 3 consecutive API failures.

**Reasoning**:

- **Resilience**: Prevent bad symbols from affecting entire system
- **User Experience**: Continue serving good symbols while isolating problematic ones
- **API Efficiency**: Avoid repeated failed requests
- **Graceful Degradation**: System remains functional with partial data

**Implementation**:

- Per-symbol error counting with timestamp tracking
- Automatic blacklisting with exponential backoff
- Periodic blacklist cleanup and retry logic

### 5. Environment-Aware Behavior

**Decision**: Different behavior for development vs production environments.

**Reasoning**:

- **Development Efficiency**: No API credentials needed for testing
- **Realistic Testing**: Simulated data with realistic price movements
- **Production Safety**: Clear separation between test and live data
- **Debugging**: Enhanced logging in development

**Implementation**:

- Development: Simulated stock data with randomized price movements
- Production: Real Angel One API integration
- Environment detection via `NODE_ENV`

### 6. Modular Dashboard Component Architecture

**Decision**: Break down the monolithic dashboard into 12+ specialized components.

**Reasoning**:

- **Maintainability**: Easier to update and debug individual sections
- **Reusability**: Components can be used across different pages
- **Performance**: Smaller bundle sizes and better code splitting
- **Team Development**: Multiple developers can work on different components

**Implementation**:

```
components/dashboard/
├── Sidebar.tsx              # Navigation and user info
├── TabNavigation.tsx        # Main content area tabs
├── StocksSection.tsx        # Stock portfolio display
├── MutualFundsSection.tsx   # Mutual funds portfolio
├── IpoSection.tsx           # IPO information
└── WatchlistManager.tsx     # Real-time watchlist with WebSocket
```

### 7. Page-Aware WebSocket Subscriptions

**Decision**: Only subscribe to real-time data when users are on pages that need it.

**Reasoning**:

- **Resource Efficiency**: No unnecessary WebSocket connections or data
- **User Experience**: Data is always fresh when page is viewed
- **API Management**: Reduces overall API call volume
- **Performance**: Lower memory usage and network traffic

**Implementation**:

- `usePageAwareWebSocket.ts` hook manages subscriptions
- Automatic subscription/unsubscription on page navigation
- Symbol-level subscription granularity

## Implementation Details

### WebSocket Communication Protocol

**Message Format**:

```typescript
interface WebSocketMessage {
	type:
		| "SUBSCRIBE"
		| "UNSUBSCRIBE"
		| "STOCK_UPDATE"
		| "ERROR"
		| "PING"
		| "PONG"
		| "CONNECTED"
		| "SERVER_SHUTDOWN";
	data?: any;
	timestamp: number;
}
```

**Client → Server Messages**:

- `SUBSCRIBE`: Request real-time data for specific symbols
- `UNSUBSCRIBE`: Stop receiving data for all symbols
- `PING`: Keepalive heartbeat (every 30 seconds)

**Server → Client Messages**:

- `CONNECTED`: Server ready acknowledgment
- `STOCK_UPDATE`: Real-time price data
- `ERROR`: Error notifications
- `PONG`: Heartbeat response
- `SERVER_SHUTDOWN`: Graceful shutdown notification

### Authentication & Security

**JWT Implementation**:

- Secure user sessions with JSON Web Tokens
- Server-side token validation for protected routes
- Automatic token refresh mechanism

**Password Security**:

- bcrypt hashing with salt rounds
- Secure password reset flow with time-limited tokens
- Rate limiting on authentication endpoints

**Input Sanitization**:

- MongoDB injection prevention
- XSS attack mitigation
- Input validation on all user-facing forms

### Database Schema Design

**User Management**:

```typescript
interface User {
	_id: ObjectId;
	email: string;
	password: string; // bcrypt hashed
	firstName: string;
	lastName: string;
	watchlist: string[]; // symbol array
	isEmailVerified: boolean;
	createdAt: Date;
	lastLogin: Date;
}
```

**News Caching**:

```typescript
interface NewsCache {
	_id: ObjectId;
	category: string;
	articles: NewsArticle[];
	cachedAt: Date;
	expiresAt: Date;
}
```

## Development Workflow & Decisions

### 1. Original Dashboard Issues

**Problems Identified**:

- Monolithic component structure (1000+ lines in single file)
- Infinite rendering loops due to object recreation
- No real-time data integration
- Poor responsive design
- Mixed concerns in single components

**Solutions Implemented**:

- Component modularization with clear separation of concerns
- Memoization and proper dependency management
- WebSocket integration for real-time updates
- Mobile-first responsive design
- Hook-based state management

### 2. WebSocket Integration Evolution

**Phase 1: Next.js API Routes Attempt**

- Initial attempt to use Next.js API routes for WebSocket
- Discovered HMR conflicts and development issues
- Performance concerns with integrated approach

**Phase 2: Separate Server Decision**

- Decided on completely separate WebSocket server
- Cleaner development experience
- Better debugging and monitoring capabilities
- Production-ready architecture

**Phase 3: Angel One API Integration**

- Comprehensive API documentation analysis
- Rate limiting strategy implementation
- Error handling and retry logic
- Environment-specific behavior implementation

### 3. State Management Strategy

**Decision**: Use React hooks and context instead of external state management.

**Reasoning**:

- **Simplicity**: No additional dependencies or learning curve
- **Performance**: Built-in optimizations with React 19
- **Type Safety**: Full TypeScript integration
- **Bundle Size**: Smaller overall application size

**Implementation**:

- Custom hooks for WebSocket management (`useWebSocket.ts`)
- Page-aware subscription handling (`usePageAwareWebSocket.ts`)
- Specialized hooks for different data types (`useStockData.ts`, `useMutualFunds.ts`)

### 4. Error Handling Philosophy

**Approach**: Progressive degradation with user-friendly error messages.

**Implementation**:

- Client-side error boundaries for React components
- Server-side try-catch blocks with structured logging
- WebSocket error handling with automatic reconnection
- API error classification (transient vs permanent)
- User notification system for critical errors

## Component Interaction Flow

### Dashboard Data Flow

```
User Navigation
    ↓
Page Component (dashboard/page.tsx)
    ↓
usePageAwareWebSocket Hook
    ↓ (subscribe to symbols)
WebSocket Client (useWebSocket.ts)
    ↓ (WebSocket connection)
Stock Server (stock-server.js)
    ↓ (API call if not cached)
Angel One SmartAPI
    ↓ (real-time data)
Redis Cache
    ↓ (broadcast to clients)
Dashboard Components Update
    ↓
UI Re-renders with Live Data
```

### Authentication Flow

```
User Login Attempt
    ↓
Client Form Validation
    ↓
API Route (/api/auth/login)
    ↓
Password Verification (bcrypt)
    ↓
JWT Token Generation
    ↓
Secure Cookie Storage
    ↓
Client Redirect to Dashboard
```

### Watchlist Management

```
User Adds Stock Symbol
    ↓
WatchlistManager Component
    ↓
Local State Update (optimistic)
    ↓
API Call to Update Database
    ↓
WebSocket Subscription Update
    ↓ (if successful)
Real-time Data Streaming Begins
```

## Technology Stack & Justification

### Core Technologies

**Next.js 16.1.6**

- **Why**: Latest features, excellent TypeScript integration, built-in optimizations
- **Benefits**: Server-side rendering, automatic code splitting, API routes
- **Considerations**: Bleeding edge version chosen for latest React 19 features

**TypeScript**

- **Why**: Type safety, better developer experience, enterprise readiness
- **Benefits**: Compile-time error detection, excellent IDE support, self-documenting code
- **Implementation**: Strict mode enabled, comprehensive type definitions

**React 19**

- **Why**: Latest features, concurrent rendering, better performance
- **Benefits**: React Server Components, improved hydration, automatic batching
- **Considerations**: Requires careful dependency management due to new version

**Tailwind CSS 4**

- **Why**: Utility-first approach, excellent developer experience, small production bundles
- **Benefits**: Rapid prototyping, consistent design system, responsive design utilities
- **Custom Configuration**: Extended with custom color schemes and component classes

### Backend Technologies

**MongoDB with Mongoose**

- **Why**: Flexible document structure, excellent Node.js integration
- **Benefits**: Schema validation, middleware support, connection pooling
- **Use Cases**: User management, watchlists, cached news articles

**Redis**

- **Why**: High-performance caching, pub/sub capabilities, data structure support
- **Benefits**: Sub-millisecond latency, atomic operations, TTL support
- **Use Cases**: Stock price caching, session storage, rate limiting

**WebSocket (ws library)**

- **Why**: Low latency, full-duplex communication, broad browser support
- **Benefits**: Real-time updates, efficient data transfer, connection state management
- **Implementation**: Custom protocol layer, automatic reconnection, heartbeat monitoring

## External API Integration

### Angel One SmartAPI

**Authentication Process**:

1. Login with USER_ID and PASSWORD
2. Generate TOTP using TOTP_SECRET
3. Receive AUTH_TOKEN and REFRESH_TOKEN
4. Use AUTH_TOKEN for all subsequent API calls

**Rate Limiting Strategy**:

- Maximum 10 requests per second
- Intelligent request queuing
- Automatic backoff on rate limit hits
- Per-symbol error tracking

**Required Headers**:

```javascript
{
  'Authorization': `Bearer ${authToken}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-UserType': process.env.ANGEL_ONE_USER_TYPE,
  'X-SourceID': process.env.ANGEL_ONE_SOURCE_ID,
  'X-ClientLocalIP': process.env.ANGEL_ONE_CLIENT_LOCAL_IP,
  'X-ClientPublicIP': process.env.ANGEL_ONE_CLIENT_PUBLIC_IP,
  'X-MACAddress': process.env.ANGEL_ONE_MAC_ADDRESS
}
```

### News API Integration

**Implementation**:

- Server-side caching to reduce API calls
- Category-based news filtering
- Pagination support for large result sets
- Error handling for API failures

## Security Implementations

### Authentication Security

- JWT tokens with expiration
- Secure HTTP-only cookies
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- Email verification for new accounts

### API Security

- Input sanitization on all endpoints
- MongoDB injection prevention
- CORS policy configuration
- Environment variable protection
- API key rotation strategy

### WebSocket Security

- Origin validation for connections
- Message validation and sanitization
- Connection rate limiting
- Graceful error handling

## Performance Optimizations

### Client-Side Optimizations

- React.memo for expensive components
- useMemo for complex calculations
- useCallback for stable function references
- Code splitting with dynamic imports
- Image optimization with Next.js Image component

### Server-Side Optimizations

- Redis caching with intelligent TTL
- Database connection pooling
- Efficient MongoDB queries with indexes
- API response caching
- Background task processing

### Network Optimizations

- WebSocket for real-time data (vs polling)
- Demand-driven API calls
- Response compression
- CDN integration for static assets
- Optimized bundle sizes

## Development Environment Setup

### Required Dependencies

```json
{
	"next": "16.1.6",
	"react": "19.2.3",
	"typescript": "^5",
	"mongoose": "^8.11.1",
	"redis": "^5.11.0",
	"ws": "^8.19.0",
	"bcrypt": "^6.0.0",
	"tailwindcss": "^4"
}
```

### Development Scripts

```json
{
	"dev": "next dev", // Next.js development server
	"dev-ws": "node stock-server.js", // WebSocket server (dev mode)
	"start-ws": "NODE_ENV=production node stock-server.js", // WebSocket server (prod mode)
	"build": "next build", // Production build
	"start": "next start" // Production server
}
```

### Environment Variables Required

```env
# Core Application
NODE_ENV=development
JWT_SECRET=your-secure-jwt-secret

# Database
MONGODB_URI=mongodb://localhost:27017/money-iq
REDIS_URL=redis://localhost:6379

# Angel One API (Production Only)
ANGEL_ONE_API_KEY=your_api_key
ANGEL_ONE_USER_ID=your_user_id
ANGEL_ONE_PASSWORD=your_password
ANGEL_ONE_TOTP_SECRET=your_totp_secret
ANGEL_ONE_CLIENT_LOCAL_IP=192.168.1.100
ANGEL_ONE_CLIENT_PUBLIC_IP=203.0.113.1
ANGEL_ONE_MAC_ADDRESS=AA:BB:CC:DD:EE:FF

# News API
NEWS_API_TOKEN=your_news_api_key
```

## Testing Strategy

### Development Testing

- Simulated data in development mode
- WebSocket connection testing
- Component isolation testing
- Authentication flow testing
- Database connection verification

### Production Testing

- Angel One API integration testing
- Redis caching verification
- Error handling validation
- Performance benchmarking
- Security penetration testing

## Deployment Considerations

### Development Deployment

- Two separate processes: Next.js app and WebSocket server
- Local MongoDB and Redis instances
- Simulated data for testing
- Hot module replacement for frontend

### Production Deployment

- Container orchestration (Docker recommended)
- Separate scaling for web and WebSocket servers
- Managed Redis and MongoDB services
- SSL/TLS termination for WebSocket connections
- Load balancing for high availability
- Monitoring and logging integration

### Environment-Specific Configuration

- Development: Simulated data, relaxed validation
- Staging: Real API with test credentials
- Production: Full security, monitoring, and error handling

## Future Enhancements & Considerations

### Planned Features

- Real-time portfolio tracking
- Advanced charting and technical analysis
- Push notifications for price alerts
- Mobile app development
- Social trading features

### Scalability Improvements

- Multiple WebSocket server instances
- Message queuing for high-volume updates
- Database sharding for large user bases
- CDN integration for global performance
- Microservices architecture transition

### Monitoring & Analytics

- Application performance monitoring (APM)
- User behavior analytics
- API usage tracking
- Error rate monitoring
- Real-time alerting system

## Troubleshooting Guide

### Common Development Issues

**WebSocket Connection Failures**

- Verify stock-server.js is running on port 8080
- Check firewall settings and port availability
- Ensure proper environment variable configuration

**Database Connection Issues**

- Verify MongoDB is running and accessible
- Check connection string format
- Validate authentication credentials

**API Integration Problems**

- Verify Angel One API credentials
- Check network configuration
- Monitor rate limiting status
- Review API response logs

### Performance Issues

- Monitor Redis memory usage
- Check MongoDB query performance
- Analyze WebSocket message frequency
- Review bundle size and loading times

### Security Concerns

- Regularly rotate API keys and secrets
- Monitor for unusual access patterns
- Keep dependencies updated
- Review and test security configurations

## Code Quality & Standards

### TypeScript Configuration

- Strict mode enabled
- Comprehensive type checking
- Interface definitions for all data structures
- Generic type usage for reusable components

### ESLint Configuration

- Next.js recommended rules
- TypeScript-specific linting
- Custom rules for project consistency
- Automated fixing on save

### Code Organization

- Feature-based folder structure
- Clear separation of concerns
- Consistent naming conventions
- Comprehensive documentation

### Git Workflow

- Feature branch development
- Pull request reviews
- Automated testing integration
- Semantic commit messages

This document serves as a comprehensive reference for understanding the MoneyIQ project architecture, implementation decisions, and technical considerations. It should be updated as the project evolves and new features are implemented.
