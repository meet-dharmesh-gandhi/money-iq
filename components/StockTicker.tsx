"use client";

import { useEffect, useMemo, useState } from "react";
import type { AngelOneQuote, AngelOneQuoteResponse } from "@/types/stocks/api";
import { sampleStockSeries } from "@/data/stocks/sample";
import type { StockSampleSeries } from "@/types/stocks/sample";

type StockTickerProps = {
	exchange: string;
	tokens: string[];
	pollIntervalMs?: number;
};

const DEFAULT_API_URL =
	"https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/";

export default function StockTicker({
	exchange,
	tokens,
	pollIntervalMs = 2000,
}: StockTickerProps) {
	const [quotes, setQuotes] = useState<AngelOneQuote[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const isDev = process.env.NODE_ENV === "development";

	const tokenList = useMemo(() => tokens.filter(Boolean), [tokens]);
	const tokenKey = tokenList.join(",");

	const formatter = useMemo(
		() =>
			new Intl.NumberFormat("en-IN", {
				maximumFractionDigits: 2,
			}),
		[]
	);

	useEffect(() => {
		if (!tokenList.length) {
			setError("No symbols configured.");
			setIsLoading(false);
			return;
		}

		const apiUrl = process.env.NEXT_PUBLIC_ANGELONE_API_URL ?? DEFAULT_API_URL;
		const apiKey = process.env.NEXT_PUBLIC_ANGELONE_API_KEY ?? "";
		const authToken = process.env.NEXT_PUBLIC_ANGELONE_AUTH_TOKEN ?? "";
		const clientLocalIp = process.env.NEXT_PUBLIC_ANGELONE_CLIENT_LOCAL_IP ?? "";
		const clientPublicIp = process.env.NEXT_PUBLIC_ANGELONE_CLIENT_PUBLIC_IP ?? "";
		const macAddress = process.env.NEXT_PUBLIC_ANGELONE_MAC_ADDRESS ?? "";
		const sourceId = process.env.NEXT_PUBLIC_ANGELONE_SOURCE_ID ?? "WEB";
		const userType = process.env.NEXT_PUBLIC_ANGELONE_USER_TYPE ?? "USER";

		if (
			!apiKey ||
			!authToken ||
			!clientLocalIp ||
			!clientPublicIp ||
			!macAddress
		) {
			setError("Missing client credentials for live quotes.");
			setIsLoading(false);
			return;
		}

		let isMounted = true;
		let timer: ReturnType<typeof setInterval> | null = null;

		const fetchQuotes = async () => {
			try {
				const response = await fetch(apiUrl, {
					method: "POST",
					headers: {
						Accept: "application/json",
						"X-PrivateKey": apiKey,
						"X-SourceID": `${sourceId}, ${sourceId}`,
						"X-ClientLocalIP": clientLocalIp,
						"X-ClientPublicIP": clientPublicIp,
						"X-MACAddress": macAddress,
						"X-UserType": userType,
						Authorization: `Bearer ${authToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						mode: "FULL",
						exchangeTokens: {
							[exchange]: tokenList,
						},
					}),
				});

				if (!response.ok) {
					throw new Error(`Quote fetch failed: ${response.status}`);
				}

				const payload = (await response.json()) as AngelOneQuoteResponse;
				const fetched = payload.data?.fetched ?? [];
				if (!fetched.length) {
					throw new Error("No quotes received.");
				}
				if (isMounted) {
					setQuotes(fetched);
					setError(null);
				}
			} catch (err) {
				if (isMounted) {
					setError(
						err instanceof Error ? err.message : "Unable to load live prices."
					);
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		fetchQuotes();
		timer = setInterval(fetchQuotes, pollIntervalMs);

		return () => {
			isMounted = false;
			if (timer) {
				clearInterval(timer);
			}
		};
	}, [exchange, pollIntervalMs, tokenKey, tokenList]);

	const showFallback = isDev && (error || (!isLoading && !quotes.length));

	if (error && !showFallback) {
		return <p className="mt-2 text-xs text-rose-600">{error}</p>;
	}

	if (isLoading && !quotes.length && !showFallback) {
		return <p className="mt-2 text-xs text-slate-500">Loading live prices...</p>;
	}

	if (!quotes.length && !showFallback) {
		return (
			<p className="mt-2 text-xs text-slate-500">
				Live prices will appear once data is available.
			</p>
		);
	}

	if (showFallback) {
		return (
			<div className="mt-3 space-y-3">
				<p className="text-[11px] text-slate-500">
					Sample prices (dev mode).
				</p>
				<ul className="space-y-2 text-xs text-slate-600">
					{sampleStockSeries.map((sample) => (
						<li
							key={sample.symbol}
							className="flex items-center justify-between gap-3"
						>
							<div>
								<p className="font-medium text-slate-800">
									{sample.symbol}
								</p>
								<p className="text-[11px] text-slate-500">
									{sample.company}
								</p>
							</div>
							<div className="flex items-center gap-3">
								<Sparkline series={sample} />
								<span className="text-right">
									{formatter.format(sample.ltp)}
									<span
										className={`ml-2 ${
											sample.percentChange >= 0
												? "text-emerald-600"
												: "text-rose-600"
										}`}
									>
										{sample.percentChange >= 0 ? "+" : ""}
										{sample.percentChange.toFixed(2)}%
									</span>
								</span>
							</div>
						</li>
					))}
				</ul>
			</div>
		);
	}

	return (
		<ul className="mt-3 space-y-2 text-xs text-slate-600">
			{quotes.slice(0, 10).map((quote) => (
				<li key={quote.symbolToken} className="flex items-center justify-between">
					<span className="font-medium text-slate-800">
						{quote.tradingSymbol}
					</span>
					<span>
						{formatter.format(quote.ltp)}
						{typeof quote.percentChange === "number" && (
							<span
								className={`ml-2 ${
									quote.percentChange >= 0
										? "text-emerald-600"
										: "text-rose-600"
								}`}
							>
								{quote.percentChange >= 0 ? "+" : ""}
								{quote.percentChange.toFixed(2)}%
							</span>
						)}
					</span>
				</li>
			))}
		</ul>
	);
}

function Sparkline({ series }: { series: StockSampleSeries }) {
	const width = 110;
	const height = 32;
	const padding = 2;
	const min = Math.min(...series.points);
	const max = Math.max(...series.points);
	const range = Math.max(1, max - min);

	const points = series.points
		.map((value, index) => {
			const x = (index / (series.points.length - 1)) * (width - padding * 2);
			const y =
				height -
				((value - min) / range) * (height - padding * 2) -
				padding;
			return `${x + padding},${y}`;
		})
		.join(" ");

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className="rounded-md bg-slate-100"
		>
			<polyline
				fill="none"
				stroke={series.percentChange >= 0 ? "#16a34a" : "#e11d48"}
				strokeWidth="2"
				points={points}
			/>
		</svg>
	);
}
