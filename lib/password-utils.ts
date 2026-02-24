/**
 * Password validation and hashing utilities
 */

import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 10;

// Common weak passwords to reject
const WEAK_PASSWORDS = [
	"password",
	"12345678",
	"qwerty",
	"abc123",
	"letmein",
	"welcome",
	"monkey",
	"dragon",
	"baseball",
	"iloveyou",
];

export interface PasswordValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Validate password strength
 * Returns object with valid flag and error messages if invalid
 */
export function validatePassword(password: string, username?: string): PasswordValidationResult {
	const errors: string[] = [];

	// Length check
	if (!password || password.length < 8) {
		errors.push("Password must be at least 8 characters long");
	}

	// Lowercase check
	if (!/[a-z]/.test(password)) {
		errors.push("Password must contain at least one lowercase letter");
	}

	// Uppercase check
	if (!/[A-Z]/.test(password)) {
		errors.push("Password must contain at least one uppercase letter");
	}

	// Number check
	if (!/[0-9]/.test(password)) {
		errors.push("Password must contain at least one number");
	}

	// Special character check
	if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
		errors.push("Password must contain at least one special character (!@#$%^&*...)");
	}

	// Weak password check
	if (WEAK_PASSWORDS.includes(password.toLowerCase())) {
		errors.push("Password is too common. Please choose a stronger password");
	}

	// Username check
	if (username && password.toLowerCase().includes(username.toLowerCase())) {
		errors.push("Password must not contain your username");
	}

	// Consecutive characters check (no more than 2 same characters in a row)
	if (/(.)\1{2,}/.test(password)) {
		errors.push("Password must not contain more than 2 consecutive identical characters");
	}

	// Sequential characters check (abc, 123, etc.)
	if (
		/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(
			password,
		)
	) {
		errors.push("Password must not contain sequential characters (like abc or 123)");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare plaintext password with hash
 */
export async function comparePassword(plaintext: string, hash: string): Promise<boolean> {
	return bcrypt.compare(plaintext, hash);
}
