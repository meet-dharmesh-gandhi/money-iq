/**
 * Input sanitization and validation utilities
 */

export interface SanitizeOptions {
	maxLength?: number;
	allowedCharacters?: RegExp;
	trim?: boolean;
	toLowerCase?: boolean;
	removeHtmlTags?: boolean;
	removeExtraWhitespace?: boolean;
}

/**
 * Sanitize a string input
 */
export function sanitizeString(input: string, options: SanitizeOptions = {}): string {
	if (typeof input !== "string") {
		return "";
	}

	let sanitized = input;

	// Trim whitespace
	if (options.trim !== false) {
		sanitized = sanitized.trim();
	}

	// Convert to lowercase
	if (options.toLowerCase) {
		sanitized = sanitized.toLowerCase();
	}

	// Remove HTML tags
	if (options.removeHtmlTags !== false) {
		sanitized = sanitized.replace(/<[^>]*>/g, "");
	}

	// Remove extra whitespace (multiple spaces become single space)
	if (options.removeExtraWhitespace !== false) {
		sanitized = sanitized.replace(/\s+/g, " ");
	}

	// Apply character restrictions
	if (options.allowedCharacters) {
		sanitized = sanitized.replace(
			new RegExp(`[^${options.allowedCharacters.source}]`, "g"),
			"",
		);
	}

	// Apply length limit
	if (options.maxLength && sanitized.length > options.maxLength) {
		sanitized = sanitized.substring(0, options.maxLength);
	}

	return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
	return sanitizeString(email, {
		trim: true,
		toLowerCase: true,
		removeHtmlTags: true,
		maxLength: 254, // RFC 5321 limit
		allowedCharacters: /a-zA-Z0-9@._+-/,
	});
}

/**
 * Sanitize username
 */
export function sanitizeUsername(username: string): string {
	return sanitizeString(username, {
		trim: true,
		toLowerCase: true,
		removeHtmlTags: true,
		maxLength: 30,
		allowedCharacters: /a-zA-Z0-9_-/,
	});
}

/**
 * Sanitize name fields
 */
export function sanitizeName(name: string): string {
	return sanitizeString(name, {
		trim: true,
		removeHtmlTags: true,
		maxLength: 100,
		allowedCharacters: /a-zA-Z\s.',\/-/,
	});
}

/**
 * Sanitize general text input
 */
export function sanitizeText(text: string, maxLength = 1000): string {
	return sanitizeString(text, {
		trim: true,
		removeHtmlTags: true,
		maxLength,
		removeExtraWhitespace: true,
	});
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhoneNumber(phone: string): string {
	return sanitizeString(phone, {
		trim: true,
		allowedCharacters: /0-9+()-\s/,
		maxLength: 20,
	});
}

/**
 * Prevent SQL injection by escaping special characters
 */
export function escapeSqlString(input: string): string {
	if (typeof input !== "string") {
		return "";
	}
	return input.replace(/['";\\]/g, "\\$&");
}

/**
 * Prevent NoSQL injection by removing dangerous operators
 */
export function sanitizeMongoInput(input: any): any {
	if (typeof input === "string") {
		return sanitizeString(input);
	}

	if (Array.isArray(input)) {
		return input.map(sanitizeMongoInput);
	}

	if (input && typeof input === "object") {
		const sanitized: Record<string, any> = {};

		for (const [key, value] of Object.entries(input)) {
			// Remove MongoDB operators that could be dangerous
			if (key.startsWith("$") || key.includes(".")) {
				continue;
			}

			sanitized[key] = sanitizeMongoInput(value);
		}

		return sanitized;
	}

	return input;
}

/**
 * Validate input against common patterns
 */
export const validators = {
	email: (email: string): boolean => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email) && email.length <= 254;
	},

	username: (username: string): boolean => {
		return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
	},

	strongPassword: (password: string): boolean => {
		return (
			password.length >= 8 &&
			/[a-z]/.test(password) &&
			/[A-Z]/.test(password) &&
			/[0-9]/.test(password) &&
			/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
		);
	},

	phoneNumber: (phone: string): boolean => {
		const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
		return phoneRegex.test(phone.replace(/[\s()-]/g, ""));
	},

	name: (name: string): boolean => {
		return name.length >= 2 && name.length <= 100 && /^[a-zA-Z\s.',/-]+$/.test(name);
	},
};

/**
 * Sanitize entire request body
 */
export function sanitizeRequestBody(body: Record<string, any>): Record<string, any> {
	const sanitized: Record<string, any> = {};

	for (const [key, value] of Object.entries(body)) {
		// Skip dangerous keys
		if (key.startsWith("$") || key.includes(".") || key.includes("__")) {
			continue;
		}

		if (typeof value === "string") {
			// Apply appropriate sanitization based on field name
			if (key.toLowerCase().includes("email")) {
				sanitized[key] = sanitizeEmail(value);
			} else if (key.toLowerCase().includes("username")) {
				sanitized[key] = sanitizeUsername(value);
			} else if (key.toLowerCase().includes("name")) {
				sanitized[key] = sanitizeName(value);
			} else if (key.toLowerCase().includes("phone")) {
				sanitized[key] = sanitizePhoneNumber(value);
			} else {
				sanitized[key] = sanitizeText(value);
			}
		} else {
			sanitized[key] = sanitizeMongoInput(value);
		}
	}

	return sanitized;
}
