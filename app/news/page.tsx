import Link from "next/link";
import { headers } from "next/headers";
import { getNewsPage } from "@/lib/news";
import type { NewsPageResponse } from "@/types/news/pagination";
import Image from "next/image";
import Navbar from "@/components/Navbar";

type NewsPageProps = {
	searchParams?: Promise<{ page?: string }>;
};

async function fetchNewsPage(page: number, limit: number): Promise<NewsPageResponse> {
	const requestHeaders = await headers();
	const host = requestHeaders.get("host");
	const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
	const baseUrl = host ? `${proto}://${host}` : "";

	if (!baseUrl) {
		return getNewsPage(page, limit);
	}

	const response = await fetch(`${baseUrl}/api/news/all?page=${page}&limit=${limit}`, {
		cache: "no-store",
	});

	if (!response.ok) {
		return getNewsPage(page, limit);
	}

	const payload = (await response.json()) as NewsPageResponse;
	return payload;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
	const resolvedSearchParams = await searchParams;
	const page = Math.max(1, Number(resolvedSearchParams?.page ?? "1"));
	const limit = 12;
	const data = await fetchNewsPage(page, limit);
	const totalPages = Math.max(1, Math.ceil((data.total ?? 0) / limit));

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<Navbar
				actions={[
					{
						type: "link",
						label: "Back to home",
						href: "/",
					},
				]}
			/>

			<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-3xl font-semibold text-slate-900">All news</h1>
					</div>
					<div className="text-sm text-slate-500">
						Page {page} of {totalPages}
					</div>
				</div>

				<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
					{data.items?.map((item) => (
						<article
							key={item._id ?? item.id ?? item.externalId}
							className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
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
								<h2 className="text-lg font-semibold text-slate-900">
									{item.title}
								</h2>
								<p className="text-sm leading-6 text-slate-600">{item.summary}</p>
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

				{!data.items?.length && (
					<div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
						No news found yet. Refresh the cache to populate MongoDB.
					</div>
				)}

				<div className="flex items-center justify-between pt-2">
					<Link
						href={`/news?page=${Math.max(1, page - 1)}`}
						className={`rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
					>
						Previous
					</Link>
					<Link
						href={`/news?page=${Math.min(totalPages, page + 1)}`}
						className={`rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
					>
						Next
					</Link>
				</div>
			</main>
		</div>
	);
}
