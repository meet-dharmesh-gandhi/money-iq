import { getAuthenticatedUser } from "@/lib/api-auth";
import { createTodayExpertAdvice, getAdminExpertAdvicePage } from "@/lib/expert-advice";

function unauthorizedResponse() {
	return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
}

function adminOnlyResponse() {
	return Response.json({ success: false, message: "Admin access required" }, { status: 403 });
}

export async function GET(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return unauthorizedResponse();
		}
		if (user.role !== "admin") {
			return adminOnlyResponse();
		}

		const { searchParams } = new URL(request.url);
		const page = Number(searchParams.get("page") ?? "1");
		const limit = Number(searchParams.get("limit") ?? "10");
		const result = await getAdminExpertAdvicePage(page, limit);

		return Response.json({ success: true, ...result });
	} catch (error) {
		console.error("Admin expert advice GET error:", error);
		return Response.json({ success: false, message: "Failed to fetch tips." }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return unauthorizedResponse();
		}
		if (user.role !== "admin") {
			return adminOnlyResponse();
		}

		const body = (await request.json()) as { advice?: string };
		const advice = typeof body.advice === "string" ? body.advice : "";

		if (!advice.trim()) {
			return Response.json(
				{ success: false, message: "Advice text is required." },
				{ status: 400 },
			);
		}

		const created = await createTodayExpertAdvice(advice);
		return Response.json({ success: true, item: created }, { status: 201 });
	} catch (error) {
		console.error("Admin expert advice POST error:", error);
		const message = error instanceof Error ? error.message : "Failed to create tip.";
		const status = message.toLowerCase().includes("required") ? 400 : 500;
		return Response.json({ success: false, message }, { status });
	}
}
