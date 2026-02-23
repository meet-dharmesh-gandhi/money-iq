import { getNewsPage } from "@/lib/news";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "12");

	const result = await getNewsPage(page, limit);

	return Response.json(result);
}
