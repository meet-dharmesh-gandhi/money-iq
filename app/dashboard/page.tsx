"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthUser } from "@/types/auth";

export default function DashboardPage() {
	const router = useRouter();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Retrieve user from localStorage
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

	const handleLogout = () => {
		localStorage.removeItem("authToken");
		localStorage.removeItem("authUser");
		router.push("/");
	};

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<p className="text-slate-600">Loading...</p>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="border-b border-slate-200 bg-white">
				<nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
					<Link href="/" className="text-lg font-semibold text-slate-900">
						MoneyIQ
					</Link>
					<div className="flex items-center gap-4">
						<span className="text-sm text-slate-600">
							Welcome,{" "}
							<span className="font-medium text-slate-900">{user.username}</span>
						</span>
						<button
							onClick={handleLogout}
							className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
						>
							Logout
						</button>
					</div>
				</nav>
			</header>

			<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
				<div className="space-y-2">
					<h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
					<p className="text-slate-600">
						Role:{" "}
						<span className="font-medium capitalize text-slate-900">{user.role}</span>
					</p>
				</div>

				{user.role === "admin" && (
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">Admin Panel</h2>
						<div className="rounded-2xl border border-slate-200 bg-white p-6">
							<p className="text-slate-600">
								Admin-specific features will be displayed here.
							</p>
						</div>
					</section>
				)}

				{user.role === "user" && (
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">Your Portfolio</h2>
						<div className="rounded-2xl border border-slate-200 bg-white p-6">
							<p className="text-slate-600">
								User portfolio and watchlist will be displayed here.
							</p>
						</div>
					</section>
				)}

				<section className="space-y-4">
					<h2 className="text-xl font-semibold text-slate-900">Overview</h2>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div className="rounded-2xl border border-slate-200 bg-white p-4">
							<p className="text-sm text-slate-500">User ID</p>
							<p className="mt-1 text-lg font-semibold text-slate-900">{user.id}</p>
						</div>
						<div className="rounded-2xl border border-slate-200 bg-white p-4">
							<p className="text-sm text-slate-500">Username</p>
							<p className="mt-1 text-lg font-semibold text-slate-900">
								{user.username}
							</p>
						</div>
						<div className="rounded-2xl border border-slate-200 bg-white p-4">
							<p className="text-sm text-slate-500">Role</p>
							<p className="mt-1 text-lg font-semibold capitalize text-slate-900">
								{user.role}
							</p>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
