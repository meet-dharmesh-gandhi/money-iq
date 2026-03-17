import { Schema, model, models } from "mongoose";

const ExpertVideoSchema = new Schema(
	{
		title: { type: String, required: true, trim: true },
		videoUrl: { type: String, required: true, trim: true, index: true },
		publishedAt: { type: Date, required: true, index: true },
		description: { type: String, default: null },
		channelName: { type: String, default: null },
		thumbnailUrl: { type: String, default: null },
		isActive: { type: Boolean, default: true, index: true },
	},
	{
		timestamps: true,
	},
);

ExpertVideoSchema.index({ publishedAt: -1, isActive: 1 });
ExpertVideoSchema.index({ videoUrl: 1, publishedAt: 1 }, { unique: true });

const ExpertVideo = models.ExpertVideo || model("ExpertVideo", ExpertVideoSchema, "expert-videos");

export default ExpertVideo;
