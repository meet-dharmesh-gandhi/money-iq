import { getAuthenticatedUser } from "@/lib/api-auth";
import { deletePastExpertAdvice, updatePastExpertAdvice } from "@/lib/expert-advice";

function unauthorizedResponse() {
	return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
}

function adminOnlyResponse() {
	return Response.json({ success: false, message: "Admin access required" }, { status: 403 });
}

type Params = {
	params: Promise<{ adviceId: string }>;
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

		const { adviceId } = await params;
		const body = (await request.json()) as { advice?: string };
		const advice = typeof body.advice === "string" ? body.advice : "";

		if (!advice.trim()) {
			return Response.json(
				{ success: false, message: "Advice text is required." },
				{ status: 400 },
			);
		}

		const updated = await updatePastExpertAdvice(adviceId, advice);
		if (!updated) {
			return Response.json({ success: false, message: "Tip not found." }, { status: 404 });
		}

		return Response.json({ success: true, item: updated });
	} catch (error) {
		console.error("Admin expert advice PATCH error:", error);
		const message = error instanceof Error ? error.message : "Failed to update tip.";
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

		const { adviceId } = await params;
		const deleted = await deletePastExpertAdvice(adviceId);
		if (!deleted) {
			return Response.json({ success: false, message: "Tip not found." }, { status: 404 });
		}

		return Response.json({ success: true, deleted });
	} catch (error) {
		console.error("Admin expert advice DELETE error:", error);
		const message = error instanceof Error ? error.message : "Failed to delete tip.";
		const status = 500;
		return Response.json({ success: false, message }, { status });
	}
}
