"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AdviceItem = {
	_id: string;
	advice: string;
	adviceDate: string;
	createdAt: string;
	updatedAt: string;
	isActive: boolean;
};

type AdminTipsResponse = {
	success: boolean;
	message?: string;
	todayItems?: AdviceItem[];
	pastItems?: AdviceItem[];
	totalPast?: number;
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

export default function AdminTipsManager() {
	const [todayItems, setTodayItems] = useState<AdviceItem[]>([]);
	const [pastItems, setPastItems] = useState<AdviceItem[]>([]);
	const [page, setPage] = useState(1);
	const [totalPast, setTotalPast] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [newAdvice, setNewAdvice] = useState("");
	const [editingAdviceId, setEditingAdviceId] = useState<string | null>(null);
	const [editingAdviceText, setEditingAdviceText] = useState("");

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(totalPast / PAGE_LIMIT));
	}, [totalPast]);

	const todayDateKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

	const groupedTipItems = useMemo(() => {
		const mergedItems = page === 1 ? [...todayItems, ...pastItems] : [...pastItems];

		const sortedItems = mergedItems.sort(
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
	}, [page, pastItems, todayDateKey, todayItems]);

	const fetchTips = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const token = getAuthToken();
			const response = await fetch(
				`/api/admin/expert-advices?page=${page}&limit=${PAGE_LIMIT}`,
				{
					cache: "no-store",
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				},
			);

			const payload = (await response.json()) as AdminTipsResponse;
			if (!response.ok || !payload.success) {
				throw new Error(payload.message || "Failed to fetch tips");
			}

			setTodayItems(Array.isArray(payload.todayItems) ? payload.todayItems : []);
			setPastItems(Array.isArray(payload.pastItems) ? payload.pastItems : []);
			setTotalPast(typeof payload.totalPast === "number" ? payload.totalPast : 0);
		} catch (fetchError) {
			console.error("Failed to fetch admin tips:", fetchError);
			setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch tips");
			setTodayItems([]);
			setPastItems([]);
			setTotalPast(0);
		} finally {
			setIsLoading(false);
		}
	}, [page]);

	useEffect(() => {
		void fetchTips();
	}, [fetchTips]);

	const createTodayTip = useCallback(async () => {
		const trimmed = newAdvice.trim();
		if (!trimmed) {
			setError("Tip text is required.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const token = getAuthToken();
			const response = await fetch("/api/admin/expert-advices", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({ advice: trimmed }),
			});

			const payload = (await response.json()) as { success?: boolean; message?: string };
			if (!response.ok || !payload.success) {
				throw new Error(payload.message || "Failed to add tip");
			}

			setNewAdvice("");
			await fetchTips();
		} catch (submitError) {
			console.error("Failed to create tip:", submitError);
			setError(submitError instanceof Error ? submitError.message : "Failed to create tip");
		} finally {
			setIsSubmitting(false);
		}
	}, [fetchTips, newAdvice]);

	const startEditing = useCallback((item: AdviceItem) => {
		setEditingAdviceId(item._id);
		setEditingAdviceText(item.advice);
	}, []);

	const cancelEditing = useCallback(() => {
		setEditingAdviceId(null);
		setEditingAdviceText("");
	}, []);

	const saveEditedTip = useCallback(async () => {
		if (!editingAdviceId) {
			return;
		}

		const trimmed = editingAdviceText.trim();
		if (!trimmed) {
			setError("Tip text is required.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const token = getAuthToken();
			const response = await fetch(`/api/admin/expert-advices/${editingAdviceId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({ advice: trimmed }),
			});

			const payload = (await response.json()) as { success?: boolean; message?: string };
			if (!response.ok || !payload.success) {
				throw new Error(payload.message || "Failed to update tip");
			}

			cancelEditing();
			await fetchTips();
		} catch (saveError) {
			console.error("Failed to update tip:", saveError);
			setError(saveError instanceof Error ? saveError.message : "Failed to update tip");
		} finally {
			setIsSubmitting(false);
		}
	}, [cancelEditing, editingAdviceId, editingAdviceText, fetchTips]);

	const deleteTip = useCallback(
		async (adviceId: string) => {
			setIsSubmitting(true);
			setError(null);

			try {
				const token = getAuthToken();
				const response = await fetch(`/api/admin/expert-advices/${adviceId}`, {
					method: "DELETE",
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				});

				const payload = (await response.json()) as { success?: boolean; message?: string };
				if (!response.ok || !payload.success) {
					throw new Error(payload.message || "Failed to delete tip");
				}

				await fetchTips();
			} catch (deleteError) {
				console.error("Failed to delete tip:", deleteError);
				setError(
					deleteError instanceof Error ? deleteError.message : "Failed to delete tip",
				);
			} finally {
				setIsSubmitting(false);
			}
		},
		[fetchTips],
	);

	return (
		<section className="space-y-6">
			<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Admin
				</p>
				<h1 className="mt-2 text-2xl font-semibold text-slate-900">Tips dashboard</h1>
				<p className="mt-1 text-sm text-slate-600">
					Add tips for today, then edit or delete any tip from the grouped timeline.
				</p>
			</div>

			<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 className="text-lg font-semibold text-slate-900">Add today&apos;s tip</h2>
				<div className="mt-3 flex flex-col gap-3">
					<textarea
						value={newAdvice}
						onChange={(event) => setNewAdvice(event.target.value)}
						rows={3}
						placeholder="Write a tip for today..."
						className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 text-black"
					/>
					<div>
						<button
							type="button"
							onClick={createTodayTip}
							disabled={isSubmitting}
							className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Add tip
						</button>
					</div>
				</div>
			</div>

			<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-lg font-semibold text-slate-900">All tips</h2>
					<span className="text-sm text-slate-500">
						Page {page} of {totalPages}
					</span>
				</div>

				{isLoading ? (
					<p className="mt-4 text-sm text-slate-500">Loading tips...</p>
				) : (
					<div className="mt-4 space-y-3">
						{groupedTipItems.map((group) => (
							<section
								key={group.date}
								className="rounded-xl border border-slate-200 p-4"
							>
								<div className="flex items-center gap-2">
									<h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
										{new Date(group.date).toLocaleDateString("en-US", {
											weekday: "long",
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</h3>
									{group.isToday && (
										<span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
											Today
										</span>
									)}
								</div>
								<div className="mt-3 space-y-3">
									{group.items.map((item) => {
										const isEditing = editingAdviceId === item._id;

										return (
											<div
												key={item._id}
												className="rounded-lg bg-slate-50 p-4"
											>
												<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
													{new Date(item.adviceDate).toLocaleTimeString(
														"en-US",
														{
															hour: "numeric",
															minute: "2-digit",
														},
													)}
												</p>
												{isEditing ? (
													<textarea
														value={editingAdviceText}
														onChange={(event) =>
															setEditingAdviceText(event.target.value)
														}
														rows={3}
														className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
													/>
												) : (
													<p className="mt-2 text-sm text-slate-800">
														{item.advice}
													</p>
												)}

												<div className="mt-3 flex gap-2">
													{isEditing ? (
														<>
															<button
																type="button"
																onClick={saveEditedTip}
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
																Edit
															</button>
															<button
																type="button"
																onClick={() => deleteTip(item._id)}
																disabled={isSubmitting}
																className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
															>
																Delete
															</button>
														</>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</section>
						))}

						{groupedTipItems.length === 0 && (
							<p className="text-sm text-slate-500">No tips available.</p>
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
