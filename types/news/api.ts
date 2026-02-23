import type { NewsItem } from "./model";

export type NewsApiItem = {
	category: string;
	datetime: number;
	headline: string;
	id: number;
	image: string;
	related: string;
	source: string;
	summary: string;
	url: string;
};

export type NewsListResponse = {
	updatedAt: string;
	items: NewsItem[];
};
