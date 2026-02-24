import { loginUser } from "@/lib/user-auth";
import type { LoginRequest } from "@/types/auth";

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as LoginRequest;
		const result = await loginUser(body);

		return Response.json(result, {
			status: result.success ? 200 : 401,
		});
	} catch (error) {
		return Response.json(
			{
				success: false,
				message: "An error occurred during login.",
			},
			{ status: 500 },
		);
	}
}
