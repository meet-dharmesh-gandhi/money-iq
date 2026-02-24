import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { validatePassword, hashPassword } from "@/lib/password-utils";
import { encodeJWT } from "@/lib/auth";
import {
	validateEmail,
	generateOTP,
	storeEmailOTP,
	validateEmailOTP,
	deleteEmailOTP,
	sendEmailVerificationCode,
} from "@/lib/email-utils";
import type { AuthUser } from "@/types/auth";

export interface SignupRequest {
	name: string;
	email: string;
	username: string;
	password: string;
	confirmPassword: string;
	otp?: string;
}

export interface SignupResponse {
	success: boolean;
	message?: string;
	user?: AuthUser;
	token?: string;
	errors?: string[];
	requiresEmailVerification?: boolean;
}

export async function signupUser(req: SignupRequest): Promise<SignupResponse> {
	const { name, email, username, password, confirmPassword, otp } = req;

	// Basic validation
	if (!name || !email || !username || !password || !confirmPassword) {
		return {
			success: false,
			message: "All fields are required.",
		};
	}

	// Name validation
	if (name.trim().length < 2) {
		return {
			success: false,
			message: "Name must be at least 2 characters long.",
		};
	}

	// Email validation
	if (!validateEmail(email)) {
		return {
			success: false,
			message: "Please enter a valid email address.",
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

		// Check if username already exists
		const existingUsername = await User.findOne({
			username: username.toLowerCase(),
		});
		if (existingUsername) {
			return {
				success: false,
				message: "Username already taken. Please choose another.",
			};
		}

		// Check if email already exists
		const existingEmail = await User.findOne({
			email: email.toLowerCase(),
		});
		if (existingEmail) {
			return {
				success: false,
				message: "Email already registered. Please use another or log in.",
			};
		}

		// If no OTP provided, generate one and send it
		if (!otp) {
			const generatedOTP = generateOTP();

			const stored = await storeEmailOTP(email, generatedOTP);
			if (!stored) {
				return {
					success: false,
					message: "Unable to generate OTP right now. Please try again shortly.",
				};
			}

			const emailSent = await sendEmailVerificationCode(email, generatedOTP);
			if (!emailSent) {
				await deleteEmailOTP(email);
				return {
					success: false,
					message: "Unable to send the verification email. Please try again shortly.",
				};
			}

			return {
				success: false,
				message: `OTP sent to ${email}. Please verify to continue.`,
				requiresEmailVerification: true,
			};
		}

		// Verify OTP if provided
		const isValidOtp = await validateEmailOTP(email, otp);
		if (!isValidOtp) {
			return {
				success: false,
				message: "Invalid or expired OTP. Please request a new one.",
				requiresEmailVerification: true,
			};
		}

		// Hash password
		const hashedPassword = await hashPassword(password);

		// Create new verified user
		const newUser = await User.create({
			name: name.trim(),
			email: email.toLowerCase(),
			username: username.toLowerCase(),
			password: hashedPassword,
			emailVerified: true,
			role: "user",
		});

		await deleteEmailOTP(email);

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
