import { getAuthenticatedUser } from "@/lib/api-auth";
import { deleteExpertVideo, updateExpertVideoUrl } from "@/lib/expert-videos";

function unauthorizedResponse() {
	return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
}

function adminOnlyResponse() {
	return Response.json({ success: false, message: "Admin access required" }, { status: 403 });
}

type Params = {
	params: Promise<{ videoId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return unauthorizedResponse();
		}
		if (user.role !== "admin") {
			return adminOnlyResponse();
		}

		const { videoId } = await params;
		const body = (await request.json()) as { videoUrl?: string };
		const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : "";

		if (!videoUrl.trim()) {
			return Response.json(
				{ success: false, message: "YouTube URL is required." },
				{ status: 400 },
			);
		}

		const updated = await updateExpertVideoUrl(videoId, videoUrl);
		if (!updated) {
			return Response.json({ success: false, message: "Video not found." }, { status: 404 });
		}

		return Response.json({ success: true, item: updated });
	} catch (error) {
		console.error("Admin expert videos PATCH error:", error);
		const message = error instanceof Error ? error.message : "Failed to update video.";
		const status = message.toLowerCase().includes("required") ? 400 : 500;
		return Response.json({ success: false, message }, { status });
	}
}

export async function DELETE(request: Request, { params }: Params) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return unauthorizedResponse();
		}
		if (user.role !== "admin") {
			return adminOnlyResponse();
		}

		const { videoId } = await params;
		const deleted = await deleteExpertVideo(videoId);
		if (!deleted) {
			return Response.json({ success: false, message: "Video not found." }, { status: 404 });
		}

		return Response.json({ success: true, deleted });
	} catch (error) {
		console.error("Admin expert videos DELETE error:", error);
		const message = error instanceof Error ? error.message : "Failed to delete video.";
		return Response.json({ success: false, message }, { status: 500 });
	}
}
