import type { ExpertVideoDocument, ExpertVideoGroup } from "@/types/expert-videos/model";
import type { ExpertVideosPageResponse } from "@/types/expert-videos/pagination";

function getDateKey(dateValue: Date | string) {
	const date = new Date(dateValue);
	return date.toISOString().slice(0, 10);
}

function sortByPublishedAtDesc<T extends { publishedAt: Date | string }>(items: T[]) {
	return [...items].sort(
		(a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
	);
}

function groupVideosByDate(items: ExpertVideoDocument[]): ExpertVideoGroup[] {
	const groupsMap = new Map<string, ExpertVideoDocument[]>();

	for (const item of items) {
		const key = getDateKey(item.publishedAt);
		const existing = groupsMap.get(key) ?? [];
		existing.push(item);
		groupsMap.set(key, existing);
	}

	return [...groupsMap.entries()]
		.sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
		.map(([date, dateItems]) => ({
			date,
			items: sortByPublishedAtDesc(dateItems),
		}));
}

export async function getExpertVideosPage(
	page: number,
	limit: number,
): Promise<ExpertVideosPageResponse> {
	const { default: ExpertVideo } = await import("@/models/ExpertVideo");
	const { connectToDatabase } = await import("@/lib/mongodb");

	const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
	const safeLimit = Math.min(30, Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 12));
	const skip = (safePage - 1) * safeLimit;

	await connectToDatabase();

	const [items, total] = await Promise.all([
		ExpertVideo.find({ isActive: true })
			.sort({ publishedAt: -1 })
			.skip(skip)
			.limit(safeLimit)
			.lean<ExpertVideoDocument[]>(),
		ExpertVideo.countDocuments({ isActive: true }),
	]);

	const sortedItems = sortByPublishedAtDesc(items);

	return {
		items: sortedItems,
		groups: groupVideosByDate(sortedItems),
		total,
		page: safePage,
		limit: safeLimit,
	};
}
