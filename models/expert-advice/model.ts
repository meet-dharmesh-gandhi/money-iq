import { model, models } from "mongoose";
import { expertAdviceSchema, type ExpertAdviceDocument } from "@/models/expert-advice/schema";

const ExpertAdvice =
	(models.ExpertAdvice as ReturnType<typeof model<ExpertAdviceDocument>>) ||
	model<ExpertAdviceDocument>("ExpertAdvice", expertAdviceSchema, "expert-advices");

export default ExpertAdvice;
