"use client";

import Navbar from "@/components/Navbar";
import type { AuthUser } from "@/types/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type AdviceItem = {
	_id: string;
	advice: string;
	adviceDate: string;
	createdAt: string;
};

type UserAdvicesResponse = {
	success: boolean;
	message?: string;
	items?: AdviceItem[];
};

function getAuthToken() {
	if (typeof window === "undefined") {
		return null;
	}
	return localStorage.getItem("authToken");
}

function formatDateLabel(date: string) {
	return new Date(date).toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function formatTimeLabel(date: string) {
	return new Date(date).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
}

export default function AdvicesPage() {
	const router = useRouter();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [tipsLoading, setTipsLoading] = useState(true);
	const [tipsError, setTipsError] = useState<string | null>(null);
	const [tips, setTips] = useState<AdviceItem[]>([]);

	const todayDateKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

	const groupedTipItems = useMemo(() => {
		const sortedItems = [...tips].sort(
			(a, b) => new Date(b.adviceDate).getTime() - new Date(a.adviceDate).getTime(),
		);

		const groupsMap = new Map<string, AdviceItem[]>();

		for (const item of sortedItems) {
			const dateKey = new Date(item.adviceDate).toISOString().slice(0, 10);
			const existing = groupsMap.get(dateKey) ?? [];
			existing.push(item);
			groupsMap.set(dateKey, existing);
		}

		return [...groupsMap.entries()]
			.sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
			.map(([date, items]) => ({
				date,
				isToday: date === todayDateKey,
				items: items.sort(
					(a, b) => new Date(b.adviceDate).getTime() - new Date(a.adviceDate).getTime(),
				),
			}));
	}, [tips, todayDateKey]);

	const fetchAllTips = useCallback(async () => {
		setTipsLoading(true);
		setTipsError(null);

		try {
			const token = getAuthToken();
			const response = await fetch("/api/expert-advices", {
				cache: "no-store",
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			});

			if (response.status === 401) {
				localStorage.removeItem("authToken");
				localStorage.removeItem("authUser");
				router.push("/login");
				return;
			}

			if (response.status === 403) {
				router.push("/dashboard");
				return;
			}

			const payload = (await response.json()) as UserAdvicesResponse;
			if (!response.ok || !payload.success) {
				throw new Error(payload.message || "Failed to fetch tips");
			}

			setTips(Array.isArray(payload.items) ? payload.items : []);
		} catch (error) {
			console.error("Failed to fetch user tips:", error);
			setTipsError(error instanceof Error ? error.message : "Failed to fetch tips");
			setTips([]);
		} finally {
			setTipsLoading(false);
		}
	}, [router]);

	useEffect(() => {
		const stored = localStorage.getItem("authUser");
		if (!stored) {
			router.push("/login");
			return;
		}

		try {
			const authUser = JSON.parse(stored) as AuthUser;
			if (authUser.role !== "user") {
				router.push("/dashboard");
				return;
			}
			setUser(authUser);
			void fetchAllTips();
		} catch {
			router.push("/login");
		} finally {
			setIsLoading(false);
		}
	}, [fetchAllTips, router]);

	const handleLogout = useCallback(() => {
		localStorage.removeItem("authToken");
		localStorage.removeItem("authUser");
		router.push("/");
	}, [router]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<p className="text-slate-600">Loading tips...</p>
			</div>
		);
	}

	if (!user) {
		return null;
	}

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
				<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="mb-4">
						<h1 className="text-2xl font-semibold text-slate-900">All Time Tips</h1>
					</div>
					{tipsLoading ? (
						<p className="text-sm text-slate-500">Loading all tips...</p>
					) : (
						<div className="space-y-6">
							{groupedTipItems.map((group) => (
								<section
									key={group.date}
									className="rounded-xl border border-slate-200 p-4"
								>
									<div className="flex flex-wrap items-center gap-2">
										<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
											{formatDateLabel(group.date)}
										</h2>
										{group.isToday && (
											<span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
												Today
											</span>
										)}
									</div>

									<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
										{group.items.map((item) => (
											<article
												key={item._id}
												className="rounded-lg bg-slate-50 p-4"
											>
												<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
													{formatTimeLabel(item.adviceDate)}
												</p>
												<p className="mt-2 text-sm leading-6 text-slate-800">
													{item.advice}
												</p>
											</article>
										))}
									</div>
								</section>
							))}

							{groupedTipItems.length === 0 && (
								<p className="text-sm text-slate-500">No tips available.</p>
							)}
						</div>
					)}
				</section>

				{tipsError && (
					<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
						{tipsError}
					</div>
				)}
			</main>
		</div>
	);
}
