import { getCachedNews } from "@/lib/news";

export async function GET() {
	const news = await getCachedNews();

	return Response.json({
		updatedAt: new Date().toISOString(),
		items: news,
	});
}
