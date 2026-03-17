import mongoose from "mongoose";

export interface IPortfolioHolding extends mongoose.Document {
	userId: mongoose.Types.ObjectId;
	symbol: string;
	company: string;
	transactionType: "buy" | "sell";
	shares: number;
	avgPrice: number;
	currentPrice: number;
	createdAt: Date;
	updatedAt: Date;
}

const portfolioHoldingSchema = new mongoose.Schema<IPortfolioHolding>(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		symbol: {
			type: String,
			required: true,
			trim: true,
			uppercase: true,
			maxlength: 20,
		},
		company: {
			type: String,
			required: true,
			trim: true,
			maxlength: 120,
		},
		transactionType: {
			type: String,
			enum: ["buy", "sell"],
			default: "buy",
		},
		shares: {
			type: Number,
			required: true,
			min: 0,
		},
		avgPrice: {
			type: Number,
			required: true,
			min: 0,
		},
		currentPrice: {
			type: Number,
			required: true,
			min: 0,
		},
	},
	{ timestamps: true },
);

portfolioHoldingSchema.index({ userId: 1, symbol: 1 });

const existingModel = mongoose.models.PortfolioHolding as
	| mongoose.Model<IPortfolioHolding>
	| undefined;

if (existingModel && !existingModel.schema.path("transactionType")) {
	existingModel.schema.add({
		transactionType: {
			type: String,
			enum: ["buy", "sell"],
			default: "buy",
		},
	});
}

export const PortfolioHolding =
	existingModel || mongoose.model<IPortfolioHolding>("PortfolioHolding", portfolioHoldingSchema);
