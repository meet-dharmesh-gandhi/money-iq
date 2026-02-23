import { Schema, model, models } from "mongoose";

const NewsSchema = new Schema(
	{
		externalId: { type: Number, required: true, unique: true, index: true },
		title: { type: String, required: true },
		summary: { type: String, required: true },
		url: { type: String, required: true },
		source: { type: String, required: true },
		publishedAt: { type: Date, required: true },
		image: { type: String, default: null },
		category: { type: String, default: null },
	},
	{
		timestamps: true,
	},
);

const News = models.News || model("News", NewsSchema);

export default News;
