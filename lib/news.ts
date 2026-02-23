import type { NewsApiItem } from "@/types/news/api";
import type { NewsItem, NewsDocument } from "@/types/news/model";
import type { NewsPageResponse } from "@/types/news/pagination";

const ONE_HOUR_MS = 60 * 60 * 1000;

let cachedNews: NewsItem[] = [];
let lastFetchedAt = 0;
let refreshInFlight: Promise<NewsItem[]> | null = null;
let refresherStarted = false;

export async function fetchExternalNews(): Promise<NewsItem[]> {
	const url = process.env.NEWS_API_URL;
	const token = process.env.NEWS_API_TOKEN;
	if (!url) {
		throw new Error("NEWS_API_URL is not set");
	}
	if (!token) {
		throw new Error("NEWS_API_TOKEN is not set");
	}

	const response = await fetch(`${url}?category=general&token=${token}`, {
		headers: {
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`News fetch failed: ${response.status}`);
	}

	const payload = await response.json();
	const items = Array.isArray(payload) ? (payload as NewsApiItem[]) : [];

	return items
		.map((item) => {
			const publishedAt = Number.isFinite(item.datetime)
				? new Date(item.datetime * 1000).toISOString()
				: new Date().toISOString();

			return {
				id: String(item.id),
				externalId: item.id,
				title: item.headline?.trim() || "Market update",
				summary: item.summary?.trim() || "Latest market update from trusted sources.",
				url: item.url?.trim() || "#",
				source: item.source?.trim() || "Market News",
				publishedAt,
				image: item.image?.trim() || undefined,
				category: item.category?.trim() || undefined,
			} satisfies NewsItem;
		})
		.filter((item) => item.url !== "#");
}

async function refreshNews(): Promise<NewsItem[]> {
	if (!refreshInFlight) {
		refreshInFlight = fetchExternalNews()
			.then((items) => {
				cachedNews = items;
				lastFetchedAt = Date.now();
				return items;
			})
			.then(async (items) => {
				await storeNews(items);
				return items;
			})
			.finally(() => {
				refreshInFlight = null;
			});
	}

	return refreshInFlight;
}

function ensureRefresher() {
	if (refresherStarted) return;
	refresherStarted = true;

	setInterval(() => {
		refreshNews().catch(() => undefined);
	}, ONE_HOUR_MS);
}

export async function getCachedNews(): Promise<NewsItem[]> {
	ensureRefresher();

	const isStale = Date.now() - lastFetchedAt > ONE_HOUR_MS;
	if (!cachedNews.length || isStale) {
		return refreshNews();
	}

	return cachedNews;
}

export async function getNewsPage(page: number, limit: number): Promise<NewsPageResponse> {
	const { default: News } = await import("@/models/News");
	const { connectToDatabase } = await import("@/lib/mongodb");
	await connectToDatabase();

	const safePage = Number.isFinite(page) && page > 0 ? page : 1;
	const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 12;
	const skip = (safePage - 1) * safeLimit;

	const [items, total] = await Promise.all([
		News.find().sort({ publishedAt: -1 }).skip(skip).limit(safeLimit).lean<NewsDocument[]>(),
		News.countDocuments(),
	]);

	return {
		items,
		total,
		page: safePage,
		limit: safeLimit,
	};
}

async function storeNews(items: NewsItem[]) {
	if (!items.length) return;

	const { default: News } = await import("@/models/News");
	const { connectToDatabase } = await import("@/lib/mongodb");
	await connectToDatabase();

	const ops = items.map((item) => ({
		updateOne: {
			filter: { externalId: item.externalId ?? Number(item.id) },
			update: {
				externalId: item.externalId ?? Number(item.id),
				title: item.title,
				summary: item.summary,
				url: item.url,
				source: item.source,
				publishedAt: new Date(item.publishedAt),
				image: item.image,
				category: item.category,
			},
			upsert: true,
		},
	}));

	if (ops.length) {
		try {
			await News.bulkWrite(ops, { ordered: false });
		} catch {
			// Ignore duplicate key errors in unordered bulk ops.
		}
	}
}
