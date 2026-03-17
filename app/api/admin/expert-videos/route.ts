import { getAuthenticatedUser } from "@/lib/api-auth";
import { createExpertVideoFromUrl, getAdminExpertVideosPage } from "@/lib/expert-videos";

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
		const limit = Number(searchParams.get("limit") ?? "8");
		const result = await getAdminExpertVideosPage(page, limit);

		return Response.json({ success: true, ...result });
	} catch (error) {
		console.error("Admin expert videos GET error:", error);
		return Response.json(
			{ success: false, message: "Failed to fetch expert videos." },
			{ status: 500 },
		);
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

		const body = (await request.json()) as { videoUrl?: string };
		const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : "";

		if (!videoUrl.trim()) {
			return Response.json(
				{ success: false, message: "YouTube URL is required." },
				{ status: 400 },
			);
		}

		const created = await createExpertVideoFromUrl(videoUrl);
		return Response.json({ success: true, item: created }, { status: 201 });
	} catch (error) {
		console.error("Admin expert videos POST error:", error);
		const message = error instanceof Error ? error.message : "Failed to create video.";
		const status = message.toLowerCase().includes("required") ? 400 : 500;
		return Response.json({ success: false, message }, { status });
	}
}
