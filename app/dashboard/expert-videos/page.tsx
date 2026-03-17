"use client";

import Navbar from "@/components/Navbar";
import AdminExpertVideosManager from "@/components/dashboard/AdminExpertVideosManager";
import DashboardViewSwitch from "@/components/dashboard/DashboardViewSwitch";
import type { AuthUser } from "@/types/auth";
import type { ExpertVideoGroup } from "@/types/expert-videos/model";
import type { ExpertVideosPageResponse } from "@/types/expert-videos/pagination";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ExpertVideosState = {
	groups: ExpertVideoGroup[];
	total: number;
	limit: number;
};

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

export default function ExpertVideosPage() {
	const router = useRouter();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isPageLoading, setIsPageLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<ExpertVideosState>({ groups: [], total: 0, limit: 12 });

	useEffect(() => {
		const stored = localStorage.getItem("authUser");
		if (!stored) {
			router.push("/login");
			return;
		}

		try {
			const authUser = JSON.parse(stored) as AuthUser;
			setUser(authUser);
		} catch {
			router.push("/login");
		} finally {
			setIsLoading(false);
		}
	}, [router]);

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil((data.total || 0) / data.limit));
	}, [data.limit, data.total]);

	useEffect(() => {
		let isMounted = true;

		const fetchVideos = async () => {
			setIsPageLoading(true);
			setError(null);

			try {
				const response = await fetch(
					`/api/expert-videos?page=${page}&limit=${data.limit}`,
					{
						cache: "no-store",
					},
				);

				if (!response.ok) {
					throw new Error("Failed to fetch expert videos");
				}

				const payload = (await response.json()) as ExpertVideosPageResponse;
				if (!isMounted) {
					return;
				}

				setData({
					groups: payload.groups ?? [],
					total: payload.total ?? 0,
					limit: payload.limit ?? 12,
				});
			} catch (fetchError) {
				console.error("Failed to load expert videos:", fetchError);
				if (isMounted) {
					setError("Unable to load videos right now.");
					setData({ groups: [], total: 0, limit: data.limit });
				}
			} finally {
				if (isMounted) {
					setIsPageLoading(false);
				}
			}
		};

		void fetchVideos();

		return () => {
			isMounted = false;
		};
	}, [data.limit, page]);

	const handleLogout = useCallback(() => {
		localStorage.removeItem("authToken");
		localStorage.removeItem("authUser");
		router.push("/");
	}, [router]);

	const goToPreviousPage = useCallback(() => {
		setPage((prev) => Math.max(1, prev - 1));
	}, []);

	const goToNextPage = useCallback(() => {
		setPage((prev) => Math.min(totalPages, prev + 1));
	}, [totalPages]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<p className="text-slate-600">Loading expert videos...</p>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	const isAdmin = user.role === "admin";

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<Navbar
				variant="solid"
				actions={[
					{
						type: "link",
						label: `Welcome, ${user.username}`,
						href: "/profile",
						className: "text-sm text-slate-600",
					},
					{
						type: "button",
						label: "Logout",
						onClick: handleLogout,
					},
				]}
			/>

			<main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<DashboardViewSwitch activeView="expert-videos" />
					{!isAdmin && (
						<p className="text-sm text-slate-500">
							Page {page} of {totalPages}
						</p>
					)}
				</div>

				{isAdmin ? (
					<AdminExpertVideosManager />
				) : (
					<>
						<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
							<h1 className="text-2xl font-semibold">Expert videos</h1>
							<p className="mt-1 text-sm text-slate-600">
								Videos are grouped by date and sorted by publish time within each
								day.
							</p>
						</div>

						{isPageLoading && (
							<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
								Loading videos...
							</div>
						)}

						{error && !isPageLoading && (
							<div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
								{error}
							</div>
						)}

						{!isPageLoading && !error && data.groups.length === 0 && (
							<div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
								No videos found. Add documents to the expert-videos MongoDB
								collection.
							</div>
						)}

						{!isPageLoading && !error && data.groups.length > 0 && (
							<div className="space-y-6">
								{data.groups.map((group) => (
									<section
										key={group.date}
										className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
									>
										<h2 className="text-lg font-semibold text-slate-900">
											{new Date(group.date).toLocaleDateString("en-US", {
												weekday: "long",
												year: "numeric",
												month: "long",
												day: "numeric",
											})}
										</h2>
										<div className="mt-4 grid gap-4 md:grid-cols-2">
											{group.items.map((video) => {
												const safeUrl = getSafeYouTubeUrl(video.videoUrl);

												return (
													<article
														key={
															video._id ??
															`${video.videoUrl}-${video.publishedAt}`
														}
														className="rounded-xl border border-slate-200 p-4"
													>
														<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
															{new Date(
																video.publishedAt,
															).toLocaleTimeString("en-US", {
																hour: "numeric",
																minute: "2-digit",
															})}
														</p>
														<h3 className="mt-2 text-base font-semibold text-slate-900">
															{video.title}
														</h3>
														{video.channelName && (
															<p className="mt-1 text-sm text-slate-600">
																{video.channelName}
															</p>
														)}
														{video.description && (
															<p className="mt-2 text-sm text-slate-600 line-clamp-3">
																{video.description}
															</p>
														)}
														{safeUrl ? (
															<Link
																href={safeUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="mt-3 inline-flex text-sm font-medium text-slate-900 underline"
															>
																Watch on YouTube
															</Link>
														) : (
															<p className="mt-3 text-sm text-red-600">
																Invalid YouTube URL
															</p>
														)}
													</article>
												);
											})}
										</div>
									</section>
								))}
							</div>
						)}

						<div className="flex items-center justify-between pt-2">
							<button
								type="button"
								onClick={goToPreviousPage}
								disabled={page <= 1}
								className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
							>
								Previous
							</button>
							<button
								type="button"
								onClick={goToNextPage}
								disabled={page >= totalPages}
								className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
							>
								Next
							</button>
						</div>
					</>
				)}
			</main>
		</div>
	);
}
