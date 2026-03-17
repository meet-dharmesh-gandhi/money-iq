import { getAuthenticatedUser } from "@/lib/api-auth";
import { generateOTP, sendEmailVerificationCode, storeEmailOTP } from "@/lib/email-utils";
import { comparePassword } from "@/lib/password-utils";

function unauthorizedResponse() {
	return Response.json(
		{
			success: false,
			message: "Unauthorized",
		},
		{ status: 401 },
	);
}

export async function POST(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);

		if (!user) {
			return unauthorizedResponse();
		}

		const rawBody = (await request.json()) as Record<string, unknown>;
		const currentPassword =
			typeof rawBody.currentPassword === "string" ? rawBody.currentPassword : "";

		if (!currentPassword) {
			return Response.json(
				{
					success: false,
					message: "Current password is required to request an OTP.",
				},
				{ status: 400 },
			);
		}

		const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
		if (!isCurrentPasswordValid) {
			return Response.json(
				{
					success: false,
					message: "Current password is incorrect.",
				},
				{ status: 401 },
			);
		}

		const otp = generateOTP();
		const stored = await storeEmailOTP(user.email, otp);
		if (!stored) {
			return Response.json(
				{
					success: false,
					message: "Unable to generate OTP right now. Please try again.",
				},
				{ status: 500 },
			);
		}

		const sent = await sendEmailVerificationCode(user.email, otp);
		if (!sent) {
			return Response.json(
				{
					success: false,
					message: "Unable to send OTP email. Please try again.",
				},
				{ status: 500 },
			);
		}

		return Response.json({
			success: true,
			message: `OTP sent to ${user.email}.`,
		});
	} catch (error) {
		console.error("Profile OTP API error:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to request OTP.",
			},
			{ status: 500 },
		);
	}
}
