/**
 * WebSocket Message Rate Limiting Middleware
 * Implements per-client rate limiting with configurable windows and burst limits
 */

class MessageRateLimit {
	constructor(config = {}) {
		this.config = {
			// Rate limiting windows
			windowMs: config.windowMs || 60000, // 1 minute
			maxMessages: config.maxMessages || 50, // 50 messages per minute
			burstLimit: config.burstLimit || 10, // Max 10 messages in quick succession
			burstWindowMs: config.burstWindowMs || 1000, // 1 second burst window

			// Penalties
			cooldownMs: config.cooldownMs || 30000, // 30 second cooldown after limit
			escalationFactor: config.escalationFactor || 2, // Multiply cooldown on repeat offenses
			maxCooldownMs: config.maxCooldownMs || 300000, // Max 5 minute cooldown

			// Cleanup
			cleanupInterval: config.cleanupInterval || 300000, // 5 minutes
			maxClientHistory: config.maxClientHistory || 1000, // Track up to 1000 clients
		};

		// Client tracking
		this.clients = new Map();
		this.coolingDown = new Map();

		// Start cleanup interval
		this.startCleanupInterval();

		console.log(
			`🛡️  Rate limiter initialized: ${this.config.maxMessages}/min, burst ${this.config.burstLimit}/${this.config.burstWindowMs}ms`,
		);
	}

	/**
	 * Check if client is allowed to send message
	 */
	checkLimit(clientId, messageType = "message") {
		const now = Date.now();

		// Check if client is in cooldown
		if (this.isInCooldown(clientId, now)) {
			return {
				allowed: false,
				reason: "cooldown",
				retryAfter: this.getCooldownTimeLeft(clientId, now),
			};
		}

		// Get or create client tracking data
		if (!this.clients.has(clientId)) {
			this.clients.set(clientId, {
				messages: [],
				violations: 0,
				firstMessage: now,
				lastMessage: now,
				totalMessages: 0,
			});
		}

		const client = this.clients.get(clientId);
		const windowStart = now - this.config.windowMs;
		const burstWindowStart = now - this.config.burstWindowMs;

		// Clean old messages outside window
		client.messages = client.messages.filter((msg) => msg.timestamp > windowStart);

		// Count messages in current window and burst window
		const messagesInWindow = client.messages.length;
		const messagesInBurst = client.messages.filter(
			(msg) => msg.timestamp > burstWindowStart,
		).length;

		// Check burst limit
		if (messagesInBurst >= this.config.burstLimit) {
			this.handleViolation(clientId, "burst", client);
			return {
				allowed: false,
				reason: "burst_limit",
				limit: this.config.burstLimit,
				window: this.config.burstWindowMs,
				retryAfter:
					this.config.burstWindowMs -
					(now -
						client.messages[client.messages.length - this.config.burstLimit]
							?.timestamp || 0),
			};
		}

		// Check rate limit
		if (messagesInWindow >= this.config.maxMessages) {
			this.handleViolation(clientId, "rate", client);
			return {
				allowed: false,
				reason: "rate_limit",
				limit: this.config.maxMessages,
				window: this.config.windowMs,
				retryAfter: this.config.windowMs - (now - client.messages[0]?.timestamp || 0),
			};
		}

		// Allow message - record it
		client.messages.push({
			timestamp: now,
			type: messageType,
		});
		client.lastMessage = now;
		client.totalMessages++;

		return {
			allowed: true,
			remaining: {
				window: this.config.maxMessages - messagesInWindow - 1,
				burst: this.config.burstLimit - messagesInBurst - 1,
			},
		};
	}

	/**
	 * Handle rate limit violation
	 */
	handleViolation(clientId, violationType, client) {
		client.violations++;
		const now = Date.now();

		// Calculate cooldown duration with escalation
		let cooldownDuration = this.config.cooldownMs;
		for (let i = 1; i < client.violations; i++) {
			cooldownDuration = Math.min(
				cooldownDuration * this.config.escalationFactor,
				this.config.maxCooldownMs,
			);
		}

		// Apply cooldown
		this.coolingDown.set(clientId, {
			until: now + cooldownDuration,
			reason: violationType,
			violations: client.violations,
			duration: cooldownDuration,
		});

		console.log(
			`⚠️  Rate limit violation - Client ${clientId}: ${violationType} limit exceeded (${client.violations} violations), cooldown for ${cooldownDuration}ms`,
		);
	}

	/**
	 * Check if client is currently in cooldown
	 */
	isInCooldown(clientId, now = Date.now()) {
		if (!this.coolingDown.has(clientId)) {
			return false;
		}

		const cooldown = this.coolingDown.get(clientId);
		if (now >= cooldown.until) {
			this.coolingDown.delete(clientId);
			console.log(`✅ Client ${clientId} cooldown expired`);
			return false;
		}

		return true;
	}

	/**
	 * Get remaining cooldown time for client
	 */
	getCooldownTimeLeft(clientId, now = Date.now()) {
		const cooldown = this.coolingDown.get(clientId);
		return cooldown ? Math.max(0, cooldown.until - now) : 0;
	}

