import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
	username: string;
	email: string;
	name: string;
	password: string;
	role: "user" | "admin";
	emailVerified: boolean;
	emailVerificationOTP?: string;
	emailVerificationOTPExpiry?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
	{
		username: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
		},
		role: {
			type: String,
			enum: ["user", "admin"],
			default: "user",
		},
		emailVerified: {
			type: Boolean,
			default: false,
		},
		emailVerificationOTP: {
			type: String,
		},
		emailVerificationOTPExpiry: {
			type: Date,
		},
	},
	{ timestamps: true },
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
