"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type VideoItem = {
	_id: string;
	title: string;
	videoUrl: string;
	publishedAt: string;
	description?: string;
	channelName?: string;
	thumbnailUrl?: string;
};

type VideoGroup = {
	date: string;
	items: VideoItem[];
};

type AdminExpertVideosResponse = {
	success: boolean;
	message?: string;
	groups?: VideoGroup[];
	total?: number;
	page?: number;
	limit?: number;
};

const PAGE_LIMIT = 8;

function getAuthToken() {
	if (typeof window === "undefined") {
		return null;
	}
	return localStorage.getItem("authToken");
}

function getSafeYouTubeUrl(videoUrl: string) {
	try {
		const parsed = new URL(videoUrl);
		if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
			return videoUrl;
		}
		return null;
	} catch {
		return null;
	}
}

export default function AdminExpertVideosManager() {
	const [groups, setGroups] = useState<VideoGroup[]>([]);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [newVideoUrl, setNewVideoUrl] = useState("");
	const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
	const [editingVideoUrl, setEditingVideoUrl] = useState("");

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(total / PAGE_LIMIT));
	}, [total]);

	const fetchVideos = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const token = getAuthToken();
			const response = await fetch(
				`/api/admin/expert-videos?page=${page}&limit=${PAGE_LIMIT}`,
				{
					cache: "no-store",
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				},
			);

			const payload = (await response.json()) as AdminExpertVideosResponse;
			if (!response.ok || !payload.success) {
				throw new Error(payload.message || "Failed to fetch videos");
			}

			setGroups(Array.isArray(payload.groups) ? payload.groups : []);
			setTotal(typeof payload.total === "number" ? payload.total : 0);
		} catch (fetchError) {
			console.error("Failed to fetch admin expert videos:", fetchError);
			setError(
				fetchError instanceof Error ? fetchError.message : "Failed to fetch expert videos",
			);
			setGroups([]);
			setTotal(0);
		} finally {
			setIsLoading(false);
		}
	}, [page]);

	useEffect(() => {
		void fetchVideos();
	}, [fetchVideos]);

	const createVideo = useCallback(async () => {
		const trimmed = newVideoUrl.trim();
		if (!trimmed) {
			setError("YouTube URL is required.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const token = getAuthToken();
			const response = await fetch("/api/admin/expert-videos", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({ videoUrl: trimmed }),
			});

			const payload = (await response.json()) as { success?: boolean; message?: string };
			if (!response.ok || !payload.success) {
				throw new Error(payload.message || "Failed to add video");
			}

			setNewVideoUrl("");
			setPage(1);
			await fetchVideos();
		} catch (submitError) {
			console.error("Failed to create video:", submitError);
			setError(submitError instanceof Error ? submitError.message : "Failed to create video");
		} finally {
			setIsSubmitting(false);
		}
	}, [fetchVideos, newVideoUrl]);

	const startEditing = useCallback((item: VideoItem) => {
		setEditingVideoId(item._id);
		setEditingVideoUrl(item.videoUrl);
	}, []);

	const cancelEditing = useCallback(() => {
		setEditingVideoId(null);
		setEditingVideoUrl("");
	}, []);

	const saveEditedVideo = useCallback(async () => {
		if (!editingVideoId) {
			return;
		}

		const trimmed = editingVideoUrl.trim();
		if (!trimmed) {
			setError("YouTube URL is required.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const token = getAuthToken();
			const response = await fetch(`/api/admin/expert-videos/${editingVideoId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({ videoUrl: trimmed }),
			});

			const payload = (await response.json()) as { success?: boolean; message?: string };
			if (!response.ok || !payload.success) {
				throw new Error(payload.message || "Failed to update video");
			}

			cancelEditing();
			await fetchVideos();
		} catch (saveError) {
			console.error("Failed to update video:", saveError);
			setError(saveError instanceof Error ? saveError.message : "Failed to update video");
		} finally {
			setIsSubmitting(false);
		}
	}, [cancelEditing, editingVideoId, editingVideoUrl, fetchVideos]);

	const deleteVideo = useCallback(
		async (videoId: string) => {
			setIsSubmitting(true);
			setError(null);

			try {
				const token = getAuthToken();
				const response = await fetch(`/api/admin/expert-videos/${videoId}`, {
					method: "DELETE",
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				});

				const payload = (await response.json()) as { success?: boolean; message?: string };
				if (!response.ok || !payload.success) {
					throw new Error(payload.message || "Failed to delete video");
				}

				await fetchVideos();
			} catch (deleteError) {
				console.error("Failed to delete video:", deleteError);
				setError(
					deleteError instanceof Error ? deleteError.message : "Failed to delete video",
				);
			} finally {
				setIsSubmitting(false);
			}
		},
		[fetchVideos],
	);

	return (
		<section className="space-y-6">
			<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Admin
				</p>
				<h2 className="mt-2 text-2xl font-semibold text-slate-900">
					Expert videos manager
				</h2>
				<p className="mt-1 text-sm text-slate-600">
					Add videos by YouTube URL and manage videos in grouped, paginated cards.
				</p>
			</div>

			<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h3 className="text-lg font-semibold text-slate-900">Add video</h3>
				<div className="mt-3 flex flex-col gap-3 sm:flex-row">
					<input
						type="url"
						value={newVideoUrl}
						onChange={(event) => setNewVideoUrl(event.target.value)}
						placeholder="Paste YouTube link..."
						className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
					/>
					<button
						type="button"
						onClick={createVideo}
						disabled={isSubmitting}
						className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
					>
						Add video
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex items-center justify-between gap-3">
					<h3 className="text-lg font-semibold text-slate-900">All videos</h3>
					<span className="text-sm text-slate-500">
						Page {page} of {totalPages}
					</span>
				</div>

				{isLoading ? (
					<p className="mt-4 text-sm text-slate-500">Loading videos...</p>
				) : (
					<div className="mt-4 space-y-4">
						{groups.map((group) => (
							<section
								key={group.date}
								className="rounded-xl border border-slate-200 p-4"
							>
								<h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
									{new Date(group.date).toLocaleDateString("en-US", {
										weekday: "long",
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
								</h4>

								<div className="mt-3 grid gap-4 md:grid-cols-2">
									{group.items.map((item) => {
										const isEditing = editingVideoId === item._id;
										const safeUrl = getSafeYouTubeUrl(item.videoUrl);

										return (
											<article
												key={item._id}
												className="rounded-xl bg-slate-50 p-4"
											>
												<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
													{new Date(item.publishedAt).toLocaleTimeString(
														"en-US",
														{
															hour: "numeric",
															minute: "2-digit",
														},
													)}
												</p>
												{item.thumbnailUrl && (
													<Image
														src={item.thumbnailUrl}
														alt={item.title || "YouTube thumbnail"}
														width={640}
														height={360}
														className="mt-2 h-36 w-full rounded-lg object-cover"
														unoptimized
													/>
												)}

												{isEditing ? (
													<input
														type="url"
														value={editingVideoUrl}
														onChange={(event) =>
															setEditingVideoUrl(event.target.value)
														}
														className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
													/>
												) : (
													<>
														<p className="mt-2 text-sm font-medium text-slate-900">
															{item.title}
														</p>
														{safeUrl ? (
															<Link
																href={safeUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="mt-2 inline-flex text-xs font-semibold text-slate-700 underline"
															>
																Open video
															</Link>
														) : (
															<p className="mt-2 text-xs text-red-600">
																Invalid YouTube URL
															</p>
														)}
													</>
												)}

												<div className="mt-3 flex gap-2">
													{isEditing ? (
														<>
															<button
																type="button"
																onClick={saveEditedVideo}
																disabled={isSubmitting}
																className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
															>
																Save
															</button>
															<button
																type="button"
																onClick={cancelEditing}
																className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
															>
																Cancel
															</button>
														</>
													) : (
														<>
															<button
																type="button"
																onClick={() => startEditing(item)}
																className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
															>
																Edit URL
															</button>
															<button
																type="button"
																onClick={() =>
																	deleteVideo(item._id)
																}
																disabled={isSubmitting}
																className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
															>
																Delete
															</button>
														</>
													)}
												</div>
											</article>
										);
									})}
								</div>
							</section>
						))}

						{groups.length === 0 && (
							<p className="text-sm text-slate-500">No videos available.</p>
						)}
					</div>
				)}

				<div className="mt-4 flex items-center justify-between">
					<button
						type="button"
						onClick={() => setPage((prev) => Math.max(1, prev - 1))}
						disabled={page <= 1 || isLoading}
						className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
					>
						Previous
					</button>
					<button
						type="button"
						onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
						disabled={page >= totalPages || isLoading}
						className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
					>
						Next
					</button>
				</div>
			</div>

			{error && (
				<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					{error}
				</div>
			)}
		</section>
	);
}
