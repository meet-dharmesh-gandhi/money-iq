"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { LoginRequest, LoginResponse } from "@/types/auth";

export default function LoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password } as LoginRequest),
			});

			const data = (await response.json()) as LoginResponse;

			if (!data.success) {
				setError(data.message || "Login failed.");
				setIsLoading(false);
				return;
			}

			// Store token and user data in localStorage
			if (data.token && data.user) {
				localStorage.setItem("authToken", data.token);
				localStorage.setItem("authUser", JSON.stringify(data.user));
			}

			// Redirect to dashboard
			router.push("/dashboard");
		} catch {
			setError("An error occurred. Please try again.");
			setIsLoading(false);
		}
	};

	return (
		<div className="flex justify-center items-center h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
				<div className="grid gap-0 md:grid-cols-2">
					<div className="relative hidden min-h-full flex-col justify-between bg-slate-900 p-10 text-white md:flex">
						<div>
							<Link
								href="/"
								className="inline-flex items-center gap-3 text-white/80 transition hover:text-white"
							>
								<Image
									src="/money-iq-logo.svg"
									alt="MoneyIQ logo"
									width={40}
									height={40}
									className="h-10 w-10"
								/>
								<h1 className="text-4xl font-semibold">MoneyIQ</h1>
							</Link>
							<p className="mt-6 text-lg text-white/80">
								Your intelligent companion for managing money, uncovering trends,
								and staying on top of markets.
							</p>
						</div>
						<div className="space-y-5 rounded-2xl bg-white/10 p-6 backdrop-blur">
							<h2 className="text-xl font-semibold">Why MoneyIQ?</h2>
							<ul className="space-y-3 text-sm text-white/80">
								<li>Real-time portfolio insights.</li>
								<li>Daily curated market intelligence.</li>
								<li>Actionable alerts with zero noise.</li>
							</ul>
						</div>
					</div>

					<div className="p-8 sm:p-10">
						<div className="mb-8 space-y-2 text-center md:text-left">
							<h2 className="text-3xl font-semibold text-slate-900">
								Sign in to your account
							</h2>
							<p className="text-sm text-slate-600">
								Verify your email with a one-time code to keep your account secure.
							</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-6">
							{error && (
								<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
									{error}
								</div>
							)}

							<div>
								<label
									htmlFor="username"
									className="block text-sm font-medium text-slate-700"
								>
									Username
								</label>
								<input
									id="username"
									type="text"
									placeholder="Choose a username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									autoComplete="username"
									disabled={isLoading}
									className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
								/>
								<p className="mt-1 text-xs text-slate-500">
									3+ characters, letters, numbers, underscores, hyphens only.
								</p>
							</div>

							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-slate-700"
								>
									Password
								</label>
								<div className="relative">
									<input
										id="password"
										type={showPassword ? "text" : "password"}
										placeholder="Enter password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none"
										disabled={isLoading}
									/>
									<button
										type="button"
										onClick={() => setShowPassword((prev) => !prev)}
										className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
										disabled={isLoading}
										aria-label={
											showPassword ? "Hide password" : "Show password"
										}
									>
										<Image
											src={showPassword ? "/eye-open.svg" : "/eye-closed.svg"}
											alt=""
											width={20}
											height={20}
											className="h-5 w-5"
										/>
									</button>
								</div>
							</div>

							<button
								type="submit"
								disabled={isLoading}
								className="w-full cursor-pointer rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isLoading ? "Signing in..." : "Sign in"}
							</button>
						</form>

						<div className="mt-8 text-center text-sm text-slate-600">
							Don&rsquo;t have an account?{" "}
							<Link
								href="/signup"
								className="font-medium text-slate-900 transition hover:text-slate-700"
							>
								Sign up
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
