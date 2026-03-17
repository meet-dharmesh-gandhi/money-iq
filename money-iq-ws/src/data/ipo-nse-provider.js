const DEFAULT_HEADERS = {
	accept: "application/json, text/plain, */*",
	"user-agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
};

const REQUEST_TIMEOUT_MS = Number(process.env.NSE_IPO_TIMEOUT_MS || 8000);

const toArray = (payload) => {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (!payload || typeof payload !== "object") {
		return [];
	}

	const candidateKeys = [
		"data",
		"records",
		"issues",
		"result",
		"list",
		"upcomingIssues",
		"currentIssues",
		"ipoCurrentIssue",
		"ipoUpcomingIssue",
	];

	for (const key of candidateKeys) {
		if (Array.isArray(payload[key])) {
			return payload[key];
		}
	}

	for (const value of Object.values(payload)) {
		if (Array.isArray(value)) {
			return value;
		}
	}

	return [];
};

const parseNumber = (value, fallback = 0) => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const cleaned = value.replace(/,/g, "").trim();
		const matched = cleaned.match(/-?\d+(\.\d+)?/);
		if (matched) {
			const parsed = Number(matched[0]);
			if (Number.isFinite(parsed)) {
				return parsed;
			}
		}
	}

	return fallback;
};

const normalizeDate = (value) => {
	if (!value) {
		return "TBA";
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return String(value);
	}

	return parsed.toLocaleDateString("en-IN", {
		month: "short",
		day: "2-digit",
	});
};

const buildPriceBand = (issue) => {
	const explicit =
		issue.priceBand ||
		issue.price_band ||
		issue.issuePrice ||
		issue.issue_price ||
		issue.priceRange;
	if (explicit) {
		return String(explicit);
	}

	const lower =
		issue.floorPrice || issue.floor_price || issue.minPrice || issue.priceMin || issue.lowPrice;
	const upper =
		issue.capPrice || issue.cap_price || issue.maxPrice || issue.priceMax || issue.highPrice;

	if (lower || upper) {
		return `Rs. ${lower ?? "-"} - Rs. ${upper ?? "-"}`;
	}

	return "Price band TBA";
};

const normalizeName = (issue) => {
	return (
		issue.name ||
		issue.companyName ||
		issue.company ||
		issue.issueName ||
		issue.issue_name ||
		issue.symbol ||
		issue.securityName ||
		"Unknown IPO"
	);
};

const normalizeId = (issue, normalizedName) => {
	const explicit =
		issue.id ||
		issue.issueId ||
		issue.issue_id ||
		issue.symbol ||
		issue.securityCode ||
		issue.token;
	if (explicit) {
		return String(explicit).trim();
	}

	return normalizedName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
};

const normalizeSubscription = (issue) => {
	const candidates = [
		issue.subscription,
		issue.subscriptionTimes,
		issue.subscription_times,
		issue.totalSubscription,
		issue.total_subscription,
		issue.overallSubscription,
		issue.overall_subscription,
		issue.retailSubscription,
		issue.retail_subscription,
	];

	for (const candidate of candidates) {
		const parsed = parseNumber(candidate, Number.NaN);
		if (!Number.isNaN(parsed)) {
			return parsed;
		}
	}

	return 0;
};

const normalizeLotSize = (issue) => {
	const lotSize = parseNumber(
		issue.lotSize || issue.lot_size || issue.marketLot || issue.minLot || issue.minimumLot,
		0,
	);

	return Math.max(0, Math.floor(lotSize));
};

const normalizeIssue = (issue, sourceTag) => {
	const name = normalizeName(issue);

	return {
		id: normalizeId(issue, name),
		name,
		stage: sourceTag === "Current" ? "Open" : "Upcoming",
		sourceTag,
		priceBand: buildPriceBand(issue),
		subscription: normalizeSubscription(issue),
		closesOn: normalizeDate(issue.closeDate || issue.issueCloseDate || issue.closingDate),
		lotSize: normalizeLotSize(issue),
		timestamp: Date.now(),
	};
};

class IpoNseProvider {
	constructor(options = {}) {
		this.currentUrl = process.env.NSE_IPO_CURRENT;
		this.upcomingUrl = process.env.NSE_IPO_UPCOMING;
		this.cacheTtlMs = options.cacheTtlMs || 5000;
		this.lastFetchedAt = 0;
		this.cachedSnapshot = [];
	}

	async fetchUrl(url) {
		if (!url) {
			return [];
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
		try {
			const response = await fetch(url, {
				headers: DEFAULT_HEADERS,
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new Error(`NSE endpoint failed (${response.status})`);
			}

			return await response.json();
		} finally {
			clearTimeout(timeout);
		}
	}

	mergeAndDedupe(currentIssues, upcomingIssues) {
		const merged = [
			...currentIssues.map((issue) => normalizeIssue(issue, "Current")),
			...upcomingIssues.map((issue) => normalizeIssue(issue, "Upcoming")),
		];

		const uniqueById = new Map();
		for (const issue of merged) {
			if (!issue.id) {
				continue;
			}
			uniqueById.set(issue.id, issue);
		}

		return Array.from(uniqueById.values());
	}

	async fetchSnapshot(force = false) {
		const now = Date.now();
		if (
			!force &&
			now - this.lastFetchedAt < this.cacheTtlMs &&
			this.cachedSnapshot.length > 0
		) {
			return this.cachedSnapshot;
		}

		try {
			const [currentPayload, upcomingPayload] = await Promise.all([
				this.fetchUrl(this.currentUrl),
				this.fetchUrl(this.upcomingUrl),
			]);

			const snapshot = this.mergeAndDedupe(toArray(currentPayload), toArray(upcomingPayload));
			if (snapshot.length > 0) {
				this.cachedSnapshot = snapshot;
				this.lastFetchedAt = now;
			}
		} catch (error) {
			console.error("Failed to fetch NSE IPO snapshot:", error.message);
		}

		return this.cachedSnapshot;
	}
}

module.exports = IpoNseProvider;
