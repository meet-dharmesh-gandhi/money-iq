import { signupUser } from "@/lib/user-signup";
import type { SignupRequest } from "@/lib/user-signup";

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as SignupRequest;
		const result = await signupUser(body);

		return Response.json(result, {
			status: result.success ? 201 : 400,
		});
	} catch (error) {
		return Response.json(
			{
				success: false,
				message: "An error occurred during signup.",
			},
			{ status: 500 },
		);
	}
}
