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

export function extractYouTubeVideoId(videoUrl: string) {
	try {
		const parsed = new URL(videoUrl.trim());
		const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

		if (host === "youtu.be") {
			const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
			return id || null;
		}

		if (host === "youtube.com" || host === "m.youtube.com") {
			if (parsed.pathname === "/watch") {
				return parsed.searchParams.get("v") || null;
			}

			if (parsed.pathname.startsWith("/shorts/")) {
				return parsed.pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
			}

			if (parsed.pathname.startsWith("/embed/")) {
				return parsed.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
			}
		}

		return null;
	} catch {
		return null;
	}
}

function normalizeYouTubeUrl(videoId: string) {
	return `https://www.youtube.com/watch?v=${videoId}`;
}

function getYouTubeThumbnail(videoId: string) {
	return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
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

export async function getAdminExpertVideosPage(page: number, limit: number) {
	const { default: ExpertVideo } = await import("@/models/ExpertVideo");
	const { connectToDatabase } = await import("@/lib/mongodb");

	const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
	const safeLimit = Math.min(30, Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 8));
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

export async function createExpertVideoFromUrl(videoUrl: string) {
	const { default: ExpertVideo } = await import("@/models/ExpertVideo");
	const { connectToDatabase } = await import("@/lib/mongodb");

	const videoId = extractYouTubeVideoId(videoUrl);
	if (!videoId) {
		throw new Error("Valid YouTube URL is required");
	}

	await connectToDatabase();

	const normalizedUrl = normalizeYouTubeUrl(videoId);
	const now = new Date();

	const created = await ExpertVideo.create({
		title: `YouTube video ${videoId}`,
		videoUrl: normalizedUrl,
		publishedAt: now,
		thumbnailUrl: getYouTubeThumbnail(videoId),
		isActive: true,
	});

	return created.toObject();
}

export async function updateExpertVideoUrl(videoId: string, videoUrl: string) {
	const { default: ExpertVideo } = await import("@/models/ExpertVideo");
	const { connectToDatabase } = await import("@/lib/mongodb");

	const parsedId = extractYouTubeVideoId(videoUrl);
	if (!parsedId) {
		throw new Error("Valid YouTube URL is required");
	}

	await connectToDatabase();

	const existing = await ExpertVideo.findById(videoId);
	if (!existing || !existing.isActive) {
		return null;
	}

	existing.videoUrl = normalizeYouTubeUrl(parsedId);
	existing.thumbnailUrl = getYouTubeThumbnail(parsedId);
	if (!existing.title?.trim()) {
		existing.title = `YouTube video ${parsedId}`;
	}

	await existing.save();
	return existing.toObject();
}

export async function deleteExpertVideo(videoId: string) {
	const { default: ExpertVideo } = await import("@/models/ExpertVideo");
	const { connectToDatabase } = await import("@/lib/mongodb");

	await connectToDatabase();

	const existing = await ExpertVideo.findById(videoId);
	if (!existing || !existing.isActive) {
		return null;
	}

	existing.isActive = false;
	await existing.save();

	return { _id: existing._id.toString() };
}
