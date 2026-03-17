import mongoose from "mongoose";

export interface IUserProfile extends mongoose.Document {
	userId: mongoose.Types.ObjectId;
	bio?: string;
	investmentGoal?: string;
	riskLevel: "low" | "medium" | "high";
	createdAt: Date;
	updatedAt: Date;
}

const userProfileSchema = new mongoose.Schema<IUserProfile>(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			unique: true,
			index: true,
		},
		bio: {
			type: String,
			trim: true,
			maxlength: 280,
			default: "",
		},
		investmentGoal: {
			type: String,
			trim: true,
			maxlength: 120,
			default: "",
		},
		riskLevel: {
			type: String,
			enum: ["low", "medium", "high"],
			default: "medium",
		},
	},
	{ timestamps: true },
);

export const UserProfile =
	mongoose.models.UserProfile || mongoose.model<IUserProfile>("UserProfile", userProfileSchema);
