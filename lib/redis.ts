import { createClient, type RedisClientType } from "redis";

type RedisCache = {
	client: RedisClientType | null;
	promise: Promise<RedisClientType> | null;
};

const globalWithRedis = global as typeof globalThis & {
	redisCache?: RedisCache;
};

const cached: RedisCache = globalWithRedis.redisCache ?? {
	client: null,
	promise: null,
};

globalWithRedis.redisCache = cached;

type RedisConfig = {
	username?: string;
	password?: string;
	host?: string;
	port?: number;
	url?: string;
};

function getRedisConfig(): RedisConfig {
	// Support both URL format (simpler) and individual configs
	const redisUrl = process.env.REDIS_URL;
	if (redisUrl) {
		return { url: redisUrl };
	}

	const host = process.env.REDIS_HOST;
	const portRaw = process.env.REDIS_PORT;
	const username = process.env.REDIS_USERNAME ?? "default";
	const password = process.env.REDIS_PASSWORD;

	if (!host) {
		throw new Error("REDIS_HOST or REDIS_URL is not set");
	}

	if (!portRaw) {
		throw new Error("REDIS_PORT is not set when using individual config");
	}

	const port = Number(portRaw);
	if (Number.isNaN(port)) {
		throw new Error("REDIS_PORT must be a valid number");
	}

	if (!password) {
		throw new Error("REDIS_PASSWORD is not set");
	}

	return {
		host,
		port,
		username,
		password,
	};
}

function createRedisClient(): RedisClientType {
	const config = getRedisConfig();

	// Use URL format if available, otherwise use individual configs
	let client: RedisClientType;
	if (config.url) {
		client = createClient({ url: config.url });
	} else {
		client = createClient({
			username: config.username,
			password: config.password,
			socket: {
				host: config.host!,
				port: config.port!,
			},
		});
	}

	client.on("error", (err) => {
		console.error("Redis client error:", err);
	});

	return client;
}

export async function getRedisClient(): Promise<RedisClientType> {
	if (cached.client) {
		return cached.client;
	}

	if (!cached.promise) {
		const client = createRedisClient();
		cached.promise = client
			.connect()
			.then(() => {
				cached.client = client;
				return client;
			})
			.catch((error) => {
				cached.promise = null;
				throw error;
			});
	}

	return cached.promise;
}
