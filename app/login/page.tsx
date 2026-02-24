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
	const isDevelopment = process.env.NODE_ENV === "development";

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
		<div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<Link
						href="/"
						className="inline-flex items-center justify-center gap-3 transition hover:opacity-80"
					>
						<Image
							src="/money-iq-logo.svg"
							alt="MoneyIQ Logo"
							width={40}
							height={40}
							className="h-10 w-10"
						/>
						<h1 className="text-4xl font-semibold text-slate-900">MoneyIQ</h1>
					</Link>
					<p className="mt-2 text-sm text-slate-600">Sign in to your account</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
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
							placeholder="Enter your username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none"
							disabled={isLoading}
						/>
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
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none"
								disabled={isLoading}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
								disabled={isLoading}
								aria-label={showPassword ? "Hide password" : "Show password"}
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
						className="w-full cursor-pointer rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isLoading ? "Signing in..." : "Sign in"}
					</button>
				</form>

				<div className="text-center text-sm text-slate-600">
					Don&rsquo;t have an account?{" "}
					<Link
						href="/signup"
						className="font-medium text-slate-900 transition hover:text-slate-700"
					>
						Sign up
					</Link>
				</div>

				{isDevelopment && (
					<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
						<p className="font-medium text-slate-900">Demo credentials:</p>
						<p className="mt-1">
							Admin: <code className="font-mono">admin</code> /{" "}
							<code className="font-mono">admin123</code>
						</p>
						<p>
							User: <code className="font-mono">user</code> /{" "}
							<code className="font-mono">user123</code>
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
