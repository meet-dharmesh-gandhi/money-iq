import ExpertAdvice from "@/models/expert-advice/model";
import { connectToDatabase } from "@/lib/mongodb";

type DayRange = {
	start: Date;
	end: Date;
};

function getUtcDayRange(date = new Date()): DayRange {
	const start = new Date(date);
	start.setUTCHours(0, 0, 0, 0);

	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 1);

	return { start, end };
}

export async function getTodayExpertAdvices() {
	await connectToDatabase();

	const { start, end } = getUtcDayRange();

	const docs = await ExpertAdvice.find({
		adviceDate: { $gte: start, $lt: end },
		isActive: true,
	})
		.sort({ createdAt: -1 })
		.select({ advice: 1, _id: 0 })
		.lean();

	return docs.map((doc) => doc.advice);
}
