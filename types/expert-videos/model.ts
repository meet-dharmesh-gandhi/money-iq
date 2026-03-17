export type ExpertVideoItem = {
	title: string;
	videoUrl: string;
	publishedAt: string;
	description?: string;
	channelName?: string;
	thumbnailUrl?: string;
};

export type ExpertVideoDocument = ExpertVideoItem & {
	_id?: string;
	publishedAt: string | Date;
};

export type ExpertVideoGroup = {
	date: string;
	items: ExpertVideoDocument[];
};
