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

export type ExpertAdviceAdminItem = {
	_id: string;
	advice: string;
	adviceDate: Date;
	createdAt: Date;
	updatedAt: Date;
	isActive: boolean;
};

export type ExpertAdviceUserItem = {
	_id: string;
	advice: string;
	adviceDate: Date;
	createdAt: Date;
};

export type ExpertAdviceTodayItem = {
	advice: string;
	adviceDate: Date;
};

export type ExpertAdviceAdminPage = {
	todayItems: ExpertAdviceAdminItem[];
	pastItems: ExpertAdviceAdminItem[];
	totalPast: number;
	page: number;
	limit: number;
};

export async function getTodayExpertAdvices(): Promise<ExpertAdviceTodayItem[]> {
	await connectToDatabase();

	const { start, end } = getUtcDayRange();

	const docs = await ExpertAdvice.find({
		adviceDate: { $gte: start, $lt: end },
		isActive: true,
	})
		.sort({ createdAt: -1 })
		.select({ advice: 1, adviceDate: 1, _id: 0 })
		.lean<ExpertAdviceTodayItem[]>();

	return docs;
}

export async function getUserExpertAdvices(): Promise<ExpertAdviceUserItem[]> {
	await connectToDatabase();

	return ExpertAdvice.find({ isActive: true })
		.sort({ adviceDate: -1, createdAt: -1 })
		.select({ _id: 1, advice: 1, adviceDate: 1, createdAt: 1 })
		.lean<ExpertAdviceUserItem[]>();
}

export async function getAdminExpertAdvicePage(
	page: number,
	limit: number,
): Promise<ExpertAdviceAdminPage> {
	await connectToDatabase();

	const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
	const safeLimit = Math.min(30, Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 10));
	const skip = (safePage - 1) * safeLimit;
	const { start, end } = getUtcDayRange();

	const [todayDocs, pastDocs, totalPast] = await Promise.all([
		ExpertAdvice.find({
			adviceDate: { $gte: start, $lt: end },
			isActive: true,
		})
			.sort({ createdAt: -1 })
			.lean<ExpertAdviceAdminItem[]>(),
		ExpertAdvice.find({
			adviceDate: { $lt: start },
			isActive: true,
		})
			.sort({ adviceDate: -1, createdAt: -1 })
			.skip(skip)
			.limit(safeLimit)
			.lean<ExpertAdviceAdminItem[]>(),
		ExpertAdvice.countDocuments({ adviceDate: { $lt: start }, isActive: true }),
	]);

	return {
		todayItems: todayDocs,
		pastItems: pastDocs,
		totalPast,
		page: safePage,
		limit: safeLimit,
	};
}

export async function createTodayExpertAdvice(advice: string) {
	await connectToDatabase();

	const trimmedAdvice = advice.trim();
	if (!trimmedAdvice) {
		throw new Error("Advice text is required");
	}

	const now = new Date();

	const created = await ExpertAdvice.create({
		advice: trimmedAdvice,
		adviceDate: now,
		isActive: true,
	});

	return created.toObject();
}

export async function updatePastExpertAdvice(adviceId: string, advice: string) {
	await connectToDatabase();

	const trimmedAdvice = advice.trim();
	if (!trimmedAdvice) {
		throw new Error("Advice text is required");
	}

	const existing = await ExpertAdvice.findById(adviceId);
	if (!existing || !existing.isActive) {
		return null;
	}

	existing.advice = trimmedAdvice;
	await existing.save();

	return existing.toObject();
}

export async function deletePastExpertAdvice(adviceId: string) {
	await connectToDatabase();

	const existing = await ExpertAdvice.findById(adviceId);
	if (!existing || !existing.isActive) {
		return null;
	}

	existing.isActive = false;
	await existing.save();

	return { _id: existing._id.toString() };
}
