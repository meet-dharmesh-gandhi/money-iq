"use client";

import Navbar from "@/components/Navbar";
import type { AuthUser } from "@/types/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ProfileUser = {
	id?: string;
	name?: string;
	username?: string;
	email?: string;
	role?: "user" | "admin";
};

type TransactionType = "buy" | "sell";

type PortfolioHolding = {
	id: string;
	symbol: string;
	company: string;
	transactionType: TransactionType;
	shares: number;
	avgPrice: number;
	currentPrice: number;
};

type ProfileResponse = {
	success: boolean;
	user?: ProfileUser;
	message?: string;
};

type HoldingsResponse = {
	success: boolean;
	items?: PortfolioHolding[];
	message?: string;
};

const PAGE_SIZE = 6;

const formatCurrency = (value: number) => {
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 2,
	}).format(value);
};

function getAuthHeaders() {
	const token = localStorage.getItem("authToken");
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	return headers;
}

function normalizeTransactionType(value: unknown): TransactionType {
	return String(value ?? "buy")
		.trim()
		.toLowerCase() === "sell"
		? "sell"
		: "buy";
}

export default function ProfilePage() {
	const router = useRouter();

	const [activeTab, setActiveTab] = useState<"portfolio" | "user-info">("portfolio");
	const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
	const [user, setUser] = useState<ProfileUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [requestingOtp, setRequestingOtp] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const [editField, setEditField] = useState<string | null>(null);
	const [editHoldingId, setEditHoldingId] = useState<string | null>(null);
	const [holdingDraft, setHoldingDraft] = useState<Partial<PortfolioHolding>>({});
	const [newEntryType, setNewEntryType] = useState<TransactionType>("buy");
	const [currentPage, setCurrentPage] = useState(1);

	const [userForm, setUserForm] = useState({
		name: "",
		username: "",
		email: "",
	});

	const [securityForm, setSecurityForm] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
		otp: "",
	});

	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const loadProfileData = async () => {
			const token = localStorage.getItem("authToken");
			if (!token) {
				router.push("/login");
				return;
			}

			const authUserRaw = localStorage.getItem("authUser");
			if (authUserRaw) {
				try {
					const authUser = JSON.parse(authUserRaw) as AuthUser;
					if (authUser.role === "admin") {
						router.push("/dashboard");
						return;
					}
				} catch {
					// Ignore malformed local auth payload
				}
			}

			try {
				const [profileRes, holdingsRes] = await Promise.all([
					fetch("/api/profile", { headers: getAuthHeaders() }),
					fetch("/api/profile/holdings", { headers: getAuthHeaders() }),
				]);

				if (profileRes.status === 401 || holdingsRes.status === 401) {
					localStorage.removeItem("authToken");
					localStorage.removeItem("authUser");
					router.push("/login");
					return;
				}

				const profileData = (await profileRes.json()) as ProfileResponse;
				const holdingsData = (await holdingsRes.json()) as HoldingsResponse;

				if (!profileData.success || !profileData.user) {
					throw new Error(profileData.message ?? "Failed to load profile.");
				}

				if (!holdingsData.success) {
					throw new Error(holdingsData.message ?? "Failed to load holdings.");
				}

				if (!isMounted) return;

				setUser(profileData.user);
				setUserForm({
					name: profileData.user.name ?? "",
					username: profileData.user.username ?? "",
					email: profileData.user.email ?? "",
				});

				setHoldings(
					Array.isArray(holdingsData.items)
						? holdingsData.items.map((item) => ({
								...item,
								transactionType: normalizeTransactionType(item.transactionType),
							}))
						: [],
				);

				const existingAuthUser = localStorage.getItem("authUser");
				if (existingAuthUser) {
					try {
						const parsed = JSON.parse(existingAuthUser) as AuthUser;
						localStorage.setItem(
							"authUser",
							JSON.stringify({
								...parsed,
								id: profileData.user?.id ?? parsed.id,
								username: profileData.user?.username ?? parsed.username,
								role: profileData.user?.role ?? parsed.role,
							}),
						);
					} catch {
						// Ignore malformed local auth payload
					}
				}
			} catch (error) {
				if (isMounted) {
					setErrorMessage(
						error instanceof Error ? error.message : "Failed to load profile data.",
					);
				}
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};

		loadProfileData();

		return () => {
			isMounted = false;
		};
	}, [router]);

	const hydratedUser = useMemo(
		() => ({
			name: userForm.name || user?.name || "user",
			username: userForm.username || user?.username || "demo_user",
			email: userForm.email || user?.email || "investor@moneyiq.app",
		}),
		[user, userForm],
	);

	const portfolio = useMemo(() => {
		const totalInvested = holdings.reduce((sum, item) => sum + item.shares * item.avgPrice, 0);
		const totalCurrent = holdings.reduce(
			(sum, item) => sum + item.shares * item.currentPrice,
			0,
		);
		const totalPnL = totalCurrent - totalInvested;
		const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

		return { totalInvested, totalCurrent, totalPnL, totalPnLPercent };
	}, [holdings]);

	const totalPages = Math.max(1, Math.ceil(holdings.length / PAGE_SIZE));
	const paginatedHoldings = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return holdings.slice(start, start + PAGE_SIZE);
	}, [holdings, currentPage]);

	useEffect(() => {
		if (currentPage > totalPages) setCurrentPage(totalPages);
	}, [currentPage, totalPages]);

	const canAttemptSave =
		securityForm.otp.trim().length === 6 &&
		(!!securityForm.currentPassword.trim() || !!securityForm.newPassword.trim());

	const handleAddPortfolioEntry = () => {
		void (async () => {
			setErrorMessage(null);
			const nextIndex = holdings.length + 1;

			try {
				const response = await fetch("/api/profile/holdings", {
					method: "POST",
					headers: getAuthHeaders(),
					body: JSON.stringify({
						symbol: `NEW${nextIndex}`,
						company: "New Portfolio Entry",
						transactionType: newEntryType,
						shares: 0,
						avgPrice: 0,
						currentPrice: 0,
					}),
				});

				const payload = (await response.json()) as {
					success: boolean;
					item?: PortfolioHolding;
					message?: string;
				};

				if (!response.ok || !payload.success || !payload.item) {
					setErrorMessage(payload.message ?? "Failed to create holding.");
					return;
				}

				const created: PortfolioHolding = {
					...payload.item,
					transactionType: normalizeTransactionType(payload.item.transactionType),
				};

				setHoldings((previous) => [...previous, created]);
				setCurrentPage(Math.ceil((holdings.length + 1) / PAGE_SIZE));
				setEditHoldingId(created.id);
				setHoldingDraft(created);
			} catch {
				setErrorMessage("Unable to add holding right now. Please try again.");
			}
		})();
	};

	const handleDeleteHolding = (id: string) => {
		void (async () => {
			setErrorMessage(null);

			try {
				const response = await fetch(`/api/profile/holdings/${id}`, {
					method: "DELETE",
					headers: getAuthHeaders(),
				});
				const payload = (await response.json()) as { success: boolean; message?: string };

				if (!response.ok || !payload.success) {
					setErrorMessage(payload.message ?? "Failed to delete holding.");
					return;
				}

				setHoldings((previous) => previous.filter((holding) => holding.id !== id));
				if (editHoldingId === id) {
					setEditHoldingId(null);
					setHoldingDraft({});
				}
			} catch {
				setErrorMessage("Unable to delete holding right now. Please try again.");
			}
		})();
	};

	const startHoldingEdit = (holding: PortfolioHolding) => {
		setEditHoldingId(holding.id);
		setHoldingDraft(holding);
	};

	const handleHoldingDraftChange = (
		field: "symbol" | "company" | "transactionType" | "shares" | "avgPrice" | "currentPrice",
		value: string,
	) => {
		setHoldingDraft((prev) => ({
			...prev,
			[field]:
				field === "symbol" || field === "company" || field === "transactionType"
					? value
					: Number(value),
		}));
	};

	const saveHolding = (holdingId: string) => {
		void (async () => {
			setErrorMessage(null);

			try {
				const response = await fetch(`/api/profile/holdings/${holdingId}`, {
					method: "PATCH",
					headers: getAuthHeaders(),
					body: JSON.stringify(holdingDraft),
				});

				const payload = (await response.json()) as {
					success: boolean;
					item?: PortfolioHolding;
					message?: string;
				};

				if (!response.ok || !payload.success || !payload.item) {
					setErrorMessage(payload.message ?? "Failed to update holding.");
					return;
				}

				const updated: PortfolioHolding = {
					...payload.item,
					transactionType: normalizeTransactionType(payload.item.transactionType),
				};

				setHoldings((previous) =>
					previous.map((holding) => (holding.id === holdingId ? updated : holding)),
				);
				setEditHoldingId(null);
				setHoldingDraft({});
			} catch {
				setErrorMessage("Unable to update holding right now. Please try again.");
			}
		})();
	};

	const handleUserFieldChange = (field: "name" | "username" | "email", value: string) => {
		setUserForm((previous) => ({ ...previous, [field]: value }));
	};

	const handleSecurityFieldChange = (
		field: "currentPassword" | "newPassword" | "confirmPassword" | "otp",
		value: string,
	) => {
		setSecurityForm((previous) => ({ ...previous, [field]: value }));
	};

	const requireCurrentPasswordForSensitiveEdit = (field: "username" | "email") => {
		if (!securityForm.currentPassword.trim()) {
			setErrorMessage(`Enter your current password before editing ${field}.`);
			return;
		}
		setEditField(field);
	};

	const requestOtp = () => {
		void (async () => {
			if (!securityForm.currentPassword.trim()) {
				setErrorMessage("Enter current password before requesting OTP.");
				return;
			}

			setRequestingOtp(true);
			setErrorMessage(null);

			try {
				const response = await fetch("/api/profile/security/otp", {
					method: "POST",
					headers: getAuthHeaders(),
					body: JSON.stringify({ currentPassword: securityForm.currentPassword }),
				});
				const payload = (await response.json()) as { success: boolean; message?: string };

				if (!response.ok || !payload.success) {
					setErrorMessage(payload.message ?? "Failed to request OTP.");
				}
			} catch {
				setErrorMessage("Unable to send OTP right now. Please try again.");
			} finally {
				setRequestingOtp(false);
			}
		})();
	};

	const handleSaveProfile = () => {
		void (async () => {
			if (!canAttemptSave) {
				setErrorMessage(
					"Enter OTP and at least one password field (current or new) before saving.",
				);
				return;
			}

			setIsSaving(true);
			setErrorMessage(null);

			const usernameChanged =
				userForm.username.trim().toLowerCase() !== (user?.username ?? "").toLowerCase();
			const emailChanged =
				userForm.email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase();
			const passwordChangeRequested =
				securityForm.newPassword.trim().length > 0 ||
				securityForm.confirmPassword.trim().length > 0;
			const sensitiveChangeRequested =
				usernameChanged || emailChanged || passwordChangeRequested;
			const otpRequired = usernameChanged || passwordChangeRequested;

			if (sensitiveChangeRequested && !securityForm.currentPassword.trim()) {
				setErrorMessage(
					"Current password is required for username, email, or password changes.",
				);
				setIsSaving(false);
				return;
			}

			if (otpRequired && !securityForm.otp.trim()) {
				setErrorMessage("Enter OTP before saving username or password changes.");
				setIsSaving(false);
				return;
			}

			try {
				const response = await fetch("/api/profile", {
					method: "PATCH",
					headers: getAuthHeaders(),
					body: JSON.stringify({
						name: userForm.name,
						username: userForm.username,
						email: userForm.email,
						currentPassword: securityForm.currentPassword,
						newPassword: securityForm.newPassword,
						confirmPassword: securityForm.confirmPassword,
						otp: securityForm.otp,
					}),
				});

				const payload = (await response.json()) as {
					success: boolean;
					message?: string;
					user?: ProfileUser;
				};

				if (!response.ok || !payload.success || !payload.user) {
					setErrorMessage(payload.message ?? "Failed to save profile.");
					setIsSaving(false);
					return;
				}

				setUser(payload.user);
				setUserForm((previous) => ({
					...previous,
					name: payload.user?.name ?? previous.name,
					username: payload.user?.username ?? previous.username,
					email: payload.user?.email ?? previous.email,
				}));
				setEditField(null);
				setSecurityForm({
					currentPassword: "",
					newPassword: "",
					confirmPassword: "",
					otp: "",
				});

				const existingAuthUser = localStorage.getItem("authUser");
				if (existingAuthUser) {
					try {
						const parsed = JSON.parse(existingAuthUser) as AuthUser;
						localStorage.setItem(
							"authUser",
							JSON.stringify({
								...parsed,
								id: payload.user.id ?? parsed.id,
								username: payload.user.username ?? parsed.username,
								role: payload.user.role ?? parsed.role,
							}),
						);
					} catch {
						// Ignore malformed local auth payload
					}
				}
			} catch {
				setErrorMessage("Unable to save changes right now. Please try again.");
			} finally {
				setIsSaving(false);
			}
		})();
	};

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<p className="text-slate-600">Loading profile...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50">
			<Navbar
				variant="solid"
				actions={[
					{
						type: "link",
						label: "Dashboard",
						href: "/dashboard",
					},
				]}
			/>

			<main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
				{errorMessage && (
					<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
						{errorMessage}
					</div>
				)}

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
					<div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
								My Profile
							</p>
							<h1 className="mt-3 text-3xl font-semibold text-slate-900">
								{hydratedUser.name}
							</h1>
							<p className="mt-2 text-sm text-slate-600">
								Portfolio snapshot and account details in one place.
							</p>
						</div>

						<div className="grid w-full gap-3 sm:grid-cols-3 md:max-w-xl">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Total Invested
								</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{formatCurrency(portfolio.totalInvested)}
								</p>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Current Value
								</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{formatCurrency(portfolio.totalCurrent)}
								</p>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Total P/L
								</p>
								<p
									className={`mt-2 text-lg font-semibold ${
										portfolio.totalPnL >= 0
											? "text-emerald-600"
											: "text-rose-600"
									}`}
								>
									{formatCurrency(portfolio.totalPnL)} (
									{portfolio.totalPnLPercent.toFixed(2)}%)
								</p>
							</div>
						</div>
					</div>
				</section>

				<section className="space-y-5">
					<div className="flex items-center justify-center">
						<div className="inline-flex w-full gap-4">
							<button
								type="button"
								onClick={() => setActiveTab("portfolio")}
								className={`w-full cursor-pointer rounded-xl border border-slate-200 px-8 py-4 text-sm font-semibold shadow-sm transition-all ${
									activeTab === "portfolio"
										? "bg-slate-900 text-white"
										: "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
								}`}
							>
								Portfolio
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("user-info")}
								className={`w-full cursor-pointer rounded-xl border border-slate-200 px-8 py-4 text-sm font-semibold shadow-sm transition-all ${
									activeTab === "user-info"
										? "bg-slate-900 text-white"
										: "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
								}`}
							>
								User Information
							</button>
						</div>
					</div>

					{activeTab === "portfolio" && (
						<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
							<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-3">
									<h2 className="text-xl font-semibold text-slate-900">
										Portfolio Holdings
									</h2>
									<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
										{holdings.length} Positions
									</span>
								</div>

								<div className="flex flex-wrap items-center gap-3">
									<div className="inline-flex rounded-full border border-slate-300 p-1">
										<button
											type="button"
											onClick={() => setNewEntryType("buy")}
											className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
												newEntryType === "buy"
													? "bg-emerald-600 text-white"
													: "text-slate-600 hover:bg-slate-100"
											}`}
										>
											Bought
										</button>
										<button
											type="button"
											onClick={() => setNewEntryType("sell")}
											className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
												newEntryType === "sell"
													? "bg-rose-600 text-white"
													: "text-slate-600 hover:bg-slate-100"
											}`}
										>
											Sold
										</button>
									</div>
									<button
										type="button"
										onClick={handleAddPortfolioEntry}
										className="w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
									>
										Add Entry
									</button>
								</div>
							</div>

							<div className="overflow-hidden rounded-2xl border border-slate-200">
								<table className="min-w-full divide-y divide-slate-200 text-sm">
									<thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
										<tr>
											<th className="px-4 py-3 font-medium">Stock</th>
											<th className="px-4 py-3 font-medium">Type</th>
											<th className="px-4 py-3 font-medium">Shares</th>
											<th className="px-4 py-3 font-medium">Avg Price</th>
											<th className="px-4 py-3 font-medium">LTP</th>
											<th className="px-4 py-3 font-medium">P/L</th>
											<th className="px-4 py-3 font-medium">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-200 bg-white text-slate-700">
										{paginatedHoldings.map((holding) => {
											const isEditing = editHoldingId === holding.id;
											const displayHolding = isEditing
												? ({
														...holding,
														...holdingDraft,
													} as PortfolioHolding)
												: holding;
											const displayPnl =
												(displayHolding.currentPrice -
													displayHolding.avgPrice) *
												displayHolding.shares;

											return (
												<tr key={holding.id}>
													<td className="px-4 py-3">
														{isEditing ? (
															<div className="space-y-2">
																<input
																	type="text"
																	value={displayHolding.symbol}
																	onChange={(event) =>
																		handleHoldingDraftChange(
																			"symbol",
																			event.target.value,
																		)
																	}
																	className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
																/>
																<input
																	type="text"
																	value={displayHolding.company}
																	onChange={(event) =>
																		handleHoldingDraftChange(
																			"company",
																			event.target.value,
																		)
																	}
																	className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
																/>
															</div>
														) : (
															<>
																<p className="font-semibold text-slate-900">
																	{holding.symbol}
																</p>
																<p className="text-xs text-slate-500">
																	{holding.company}
																</p>
															</>
														)}
													</td>
													<td className="px-4 py-3">
														{isEditing ? (
															<select
																value={
																	displayHolding.transactionType
																}
																onChange={(event) =>
																	handleHoldingDraftChange(
																		"transactionType",
																		event.target.value,
																	)
																}
																className="rounded-md border border-slate-300 px-2 py-1 text-xs"
															>
																<option value="buy">Bought</option>
																<option value="sell">Sold</option>
															</select>
														) : (
															<span
																className={`rounded-full px-2 py-1 text-xs font-semibold ${
																	holding.transactionType ===
																	"sell"
																		? "bg-rose-100 text-rose-700"
																		: "bg-emerald-100 text-emerald-700"
																}`}
															>
																{holding.transactionType === "sell"
																	? "Sold"
																	: "Bought"}
															</span>
														)}
													</td>
													<td className="px-4 py-3">
														{isEditing ? (
															<input
																type="number"
																min={0}
																step="0.01"
																value={displayHolding.shares}
																onChange={(event) =>
																	handleHoldingDraftChange(
																		"shares",
																		event.target.value,
																	)
																}
																className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs"
															/>
														) : (
															holding.shares
														)}
													</td>
													<td className="px-4 py-3">
														{isEditing ? (
															<input
																type="number"
																min={0}
																step="0.01"
																value={displayHolding.avgPrice}
																onChange={(event) =>
																	handleHoldingDraftChange(
																		"avgPrice",
																		event.target.value,
																	)
																}
																className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs"
															/>
														) : (
															formatCurrency(holding.avgPrice)
														)}
													</td>
													<td className="px-4 py-3">
														{isEditing ? (
															<input
																type="number"
																min={0}
																step="0.01"
																value={displayHolding.currentPrice}
																onChange={(event) =>
																	handleHoldingDraftChange(
																		"currentPrice",
																		event.target.value,
																	)
																}
																className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs"
															/>
														) : (
															formatCurrency(holding.currentPrice)
														)}
													</td>
													<td
														className={`px-4 py-3 font-medium ${
															displayPnl >= 0
																? "text-emerald-600"
																: "text-rose-600"
														}`}
													>
														{formatCurrency(displayPnl)}
													</td>
													<td className="px-4 py-3">
														<div className="flex gap-2">
															<button
																type="button"
																onClick={() => {
																	if (isEditing) {
																		saveHolding(holding.id);
																		return;
																	}
																	startHoldingEdit(holding);
																}}
																className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
															>
																{isEditing ? "Save" : "Edit"}
															</button>
															{isEditing && (
																<button
																	type="button"
																	onClick={() => {
																		setEditHoldingId(null);
																		setHoldingDraft({});
																	}}
																	className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
																>
																	Cancel
																</button>
															)}
															<button
																type="button"
																onClick={() =>
																	handleDeleteHolding(holding.id)
																}
																className="rounded-full border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 transition hover:border-rose-500 hover:text-rose-800"
															>
																Delete
															</button>
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							<div className="mt-5 flex items-center justify-between">
								<p className="text-sm text-slate-500">
									Page {currentPage} of {totalPages}
								</p>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() =>
											setCurrentPage((page) => Math.max(1, page - 1))
										}
										disabled={currentPage <= 1}
										className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
									>
										Previous
									</button>
									<button
										type="button"
										onClick={() =>
											setCurrentPage((page) => Math.min(totalPages, page + 1))
										}
										disabled={currentPage >= totalPages}
										className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
									>
										Next
									</button>
								</div>
							</div>
						</div>
					)}

					{activeTab === "user-info" && (
						<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
							<div className="mb-6">
								<h2 className="text-xl font-semibold text-slate-900">
									Account Details
								</h2>
								<p className="mt-2 text-sm text-slate-600">
									Username and password changes require OTP verification. Username
									and email changes require your current password.
								</p>
							</div>

							<div className="space-y-4">
								<div>
									<div className="mb-1 flex items-center justify-between">
										<label
											className="block text-sm font-medium text-slate-700"
											htmlFor="name"
										>
											Name
										</label>
										<button
											type="button"
											onClick={() => setEditField("name")}
											className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
										>
											{editField === "name" ? "Editing" : "Edit"}
										</button>
									</div>
									<input
										id="name"
										type="text"
										value={userForm.name}
										onChange={(event) =>
											handleUserFieldChange("name", event.target.value)
										}
										readOnly={editField !== "name"}
										className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 ${
											editField === "name"
												? "border-slate-400 bg-white"
												: "border-slate-300 bg-slate-50"
										}`}
									/>
								</div>

								<div>
									<div className="mb-1 flex items-center justify-between">
										<label
											className="block text-sm font-medium text-slate-700"
											htmlFor="currentPassword"
										>
											Current Password
										</label>
									</div>
									<div className="relative">
										<input
											id="currentPassword"
											type={showCurrentPassword ? "text" : "password"}
											value={securityForm.currentPassword}
											onChange={(event) =>
												handleSecurityFieldChange(
													"currentPassword",
													event.target.value,
												)
											}
											placeholder="Required for username/email/password updates"
											className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900"
										/>
										<button
											type="button"
											onClick={() => setShowCurrentPassword((prev) => !prev)}
											className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 transition hover:text-slate-600"
											aria-label={
												showCurrentPassword
													? "Hide current password"
													: "Show current password"
											}
										>
											<Image
												src={
													showCurrentPassword
														? "/eye-open.svg"
														: "/eye-closed.svg"
												}
												alt=""
												width={20}
												height={20}
												className="h-5 w-5"
											/>
										</button>
									</div>
								</div>

								<div>
									<div className="mb-1 flex items-center justify-between">
										<label
											className="block text-sm font-medium text-slate-700"
											htmlFor="username"
										>
											Username
										</label>
										<button
											type="button"
											onClick={() =>
												requireCurrentPasswordForSensitiveEdit("username")
											}
											className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
										>
											{editField === "username" ? "Editing" : "Edit"}
										</button>
									</div>
									<input
										id="username"
										type="text"
										value={userForm.username}
										onChange={(event) =>
											handleUserFieldChange("username", event.target.value)
										}
										readOnly={editField !== "username"}
										className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 ${
											editField === "username"
												? "border-slate-400 bg-white"
												: "border-slate-300 bg-slate-50"
										}`}
									/>
								</div>

								<div>
									<div className="mb-1 flex items-center justify-between">
										<label
											className="block text-sm font-medium text-slate-700"
											htmlFor="email"
										>
											Email
										</label>
										<button
											type="button"
											onClick={() =>
												requireCurrentPasswordForSensitiveEdit("email")
											}
											className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
										>
											{editField === "email" ? "Editing" : "Edit"}
										</button>
									</div>
									<input
										id="email"
										type="email"
										value={userForm.email}
										onChange={(event) =>
											handleUserFieldChange("email", event.target.value)
										}
										readOnly={editField !== "email"}
										className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 ${
											editField === "email"
												? "border-slate-400 bg-white"
												: "border-slate-300 bg-slate-50"
										}`}
									/>
								</div>

								<div>
									<div className="mb-1 flex items-center justify-between">
										<label
											className="block text-sm font-medium text-slate-700"
											htmlFor="newPassword"
										>
											New Password
										</label>
									</div>
									<div className="relative">
										<input
											id="newPassword"
											type={showNewPassword ? "text" : "password"}
											value={securityForm.newPassword}
											onChange={(event) =>
												handleSecurityFieldChange(
													"newPassword",
													event.target.value,
												)
											}
											placeholder="Leave blank if not changing password"
											className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900"
										/>
										<button
											type="button"
											onClick={() => setShowNewPassword((prev) => !prev)}
											className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 transition hover:text-slate-600"
											aria-label={
												showNewPassword
													? "Hide new password"
													: "Show new password"
											}
										>
											<Image
												src={
													showNewPassword
														? "/eye-open.svg"
														: "/eye-closed.svg"
												}
												alt=""
												width={20}
												height={20}
												className="h-5 w-5"
											/>
										</button>
									</div>
								</div>

								<div>
									<div className="mb-1 flex items-center justify-between">
										<label
											className="block text-sm font-medium text-slate-700"
											htmlFor="confirmPassword"
										>
											Confirm New Password
										</label>
									</div>
									<div className="relative">
										<input
											id="confirmPassword"
											type={showConfirmPassword ? "text" : "password"}
											value={securityForm.confirmPassword}
											onChange={(event) =>
												handleSecurityFieldChange(
													"confirmPassword",
													event.target.value,
												)
											}
											className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900"
										/>
										<button
											type="button"
											onClick={() => setShowConfirmPassword((prev) => !prev)}
											className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 transition hover:text-slate-600"
											aria-label={
												showConfirmPassword
													? "Hide confirm password"
													: "Show confirm password"
											}
										>
											<Image
												src={
													showConfirmPassword
														? "/eye-open.svg"
														: "/eye-closed.svg"
												}
												alt=""
												width={20}
												height={20}
												className="h-5 w-5"
											/>
										</button>
									</div>
								</div>

								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
										OTP Verification
									</p>
									<p className="mt-2 text-sm text-slate-600">
										Required when changing username or password.
									</p>
									<div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
										<input
											type="text"
											inputMode="numeric"
											maxLength={6}
											placeholder="Enter 6-digit OTP"
											value={securityForm.otp}
											onChange={(event) =>
												handleSecurityFieldChange("otp", event.target.value)
											}
											className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900"
										/>
										<button
											type="button"
											onClick={requestOtp}
											disabled={requestingOtp}
											className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
										>
											{requestingOtp ? "Sending OTP..." : "Send OTP"}
										</button>
									</div>
								</div>
							</div>

							<div className="mt-6 flex gap-3">
								<button
									type="button"
									onClick={handleSaveProfile}
									disabled={isSaving || !canAttemptSave}
									className={`rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 ${
										!canAttemptSave ? "blur-[1px]" : ""
									}`}
								>
									{isSaving ? "Saving..." : "Save Changes"}
								</button>
							</div>
						</div>
					)}
				</section>
			</main>
		</div>
	);
}
