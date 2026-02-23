import type { StockSampleSeries } from "@/types/stocks/sample";

export const sampleStockSeries: StockSampleSeries[] = [
	{
		symbol: "SBIN",
		company: "State Bank of India",
		ltp: 568.2,
		percentChange: 0.14,
		points: [553, 556, 552, 558, 562, 565, 563, 567, 569, 568],
	},
	{
		symbol: "RELIANCE",
		company: "Reliance Industries",
		ltp: 2721.4,
		percentChange: 0.62,
		points: [2678, 2686, 2694, 2702, 2708, 2716, 2724, 2718, 2722, 2721],
	},
	{
		symbol: "TCS",
		company: "Tata Consultancy",
		ltp: 3924.9,
		percentChange: -0.38,
		points: [3982, 3974, 3966, 3958, 3948, 3940, 3936, 3931, 3926, 3925],
	},
	{
		symbol: "INFY",
		company: "Infosys",
		ltp: 1668.3,
		percentChange: 0.27,
		points: [1638, 1644, 1650, 1658, 1664, 1669, 1672, 1670, 1667, 1668],
	},
	{
		symbol: "HDFCBANK",
		company: "HDFC Bank",
		ltp: 1534.6,
		percentChange: 0.11,
		points: [1518, 1522, 1526, 1530, 1535, 1537, 1533, 1536, 1534, 1535],
	},
];
