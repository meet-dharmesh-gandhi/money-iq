"use client";

import Navbar from "@/components/Navbar";
import type { AuthUser } from "@/types/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function AddAdvicePage() {
	const router = useRouter();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const stored = localStorage.getItem("authUser");
		if (!stored) {
			router.push("/login");
			return;
		}

		try {
			const authUser = JSON.parse(stored) as AuthUser;
			if (authUser.role !== "admin") {
				router.push("/dashboard/expert-videos");
				return;
			}
			setUser(authUser);
		} catch {
			router.push("/login");
		} finally {
			setIsLoading(false);
		}
	}, [router]);

	const handleLogout = useCallback(() => {
		localStorage.removeItem("authToken");
		localStorage.removeItem("authUser");
		router.push("/");
	}, [router]);

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
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<Navbar
				variant="solid"
				actions={[
					{ type: "label", label: `Welcome, ${user.username}` },
					{ type: "button", label: "Logout", onClick: handleLogout },
				]}
			/>
			<main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
				<div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
					<h1 className="text-2xl font-semibold">Add advice (admin)</h1>
					<p className="mt-2 text-sm text-slate-600">
						This is a placeholder page. Form and API integration will be added in the
						next update.
					</p>
					<Link
						href="/dashboard/expert-videos"
						className="mt-4 inline-flex text-sm font-medium text-slate-900 underline"
					>
						Back to Expert Videos
					</Link>
				</div>
			</main>
		</div>
	);
}
