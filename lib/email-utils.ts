import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { getRedisClient } from "@/lib/redis";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Check if email already exists
 */
export async function emailExists(email: string): Promise<boolean> {
	try {
		await connectToDatabase();
		const user = await User.findOne({ email: email.toLowerCase() });
		return !!user;
	} catch {
		return false;
	}
}

/**
 * Store OTP for email verification
 */
const OTP_TTL_SECONDS = 10 * 60;
const OTP_PREFIX = "otp:email:";

type MailerConfig = {
	host: string;
	port: number;
	username: string;
	password: string;
	secure: boolean;
	from: string;
};

type MailerCache = {
	transporter: Transporter | null;
	promise: Promise<Transporter> | null;
	config?: MailerConfig;
};

const globalWithMailer = global as typeof globalThis & {
	mailerCache?: MailerCache;
};

const mailerCache: MailerCache = globalWithMailer.mailerCache ?? {
	transporter: null,
	promise: null,
};

globalWithMailer.mailerCache = mailerCache;

function resolveMailerConfig(): MailerConfig {
	const host = process.env.EMAIL_HOST;
	const portRaw = process.env.EMAIL_PORT;
	const username = process.env.EMAIL_USERNAME;
	const password = process.env.EMAIL_PASSWORD;
	const from = process.env.EMAIL_FROM;
	const secureRaw = process.env.EMAIL_SECURE;

	if (!host) {
		throw new Error("EMAIL_HOST is not set");
	}

	if (!portRaw) {
		throw new Error("EMAIL_PORT is not set");
	}

	const port = Number(portRaw);
	if (Number.isNaN(port)) {
		throw new Error("EMAIL_PORT must be a valid number");
	}

	if (!username) {
		throw new Error("EMAIL_USERNAME is not set");
	}

	if (!password) {
		throw new Error("EMAIL_PASSWORD is not set");
	}

	if (!from) {
		throw new Error("EMAIL_FROM is not set");
	}

	const secure = secureRaw ? secureRaw === "true" : port === 465;

	return {
		host,
		port,
		username,
		password,
		secure,
		from,
	};
}

function getMailerConfig(): MailerConfig {
	if (!mailerCache.config) {
		mailerCache.config = resolveMailerConfig();
	}

	return mailerCache.config;
}

async function getEmailTransporter(): Promise<Transporter> {
	if (mailerCache.transporter) {
		return mailerCache.transporter;
	}

	if (!mailerCache.promise) {
		const config = getMailerConfig();
		const transporter = nodemailer.createTransport({
			host: config.host,
			port: config.port,
			secure: config.secure,
			auth: {
				user: config.username,
				pass: config.password,
			},
		});

		mailerCache.promise = transporter
			.verify()
			.then(() => {
				mailerCache.transporter = transporter;
				return transporter;
			})
			.catch((error) => {
				mailerCache.promise = null;
				throw error;
			});
	}

	return mailerCache.promise;
}

function getOtpKey(email: string) {
	return `${OTP_PREFIX}${email.toLowerCase()}`;
}

/**
 * Store OTP for email verification in Redis
 */
export async function storeEmailOTP(email: string, otp: string): Promise<boolean> {
	try {
		const client = await getRedisClient();
		await client.set(getOtpKey(email), otp, { EX: OTP_TTL_SECONDS });
		return true;
	} catch (error) {
		console.error("Failed to store email OTP:", error);
		return false;
	}
}

/**
 * Validate OTP for email without consuming it
 */
export async function validateEmailOTP(email: string, otp: string): Promise<boolean> {
	try {
		const client = await getRedisClient();
		const storedOtp = await client.get(getOtpKey(email));
		return storedOtp === otp;
	} catch (error) {
		console.error("Failed to validate email OTP:", error);
		return false;
	}
}

/**
 * Remove stored OTP for email
 */
export async function deleteEmailOTP(email: string): Promise<void> {
	try {
		const client = await getRedisClient();
		await client.del(getOtpKey(email));
	} catch (error) {
		console.error("Failed to delete email OTP:", error);
	}
}

export async function sendEmailVerificationCode(email: string, otp: string): Promise<boolean> {
	try {
		const transporter = await getEmailTransporter();
		const config = getMailerConfig();
		const expiresInMinutes = Math.floor(OTP_TTL_SECONDS / 60);

		await transporter.sendMail({
			from: config.from,
			to: email,
			subject: "Your MoneyIQ verification code",
			text: `Use this one-time verification code to finish creating your MoneyIQ account: ${otp}. The code expires in ${expiresInMinutes} minutes. If you did not request this, you can ignore this email.`,
			html: `
				<p>Use the verification code below to finish setting up your MoneyIQ account:</p>
				<p style="font-size: 24px; font-weight: 600; letter-spacing: 4px;">${otp}</p>
				<p style="margin-top: 12px;">This code expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}. If you did not request it, you can safely ignore this message.</p>
			`,
		});

		return true;
	} catch (error) {
		console.error("Failed to send OTP email:", error);
		return false;
	}
}
