import type { ExpertVideoDocument, ExpertVideoGroup } from "./model";

export type ExpertVideosPageResponse = {
	items: ExpertVideoDocument[];
	groups: ExpertVideoGroup[];
	total: number;
	page: number;
	limit: number;
};
