import type { IpoSummary, MutualFundSummary } from "@/types/dashboard";

export const ipoWatchlist: IpoSummary[] = [
	{
		name: "Pulse Renewables",
		stage: "Open",
		priceBand: "₹145 - ₹152",
		subscription: 2.34,
		closesOn: "Feb 28",
		lotSize: 98,
	},
	{
		name: "Riverstone Logistics",
		stage: "Upcoming",
		priceBand: "₹310 - ₹325",
		subscription: 0.0,
		closesOn: "Mar 04",
		lotSize: 45,
	},
	{
		name: "Crest Infra",
		stage: "Listing",
		priceBand: "₹88 - ₹90",
		subscription: 5.12,
		closesOn: "Listed Feb 20",
		lotSize: 165,
	},
];

export const mutualFundWatchlist: MutualFundSummary[] = [
	{
		name: "Axis Bluechip Fund",
		category: "Large Cap",
		nav: 72.14,
		oneDay: 0.32,
		oneYear: 18.4,
		risk: "Moderate",
	},
	{
		name: "Parallax Flexi Cap",
		category: "Flexi Cap",
		nav: 134.67,
		oneDay: -0.15,
		oneYear: 22.7,
		risk: "High",
	},
	{
		name: "Horizon Equity & Debt",
		category: "Balanced",
		nav: 54.03,
		oneDay: 0.21,
		oneYear: 13.2,
		risk: "Low",
	},
];
