import { getAuthenticatedUser } from "@/lib/api-auth";
import { getUserExpertAdvices } from "@/lib/expert-advice";

function unauthorizedResponse() {
	return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
}

function usersOnlyResponse() {
	return Response.json({ success: false, message: "User access required" }, { status: 403 });
}

export async function GET(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);
		if (!user) {
			return unauthorizedResponse();
		}
		if (user.role !== "user") {
			return usersOnlyResponse();
		}

		const items = await getUserExpertAdvices();
		return Response.json({ success: true, items, count: items.length });
	} catch (error) {
		console.error("User expert advice GET error:", error);
		return Response.json(
			{ success: false, message: "Failed to fetch expert advices." },
			{ status: 500 },
		);
	}
}
