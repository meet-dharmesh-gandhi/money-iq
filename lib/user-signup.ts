import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { validatePassword, hashPassword } from "@/lib/password-utils";
import { encodeJWT } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";

export interface SignupRequest {
	username: string;
	password: string;
	confirmPassword: string;
}

export interface SignupResponse {
	success: boolean;
	message?: string;
	user?: AuthUser;
	token?: string;
	errors?: string[];
}

export async function signupUser(req: SignupRequest): Promise<SignupResponse> {
	const { username, password, confirmPassword } = req;

	// Basic validation
	if (!username || !password || !confirmPassword) {
		return {
			success: false,
			message: "All fields are required.",
		};
	}

	// Username validation
	if (username.length < 3) {
		return {
			success: false,
			message: "Username must be at least 3 characters long.",
		};
	}

	if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
		return {
			success: false,
			message: "Username can only contain letters, numbers, underscores, and hyphens.",
		};
	}

	// Password confirmation match
	if (password !== confirmPassword) {
		return {
			success: false,
			message: "Passwords do not match.",
		};
	}

	// Password strength validation
	const validation = validatePassword(password, username);
	if (!validation.valid) {
		return {
			success: false,
			message: "Password does not meet requirements.",
			errors: validation.errors,
		};
	}

	try {
		await connectToDatabase();

		// Check if user already exists
		const existingUser = await User.findOne({
			username: username.toLowerCase(),
		});

		if (existingUser) {
			return {
				success: false,
				message: "Username already taken. Please choose another.",
			};
		}

		// Hash password
		const hashedPassword = await hashPassword(password);

		// Create new user
		const newUser = await User.create({
			username: username.toLowerCase(),
			password: hashedPassword,
			role: "user",
		});

		const authUser: AuthUser = {
			id: newUser._id.toString(),
			username: newUser.username,
			role: newUser.role,
		};

		// Generate JWT token
		const token = encodeJWT({
			id: authUser.id,
			username: authUser.username,
			role: authUser.role,
		});

		return {
			success: true,
			user: authUser,
			token,
			message: "Account created successfully!",
		};
	} catch (error) {
		console.error("Signup error:", error);
		return {
			success: false,
			message: "An error occurred during signup.",
		};
	}
}
