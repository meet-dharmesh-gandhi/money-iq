"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SignupResponse = {
	success: boolean;
	message?: string;
	errors?: string[];
	requiresEmailVerification?: boolean;
	token?: string;
	user?: {
		id: string;
		username: string;
		role: "user" | "admin";
	};
};

const OTP_LENGTH = 6;
const GOOGLE_AUTH_PATH = "/api/auth/google/login";

export default function SignupPage() {
	const router = useRouter();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [otp, setOtp] = useState("");

	const [errors, setErrors] = useState<string[]>([]);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingOtp, setIsLoadingOtp] = useState(false);
	const [requiresOTP, setRequiresOTP] = useState(false);
	const [emailVerified, setEmailVerified] = useState(false);

	const resetFeedback = () => {
		setError("");
		setSuccess("");
		setErrors([]);
	};

	const sendOtpDisabled = useMemo(() => {
		return (
			emailVerified ||
			isLoading ||
			isLoadingOtp ||
			!name.trim() ||
			!email.trim() ||
			!username.trim() ||
			!password ||
			!confirmPassword ||
			password !== confirmPassword
		);
	}, [emailVerified, isLoading, isLoadingOtp, name, email, username, password, confirmPassword]);

	const submitDisabled = useMemo(() => {
		return emailVerified || !requiresOTP || otp.trim().length !== OTP_LENGTH || isLoading;
	}, [emailVerified, requiresOTP, otp, isLoading]);

	const persistAuthState = (data: SignupResponse) => {
		if (typeof window === "undefined") {
			return;
		}

		if (data.token) {
			localStorage.setItem("authToken", data.token);
		}

		if (data.user) {
			localStorage.setItem("authUser", JSON.stringify(data.user));
		}
	};

	const handleSendOTP = async () => {
		if (sendOtpDisabled) {
			return;
		}

		resetFeedback();
		setIsLoadingOtp(true);
		setEmailVerified(false);

		try {
			const response = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					username: username.trim(),
					password,
					confirmPassword,
				}),
			});

			const data = (await response.json()) as SignupResponse;

			if (response.ok && data.success && !data.requiresEmailVerification) {
				persistAuthState(data);
				setSuccess(data.message ?? "Account created successfully!");
				setEmailVerified(true);
				setRequiresOTP(false);
				router.push("/dashboard");
				return;
			}

			if (data.requiresEmailVerification) {
				setRequiresOTP(true);
				setSuccess(data.message ?? `We sent a verification code to ${email.trim()}.`);
				setErrors(data.errors ?? []);
				return;
			}

			setError(data.message ?? "Unable to send the OTP. Please try again.");
			setErrors(data.errors ?? []);
		} catch {
			setError("Something went wrong while sending the OTP. Please retry.");
		} finally {
			setIsLoadingOtp(false);
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		resetFeedback();

		if (submitDisabled) {
			if (!requiresOTP) {
				setError("Send a verification code before creating your account.");
			} else if (otp.trim().length !== OTP_LENGTH) {
				setError(`Enter the ${OTP_LENGTH}-digit verification code.`);
			}
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					username: username.trim(),
					password,
					confirmPassword,
					otp: otp.trim(),
				}),
			});

			const data = (await response.json()) as SignupResponse;

			if (response.ok && data.success) {
				persistAuthState(data);
				setEmailVerified(true);
				setRequiresOTP(false);
				setSuccess(data.message ?? "Account created successfully!");
				setOtp("");
				router.push("/dashboard");
				return;
			}

			setError(data.message ?? "Unable to create your account right now.");
			setErrors(data.errors ?? []);
			setEmailVerified(false);

			if (data.requiresEmailVerification) {
				setRequiresOTP(true);
			}
		} catch {
			setError("Something went wrong while creating your account. Please retry.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
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
								Create your account
							</h2>
							<p className="text-sm text-slate-600">
								Create an account with email OTP, or continue instantly with Google.
							</p>
						</div>

						<Link
							href={GOOGLE_AUTH_PATH}
							className="mb-5 inline-flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
						>
							<svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
								<path
									d="M21.35 11.1h-9.18v2.98h5.27c-.22 1.42-1.7 4.18-5.27 4.18-3.17 0-5.75-2.62-5.75-5.86s2.58-5.86 5.75-5.86c1.8 0 3 .76 3.69 1.42l2.52-2.43C16.78 3.96 14.7 3 12.17 3 7.38 3 3.5 6.92 3.5 11.77S7.38 20.54 12.17 20.54c6.03 0 8.42-4.24 8.42-6.42 0-.43-.05-.76-.11-1.09z"
									fill="#4285F4"
								/>
								<path
									d="M6.52 14.13l-.71.54-2.52 1.96A8.75 8.75 0 0012.17 20.54c2.53 0 4.61-.84 6.15-2.29l-2.92-2.27c-.78.55-1.8.94-3.23.94-3.5 0-5.88-2.36-6.64-2.79z"
									fill="#34A853"
								/>
								<path
									d="M3.29 7.01A8.85 8.85 0 003.5 11.77c0 1.72.49 3.33 1.33 4.66 0 0 3.16-2.45 3.2-2.49-.2-.59-.31-1.22-.31-1.87s.11-1.28.31-1.87L4.82 7.01z"
									fill="#FBBC05"
								/>
								<path
									d="M12.17 6.38c1.95 0 3.28.85 4.03 1.56l2.94-2.87C16.77 2.9 14.7 2 12.17 2 7.38 2 3.5 5.92 3.5 10.77c0 1.72.49 3.33 1.33 4.66l3.2-2.49c.76-2.3 3.14-5.56 4.14-6.56z"
									fill="#EA4335"
								/>
							</svg>
							Continue with Google
						</Link>

						<div className="mb-5 flex items-center gap-3">
							<div className="h-px flex-1 bg-slate-200" />
							<span className="text-xs uppercase tracking-wide text-slate-400">
								or
							</span>
							<div className="h-px flex-1 bg-slate-200" />
						</div>

						<form onSubmit={handleSubmit} className="space-y-6">
							{error && (
								<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
									{error}
								</div>
							)}

							{success && (
								<div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
									{success}
								</div>
							)}

							{errors.length > 0 && (
								<div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
									<p className="mb-2 text-xs font-semibold text-rose-700">
										Password requirements not met:
									</p>
									<ul className="space-y-1 text-xs text-rose-600">
										{errors.map((err) => (
											<li key={err} className="flex items-start gap-2">
												<span className="mt-0.5 text-rose-400">•</span>
												{err}
											</li>
										))}
									</ul>
								</div>
							)}

							<div>
								<label
									htmlFor="name"
									className="block text-sm font-medium text-slate-700"
								>
									Full Name
								</label>
								<input
									id="name"
									type="text"
									placeholder="Enter your full name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									disabled={isLoading || isLoadingOtp || emailVerified}
									className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
								/>
							</div>

							<div className="space-y-4">
								<div>
									<label
										htmlFor="email"
										className="block text-sm font-medium text-slate-700"
									>
										Email Address
									</label>
									<input
										id="email"
										type="email"
										placeholder="Enter your email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										autoComplete="email"
										disabled={
											requiresOTP ||
											isLoading ||
											isLoadingOtp ||
											emailVerified
										}
										className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
									/>
								</div>

								<div>
									<label
										htmlFor="otp"
										className="block text-sm font-medium text-slate-700"
									>
										Verification Code
									</label>
									<div className="mt-1 flex flex-col gap-3 sm:flex-row">
										<input
											id="otp"
											type="text"
											inputMode="numeric"
											placeholder="Enter 6-digit code"
											value={otp}
											onChange={(e) =>
												setOtp(
													e.target.value
														.replace(/\D/g, "")
														.slice(0, OTP_LENGTH),
												)
											}
											maxLength={OTP_LENGTH}
											disabled={!requiresOTP || isLoading || emailVerified}
											className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
										/>
										<button
											type="button"
											onClick={handleSendOTP}
											disabled={sendOtpDisabled}
											className="whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
										>
											{isLoadingOtp
												? requiresOTP
													? "Resending..."
													: "Sending..."
												: requiresOTP
													? "Resend OTP"
													: "Send OTP"}
										</button>
									</div>
									<p className="mt-1 text-xs text-slate-500">
										{requiresOTP
											? "Enter the 6-digit code we emailed to you."
											: "Send a one-time code to verify ownership of this email."}
									</p>
								</div>
							</div>

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
									disabled={isLoading || isLoadingOtp || emailVerified}
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
										autoComplete="new-password"
										disabled={isLoading || isLoadingOtp || emailVerified}
										className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
									/>
									<button
										type="button"
										onClick={() => setShowPassword((prev) => !prev)}
										disabled={isLoading || isLoadingOtp || emailVerified}
										className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
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
										autoComplete="new-password"
										disabled={isLoading || isLoadingOtp || emailVerified}
										className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-500 transition focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
									/>
									<button
										type="button"
										onClick={() => setShowConfirmPassword((prev) => !prev)}
										disabled={isLoading || isLoadingOtp || emailVerified}
										className="absolute right-3 top-1/2 -translate-y-1/2 transform text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
										aria-label={
											showConfirmPassword ? "Hide password" : "Show password"
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

							<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
								<p className="mb-2 font-medium text-slate-900">
									Password must contain:
								</p>
								<ul className="space-y-1">
									<li>✓ At least 8 characters</li>
									<li>✓ Uppercase & lowercase letters</li>
									<li>✓ Number and special character</li>
									<li>✓ No sequential or repeated characters</li>
								</ul>
							</div>

							<button
								type="submit"
								disabled={submitDisabled}
								className="w-full cursor-pointer rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isLoading ? "Creating account..." : "Create account"}
							</button>
						</form>

						<div className="mt-8 text-center text-sm text-slate-600">
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
			</div>
		</div>
	);
}
