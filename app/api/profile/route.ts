import { getAuthenticatedUser } from "@/lib/api-auth";
import {
	sanitizeEmail,
	sanitizeName,
	sanitizeRequestBody,
	sanitizeString,
	validators,
} from "@/lib/input-sanitizer";
import { deleteEmailOTP, validateEmailOTP } from "@/lib/email-utils";
import { User } from "@/models/User";
import { UserProfile } from "@/models/UserProfile";
import { comparePassword, hashPassword, validatePassword } from "@/lib/password-utils";

function unauthorizedResponse() {
	return Response.json(
		{
			success: false,
			message: "Unauthorized",
		},
		{ status: 401 },
	);
}

export async function GET(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);

		if (!user) {
			return unauthorizedResponse();
		}

		const profile = await UserProfile.findOneAndUpdate(
			{ userId: user._id },
			{ $setOnInsert: { userId: user._id } },
			{ upsert: true, new: true },
		);

		return Response.json({
			success: true,
			user: {
				id: user._id.toString(),
				name: user.name,
				username: user.username,
				email: user.email,
				role: user.role,
			},
			preferences: {
				bio: profile.bio ?? "",
				investmentGoal: profile.investmentGoal ?? "",
				riskLevel: profile.riskLevel,
			},
		});
	} catch (error) {
		console.error("Profile GET API error:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to fetch profile.",
			},
			{ status: 500 },
		);
	}
}

export async function PATCH(request: Request) {
	try {
		const user = await getAuthenticatedUser(request);

		if (!user) {
			return unauthorizedResponse();
		}

		const rawBody = await request.json();
		const body = sanitizeRequestBody(rawBody) as Record<string, unknown>;
		const raw = rawBody as Record<string, unknown>;

		const currentPassword = typeof raw.currentPassword === "string" ? raw.currentPassword : "";
		const newPassword = typeof raw.newPassword === "string" ? raw.newPassword : "";
		const confirmPassword = typeof raw.confirmPassword === "string" ? raw.confirmPassword : "";
		const otp = typeof raw.otp === "string" ? raw.otp.trim() : "";

		const updates: { name?: string; username?: string; email?: string; password?: string } = {};
		const profileUpdates: {
			bio?: string;
			investmentGoal?: string;
			riskLevel?: "low" | "medium" | "high";
		} = {};

		if (typeof body.name === "string") {
			const name = sanitizeName(body.name);
			if (!validators.name(name)) {
				return Response.json(
					{ success: false, message: "Invalid name format." },
					{ status: 400 },
				);
			}
			updates.name = name;
		}

		if (typeof body.username === "string") {
			const username = sanitizeString(body.username, {
				trim: true,
				toLowerCase: true,
				maxLength: 30,
				allowedCharacters: /a-zA-Z0-9_-/,
			});

			if (!validators.username(username)) {
				return Response.json(
					{ success: false, message: "Invalid username format." },
					{ status: 400 },
				);
			}

			const existingUsername = await User.findOne({
				username,
				_id: { $ne: user._id },
			});

			if (existingUsername) {
				return Response.json(
					{ success: false, message: "Username already in use." },
					{ status: 409 },
				);
			}

			updates.username = username;
		}

		if (typeof body.email === "string") {
			const email = sanitizeEmail(body.email);
			if (!validators.email(email)) {
				return Response.json(
					{ success: false, message: "Invalid email format." },
					{ status: 400 },
				);
			}

			const existingEmail = await User.findOne({
				email,
				_id: { $ne: user._id },
			});

			if (existingEmail) {
				return Response.json(
					{ success: false, message: "Email already in use." },
					{ status: 409 },
				);
			}

			updates.email = email;
		}

		const usernameChanged =
			typeof updates.username === "string" && updates.username !== user.username;
		const emailChanged = typeof updates.email === "string" && updates.email !== user.email;
		const passwordChangeRequested = newPassword.length > 0 || confirmPassword.length > 0;

		if (passwordChangeRequested) {
			if (!newPassword || !confirmPassword) {
				return Response.json(
					{ success: false, message: "Both new password fields are required." },
					{ status: 400 },
				);
			}

			if (newPassword !== confirmPassword) {
				return Response.json(
					{ success: false, message: "New passwords do not match." },
					{ status: 400 },
				);
			}

			const passwordValidation = validatePassword(
				newPassword,
				updates.username ?? user.username,
			);

			if (!passwordValidation.valid) {
				return Response.json(
					{
						success: false,
						message:
							passwordValidation.errors[0] ?? "Password does not meet requirements.",
					},
					{ status: 400 },
				);
			}
		}

		const sensitiveChangeRequested = usernameChanged || emailChanged || passwordChangeRequested;
		if (sensitiveChangeRequested) {
			if (!currentPassword) {
				return Response.json(
					{
						success: false,
						message:
							"Current password is required for username, email, or password updates.",
					},
					{ status: 400 },
				);
			}

			const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
			if (!isCurrentPasswordValid) {
				return Response.json(
					{ success: false, message: "Current password is incorrect." },
					{ status: 401 },
				);
			}
		}

		const otpRequired = usernameChanged || passwordChangeRequested;
		if (otpRequired) {
			if (!otp) {
				return Response.json(
					{
						success: false,
						message: "OTP verification is required for username or password changes.",
						requiresOtp: true,
					},
					{ status: 400 },
				);
			}

			const isOtpValid = await validateEmailOTP(user.email, otp);
			if (!isOtpValid) {
				return Response.json(
					{ success: false, message: "Invalid or expired OTP.", requiresOtp: true },
					{ status: 400 },
				);
			}
		}

		if (passwordChangeRequested && newPassword) {
			updates.password = await hashPassword(newPassword);
		}

		if (typeof body.bio === "string") {
			profileUpdates.bio = sanitizeString(body.bio, { maxLength: 280 });
		}

		if (typeof body.investmentGoal === "string") {
			profileUpdates.investmentGoal = sanitizeString(body.investmentGoal, {
				maxLength: 120,
			});
		}

		if (
			typeof body.riskLevel === "string" &&
			["low", "medium", "high"].includes(body.riskLevel)
		) {
			profileUpdates.riskLevel = body.riskLevel as "low" | "medium" | "high";
		}

		if (Object.keys(updates).length > 0) {
			await User.updateOne({ _id: user._id }, { $set: updates });
		}

		if (otpRequired) {
			await deleteEmailOTP(user.email);
		}

		if (Object.keys(profileUpdates).length > 0) {
			await UserProfile.findOneAndUpdate(
				{ userId: user._id },
				{ $set: profileUpdates, $setOnInsert: { userId: user._id } },
				{ upsert: true },
			);
		}

		const updatedUser = await User.findById(user._id);
		const updatedProfile = await UserProfile.findOne({ userId: user._id });

		return Response.json({
			success: true,
			message: "Profile updated successfully.",
			user: {
				id: updatedUser?._id.toString(),
				name: updatedUser?.name,
				username: updatedUser?.username,
				email: updatedUser?.email,
				role: updatedUser?.role,
			},
			preferences: {
				bio: updatedProfile?.bio ?? "",
				investmentGoal: updatedProfile?.investmentGoal ?? "",
				riskLevel: updatedProfile?.riskLevel ?? "medium",
			},
		});
	} catch (error) {
		console.error("Profile PATCH API error:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to update profile.",
			},
			{ status: 500 },
		);
	}
}
