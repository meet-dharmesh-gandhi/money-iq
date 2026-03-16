import { Schema, type InferSchemaType } from "mongoose";

export const expertAdviceSchema = new Schema(
	{
		advice: {
			type: String,
			required: true,
			trim: true,
		},
		adviceDate: {
			type: Date,
			required: true,
			index: true,
		},
		isActive: {
			type: Boolean,
			default: true,
			index: true,
		},
	},
	{
		timestamps: true,
	},
);

expertAdviceSchema.index({ adviceDate: 1, isActive: 1 });
expertAdviceSchema.index({ adviceDate: 1, advice: 1 }, { unique: true });

export type ExpertAdviceDocument = InferSchemaType<typeof expertAdviceSchema>;
