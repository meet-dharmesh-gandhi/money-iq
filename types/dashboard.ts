export type LiveStock = {
	symbol: string;
	company: string;
	ltp: number;
	percentChange: number;
	points: number[];
};

export type IpoSummary = {
	id?: string;
	name: string;
	stage: "Open" | "Upcoming" | "Listing";
	sourceTag?: "Current" | "Upcoming";
	priceBand: string;
	subscription: number;
	closesOn: string;
	lotSize: number;
};

export type MutualFundResponse = {
	schemeCode: number;
	schemeName: string;
	nav: number;
	date: string;
	fundHouse: string;
	category: string;
	type: string;
};

export type MutualFundSummary = {
	name: string;
	category: string;
	nav: number;
	oneDay: number;
	oneYear: number;
	risk: "Low" | "Moderate" | "High";
};

export type AvailableStock = {
	token: string;
	symbol: string;
	company: string;
};
