import { getTodayExpertAdvices } from "@/lib/expert-advice";

export async function GET() {
	try {
		const advices = await getTodayExpertAdvices();

		return Response.json({
			date: new Date().toISOString(),
			count: advices.length,
			advices,
		});
	} catch (error) {
		console.error("Expert advice API error:", error);
		return Response.json(
			{
				error: "Failed to fetch expert advices.",
			},
			{ status: 500 },
		);
	}
}
