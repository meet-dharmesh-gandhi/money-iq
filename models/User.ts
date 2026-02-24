import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
	username: string;
	password: string;
	role: "user" | "admin";
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
		password: {
			type: String,
			required: true,
		},
		role: {
			type: String,
			enum: ["user", "admin"],
			default: "user",
		},
	},
	{ timestamps: true },
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
