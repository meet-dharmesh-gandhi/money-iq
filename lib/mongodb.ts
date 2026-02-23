import mongoose from "mongoose";

type MongooseCache = {
	conn: typeof mongoose | null;
	promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = global as typeof globalThis & {
	mongooseCache?: MongooseCache;
};

const cached: MongooseCache = globalWithMongoose.mongooseCache ?? {
	conn: null,
	promise: null,
};

globalWithMongoose.mongooseCache = cached;

export async function connectToDatabase() {
	if (cached.conn) {
		return cached.conn;
	}

	const uri = process.env.MONGODB_URI;
	if (!uri) {
		throw new Error("MONGODB_URI is not set");
	}

	if (!cached.promise) {
		cached.promise = mongoose.connect(uri, {
			bufferCommands: false,
		});
	}

	cached.conn = await cached.promise;
	return cached.conn;
}
