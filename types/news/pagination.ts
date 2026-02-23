import type { NewsDocument } from "./model";

export type NewsPageResponse = {
	items: NewsDocument[];
	total: number;
	page: number;
	limit: number;
};
