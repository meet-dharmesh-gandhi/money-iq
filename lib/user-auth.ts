import type { AuthUser, LoginRequest, LoginResponse } from "@/types/auth";
import { encodeJWT } from "@/lib/auth";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { comparePassword } from "@/lib/password-utils";

export async function loginUser(req: LoginRequest): Promise<LoginResponse> {
	const { username, password } = req;

	if (!username || !password) {
		return {
			success: false,
			message: "Username and password are required.",
		};
	}

	try {
		await connectToDatabase();

		const userRecord = await User.findOne({ username: username.toLowerCase() });

		if (!userRecord) {
			return {
				success: false,
				message: "Invalid username or password.",
			};
		}

		// Verify password hash
		const isPasswordValid = await comparePassword(password, userRecord.password);
		if (!isPasswordValid) {
			return {
				success: false,
				message: "Invalid username or password.",
			};
		}

		const authUser: AuthUser = {
			id: userRecord._id.toString(),
			username: userRecord.username,
			role: userRecord.role,
		};

		const token = encodeJWT({
			id: authUser.id,
			username: authUser.username,
			role: authUser.role,
		});

		return {
			success: true,
			user: authUser,
			token,
		};
	} catch (error) {
		console.error("Login error:", error);
		return {
			success: false,
			message: "An error occurred during login.",
		};
	}
}