	/**
	 * Get client rate limit status
	 */
	getClientStatus(clientId) {
		const now = Date.now();
		const client = this.clients.get(clientId);
		const cooldown = this.coolingDown.get(clientId);

		if (!client) {
			return {
				exists: false,
				messages: 0,
				violations: 0,
				inCooldown: false,
			};
		}

		const windowStart = now - this.config.windowMs;
		const burstWindowStart = now - this.config.burstWindowMs;

		const messagesInWindow = client.messages.filter(
			(msg) => msg.timestamp > windowStart,
		).length;
		const messagesInBurst = client.messages.filter(
			(msg) => msg.timestamp > burstWindowStart,
		).length;

		return {
			exists: true,
			messages: {
				total: client.totalMessages,
				inWindow: messagesInWindow,
				inBurst: messagesInBurst,
				remaining: {
					window: Math.max(0, this.config.maxMessages - messagesInWindow),
					burst: Math.max(0, this.config.burstLimit - messagesInBurst),
				},
			},
			violations: client.violations,
			inCooldown: this.isInCooldown(clientId, now),
			cooldown: cooldown
				? {
						reason: cooldown.reason,
						timeLeft: this.getCooldownTimeLeft(clientId, now),
						violations: cooldown.violations,
					}
				: null,
			firstMessage: client.firstMessage,
			lastMessage: client.lastMessage,
		};
	}

	/**
	 * Get overall rate limiting statistics
	 */
	getStats() {
		const now = Date.now();
		let totalClients = this.clients.size;
		let activeClients = 0;
		let clientsInCooldown = this.coolingDown.size;
		let totalMessages = 0;
		let totalViolations = 0;

		const windowStart = now - this.config.windowMs;

		for (const [clientId, client] of this.clients) {
			totalMessages += client.totalMessages;
			totalViolations += client.violations;

			// Check if client is active (sent message in current window)
			if (client.lastMessage > windowStart) {
				activeClients++;
			}
		}

		return {
			totalClients,
			activeClients,
			clientsInCooldown,
			totalMessages,
			totalViolations,
			config: this.config,
			uptime: now - (this.startTime || now),
		};
	}

	/**
	 * Reset client rate limit data
	 */
	resetClient(clientId) {
		this.clients.delete(clientId);
		this.coolingDown.delete(clientId);
		console.log(`🧹 Reset rate limit data for client ${clientId}`);
	}

	/**
	 * Clear rate limit data for inactive clients
	 */
	cleanup() {
		const now = Date.now();
		const inactiveThreshold = now - this.config.windowMs * 10; // 10x window size
		let cleaned = 0;

		// Remove inactive clients
		for (const [clientId, client] of this.clients) {
			if (client.lastMessage < inactiveThreshold) {
				this.clients.delete(clientId);
				cleaned++;
			}
		}

		// Remove expired cooldowns
		let expiredCooldowns = 0;
		for (const [clientId, cooldown] of this.coolingDown) {
			if (now >= cooldown.until) {
				this.coolingDown.delete(clientId);
				expiredCooldowns++;
			}
		}

		// Enforce max client history
		if (this.clients.size > this.config.maxClientHistory) {
			const clientEntries = Array.from(this.clients.entries());
			clientEntries.sort(([, a], [, b]) => a.lastMessage - b.lastMessage);

			const toRemove = this.clients.size - this.config.maxClientHistory;
			for (let i = 0; i < toRemove; i++) {
				this.clients.delete(clientEntries[i][0]);
				cleaned++;
			}
		}

		if (cleaned > 0 || expiredCooldowns > 0) {
			console.log(
				`🧹 Rate limiter cleanup: removed ${cleaned} inactive clients, ${expiredCooldowns} expired cooldowns`,
			);
		}
	}

	/**
	 * Start automatic cleanup interval
	 */
	startCleanupInterval() {
		this.startTime = Date.now();
		setInterval(() => {
			this.cleanup();
		}, this.config.cleanupInterval);
	}

	/**
	 * Create WebSocket middleware function
	 */
	middleware() {
		return (ws, req, next) => {
			// Add rate limiting methods to WebSocket connection
			ws.clientId = ws.clientId || req.socket.remoteAddress + ":" + req.socket.remotePort;

			ws.checkRateLimit = (messageType) => {
				return this.checkLimit(ws.clientId, messageType);
			};

			ws.getRateLimitStatus = () => {
				return this.getClientStatus(ws.clientId);
			};

			// Override send to check rate limits
			const originalSend = ws.send.bind(ws);
			ws.sendWithRateLimit = (data, messageType = "outbound") => {
				const result = this.checkLimit(ws.clientId, messageType);
				if (result.allowed) {
					originalSend(data);
					return true;
				} else {
					console.log(`🚫 Blocked outbound message to ${ws.clientId}: ${result.reason}`);
					return false;
				}
			};

			if (next) next();
		};
	}
}

module.exports = MessageRateLimit;
