"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { SignupRequest } from "@/lib/user-signup";

interface SignupResponse {
	success: boolean;
	message?: string;
	user?: { id: string; username: string; role: string };
	token?: string;
	errors?: string[];
}

export default function SignupPage() {
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [errors, setErrors] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setErrors([]);
		setIsLoading(true);

		try {
			const response = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username,
					password,
					confirmPassword,
				} as SignupRequest),
			});

			const data = (await response.json()) as SignupResponse;

			if (!data.success) {
				setError(data.message || "Signup failed.");
				if (data.errors && data.errors.length > 0) {
					setErrors(data.errors);
				}
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
					<p className="mt-2 text-sm text-slate-600">Create your account</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					{error && (
						<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
							{error}
						</div>
					)}

					{errors.length > 0 && (
						<div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
							<p className="text-xs font-medium text-rose-700 mb-2">
								Password requirements not met:
							</p>
							<ul className="space-y-1">
								{errors.map((err) => (
									<li
										key={err}
										className="text-xs text-rose-600 flex items-start gap-2"
									>
										<span className="text-rose-400 mt-0.5">•</span>
										{err}
									</li>
								))}
							</ul>
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
							className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none"
							disabled={isLoading}
						/>
						<p className="mt-1 text-xs text-slate-500">
							3+ characters, letters, numbers, underscores, hyphens only
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

					<div>
						<label
							htmlFor="confirmPassword"
							className="block text-sm font-medium text-slate-700"
						>
							Confirm Password
						</label>
						<div className="relative">
							<input
								id="confirmPassword"
								type={showConfirmPassword ? "text" : "password"}
								placeholder="Confirm password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none"
								disabled={isLoading}
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
								disabled={isLoading}
								aria-label={showConfirmPassword ? "Hide password" : "Show password"}
							>
								<Image
									src={showConfirmPassword ? "/eye-open.svg" : "/eye-closed.svg"}
									alt=""
									width={20}
									height={20}
									className="h-5 w-5"
								/>
							</button>
						</div>
					</div>

					<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
						<p className="font-medium text-slate-900 mb-2">Password must contain:</p>
						<ul className="space-y-1">
							<li>✓ At least 8 characters</li>
							<li>✓ Uppercase letter (A-Z)</li>
							<li>✓ Lowercase letter (a-z)</li>
							<li>✓ Number (0-9)</li>
							<li>✓ Special character (!@#$%^&...)</li>
							<li>✓ No more than 2 consecutive identical characters</li>
							<li>✓ No sequential characters (abc, 123)</li>
							<li>✓ No common passwords or your username</li>
						</ul>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full cursor-pointer rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isLoading ? "Creating account..." : "Create account"}
					</button>
				</form>

				<div className="text-center text-sm text-slate-600">
					Already have an account?{" "}
					<Link
						href="/login"
						className="font-medium text-slate-900 transition hover:text-slate-700"
					>
						Sign in
					</Link>
				</div>
			</div>
		</div>
	);
}
