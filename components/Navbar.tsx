"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type BaseAction = {
	id?: string;
	label: string;
	className?: string;
};

type LinkAction = BaseAction & {
	type: "link";
	href: string;
	variant?: "primary" | "ghost";
	target?: "_blank" | "_self";
	rel?: string;
};

type ButtonAction = BaseAction & {
	type: "button";
	onClick?: () => void;
	variant?: "primary" | "ghost";
	disabled?: boolean;
};

type LabelAction = BaseAction & {
	type: "label";
	muted?: boolean;
	subtle?: boolean;
};

export type NavbarAction = LinkAction | ButtonAction | LabelAction;

type NavbarProps = {
	variant?: "frosted" | "solid";
	actions?: NavbarAction[];
	brandHref?: string;
	brandLabel?: string;
	brandIcon?: ReactNode;
	className?: string;
	autoProfileLink?: boolean;
};

const headerVariants: Record<Required<NavbarProps>["variant"], string> = {
	frosted: "z-10 border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0",
	solid: "z-10 border-b border-slate-200 bg-white sticky top-0",
};

const buttonVariants: Record<"primary" | "ghost", string> = {
	primary:
		"rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
	ghost: "rounded-full border border-slate-400 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-600 hover:text-slate-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
};

export default function Navbar({
	variant = "frosted",
	actions = [],
	brandHref = "/",
	brandLabel = "MoneyIQ",
	brandIcon,
	className = "",
	autoProfileLink = true,
}: NavbarProps) {
	const [authUser, setAuthUser] = useState<{ username?: string; role?: string } | null>(null);
	const headerClassName = `${headerVariants[variant]} ${className}`.trim();

	useEffect(() => {
		if (!autoProfileLink || typeof window === "undefined") {
			return;
		}

		try {
			const stored = localStorage.getItem("authUser");
			if (!stored) {
				setAuthUser(null);
				return;
			}

			const parsed = JSON.parse(stored) as { username?: string; role?: string };
			setAuthUser(parsed);
		} catch {
			setAuthUser(null);
		}
	}, [autoProfileLink]);

	const hasProfileAction = actions.some(
		(action) => action.type === "link" && action.href === "/profile",
	);
	const hasCalculatorsAction = actions.some(
		(action) => action.type === "link" && action.href === "/calculators",
	);

	const resolvedActions = useMemo(() => {
		const authUsername = authUser?.username ?? null;
		const isAdmin = authUser?.role === "admin";
		const withCalculatorAction = hasCalculatorsAction
			? actions
			: [
					{
						type: "link" as const,
						label: "Calculators",
						href: "/calculators",
					},
					...actions,
				];

		if (!autoProfileLink || !authUsername || hasProfileAction || isAdmin) {
			return withCalculatorAction;
		}

		return [
			...withCalculatorAction,
			{
				type: "link" as const,
				label: authUsername,
				href: "/profile",
				className: "text-sm text-slate-700",
			},
		];
	}, [actions, authUser, autoProfileLink, hasCalculatorsAction, hasProfileAction]);

	const renderAction = (action: NavbarAction, index: number) => {
		switch (action.type) {
			case "link":
				return (
					<Link
						key={action.id ?? `${action.type}-${index}`}
						href={action.href}
						target={action.target}
						rel={action.rel}
						className={`${buttonVariants[action.variant ?? "ghost"]} ${action.className ?? ""}`.trim()}
					>
						{action.label}
					</Link>
				);
			case "button":
				return (
					<button
						key={action.id ?? `${action.type}-${index}`}
						type="button"
						onClick={action.onClick}
						disabled={action.disabled}
						className={`${buttonVariants[action.variant ?? "ghost"]} ${action.className ?? ""}`.trim()}
					>
						{action.label}
					</button>
				);
			case "label":
			default:
				return (
					<span
						key={action.id ?? `${action.type}-${index}`}
						className={`${action.muted ? "text-sm text-slate-500" : "text-sm font-medium text-slate-900"} ${action.className ?? ""}`.trim()}
					>
						{action.label}
					</span>
				);
		}
	};

	return (
		<header className={headerClassName}>
			<nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
				<Link href={brandHref} className="flex items-center gap-3">
					{brandIcon ?? (
						<Image
							src="/money-iq-logo.svg"
							alt="MoneyIQ Logo"
							width={36}
							height={36}
							className="h-9 w-9"
						/>
					)}
					<span className="text-lg font-semibold tracking-tight text-slate-900">
						{brandLabel}
					</span>
				</Link>
				<div className="flex items-center gap-3">{resolvedActions.map(renderAction)}</div>
			</nav>
		</header>
	);
}
