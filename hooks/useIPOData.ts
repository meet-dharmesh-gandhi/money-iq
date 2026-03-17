import { useMemo, useState, useCallback } from "react";
import type { IpoSummary } from "@/types/dashboard";
import type { IpoUpdate } from "@/types/websocket";

export type IpoFilter = "all" | "current" | "upcoming";

const sourceTagToFilter = (sourceTag?: IpoSummary["sourceTag"]): IpoFilter => {
	if (sourceTag === "Current") {
		return "current";
	}
	if (sourceTag === "Upcoming") {
		return "upcoming";
	}
	return "all";
};

const compareIpos = (a: IpoSummary, b: IpoSummary) => {
	if (a.sourceTag !== b.sourceTag) {
		return a.sourceTag === "Current" ? -1 : 1;
	}

	return a.name.localeCompare(b.name);
};

const mapUpdateToSummary = (update: IpoUpdate): IpoSummary => ({
	id: update.id,
	name: update.name,
	stage: update.stage,
	sourceTag: update.sourceTag,
	priceBand: update.priceBand,
	subscription: update.subscription,
	closesOn: update.closesOn,
	lotSize: update.lotSize,
});

export const useIPOData = (currentPage: number, pageSize = 6) => {
	const [allIpos, setAllIpos] = useState<IpoSummary[]>([]);
	const [filter, setFilter] = useState<IpoFilter>("all");
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

	const filteredIpos = useMemo(() => {
		if (filter === "all") {
			return allIpos;
		}

		return allIpos.filter((ipo) => sourceTagToFilter(ipo.sourceTag) === filter);
	}, [allIpos, filter]);

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(filteredIpos.length / pageSize));
	}, [filteredIpos.length, pageSize]);

	const safePage = useMemo(() => {
		return Math.min(Math.max(currentPage - 1, 0), Math.max(totalPages - 1, 0));
	}, [currentPage, totalPages]);

	const ipos = useMemo(() => {
		const start = safePage * pageSize;
		return filteredIpos.slice(start, start + pageSize);
	}, [filteredIpos, pageSize, safePage]);

	const handleIpoUpdate = useCallback((updates: IpoUpdate[]) => {
		if (!Array.isArray(updates) || updates.length === 0) {
			return;
		}

		setAllIpos(
			updates
				.map(mapUpdateToSummary)
				.filter((ipo) => ipo.sourceTag === "Current" || ipo.sourceTag === "Upcoming")
				.sort(compareIpos),
		);
		setLastRefresh(new Date());
	}, []);

	const setIpoList = useCallback((nextIpos: IpoSummary[]) => {
		setAllIpos(nextIpos);
		setLastRefresh(new Date());
	}, []);

	return {
		ipos,
		totalPages,
		lastRefresh,
		filter,
		setFilter,
		handleIpoUpdate,
		setIpoList,
	};
};
