import { model, models } from "mongoose";
import { expertAdviceSchema, type ExpertAdviceDocument } from "@/models/expert-advice/schema";

const ExpertAdvice =
	models.ExpertAdvice ||
	model<ExpertAdviceDocument>("ExpertAdvice", expertAdviceSchema, "expert-advices");

export default ExpertAdvice;
