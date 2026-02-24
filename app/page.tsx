import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { getCachedNews } from "@/lib/news";
import StockTicker from "@/components/StockTicker";
import type { NewsListResponse } from "@/types/news/api";
import type { NewsItem } from "@/types/news/model";

async function fetchNews(): Promise<NewsItem[]> {
	const requestHeaders = await headers();
	const host = requestHeaders.get("host");
	const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
	const baseUrl = host ? `${proto}://${host}` : "";

	if (!baseUrl) {
		return getCachedNews();
	}

	const response = await fetch(`${baseUrl}/api/news`, {
		cache: "no-store",
	});

	if (!response.ok) {
		return [];
	}

	const payload = (await response.json()) as NewsListResponse;
	return Array.isArray(payload?.items) ? payload.items : [];
}

export default async function Home() {
	const news = await fetchNews();
	const topStockTokens = [
		"3045",
		"10666",
		"2475",
		"1333",
		"2885",
		"1594",
		"1660",
		"1795",
		"11536",
		"3042",
	];

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<header className="border-b border-slate-200 bg-white/90 backdrop-blur">
				<nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
					<Link href="/" className="flex items-center gap-3">
						<Image
							src="/money-iq-logo.svg"
							alt="MoneyIQ Logo"
							width={36}
							height={36}
							className="h-9 w-9"
						/>
						<span className="text-lg font-semibold tracking-tight">MoneyIQ</span>
					</Link>
					<div className="flex items-center gap-3">
						<Link
							href="/login"
							className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 md:inline-flex"
						>
							Log in
						</Link>
						<Link
							href="/signup"
							className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
						>
							Get started
						</Link>
					</div>
				</nav>
			</header>

			<main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
				<section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
					<div className="space-y-5">
						<p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
							Market Intelligence
						</p>
						<h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
							Stay ahead with curated, real-time market news.
						</h1>
						<p className="text-lg leading-8 text-slate-600">
							MoneyIQ aggregates the latest market updates and expert commentary so
							you can make confident investment decisions.
						</p>
						<div className="flex flex-wrap gap-3">
							<Link
								href="/insights"
								className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
							>
								Explore insights
							</Link>
							<Link
								href="/dashboard"
								className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
							>
								View dashboard
							</Link>
						</div>
					</div>
					<div className="hidden md:block">
						<div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1">
								<span className="h-2 w-2 rounded-full bg-emerald-600"></span>
								<span className="text-xs font-semibold text-emerald-700">
									Positive
								</span>
							</div>
							<p className="text-sm font-semibold text-slate-900">Top 10 stocks</p>
							<StockTicker exchange="NSE" tokens={topStockTokens} />
						</div>
					</div>
				</section>

				<section id="news" className="space-y-6">
					<div className="flex items-end justify-between">
						<div>
							<h2 className="text-2xl font-semibold text-slate-900">
								Latest market news
							</h2>
							<p className="text-sm text-slate-500">
								Live headlines refreshed hourly from trusted sources.
							</p>
						</div>
						<Link
							href="/news"
							className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 md:inline-flex"
						>
							View all
						</Link>
					</div>

					<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
						{news.slice(0, 9).map((item) => (
							<article
								key={item.id}
								className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-300"
							>
								<div className="space-y-3">
									{item.image && (
										<div className="overflow-hidden rounded-xl border border-slate-100">
											<Image
												src={item.image}
												alt={item.title}
												width={800}
												height={400}
												className="h-40 w-full object-cover"
												sizes="(max-width: 768px) 100vw, 33vw"
												unoptimized
											/>
										</div>
									)}
									<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
										{item.source}
									</p>
									<h3 className="text-lg font-semibold text-slate-900">
										{item.title}
									</h3>
									<p className="text-sm leading-6 text-slate-600">
										{item.summary}
									</p>
								</div>
								<div className="mt-6 flex items-center justify-between text-xs text-slate-500">
									<span>
										{new Date(item.publishedAt).toLocaleString("en-US", {
											month: "short",
											day: "numeric",
											hour: "numeric",
											minute: "2-digit",
										})}
									</span>
									<Link
										href={item.url}
										target="_blank"
										className="inline-flex items-center gap-1 text-sm font-medium text-slate-900 transition hover:text-slate-700"
									>
										Read more
										<Image
											src="/external-link.svg"
											alt="Open in new page"
											width={14}
											height={14}
											className="text-slate-900"
										/>
									</Link>
								</div>
							</article>
						))}
					</div>

					{!news.length && (
						<div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
							News will appear once the backend fetcher returns results.
						</div>
					)}
				</section>
			</main>
		</div>
	);
}
