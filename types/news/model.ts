export type NewsItem = {
	id: string;
	externalId?: number;
	title: string;
	summary: string;
	url: string;
	source: string;
	publishedAt: string;
	image?: string;
	category?: string;
};

export type NewsDocument = NewsItem & {
	_id?: string;
	publishedAt: string | Date;
};
