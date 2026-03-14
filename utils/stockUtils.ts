import type { LiveStock, AvailableStock } from "@/types/dashboard";

// Available stocks for watchlist selection
export const availableStocks: AvailableStock[] = [
	{ token: "99926000", symbol: "RELIANCE", company: "Reliance Industries" },
	{ token: "99926009", symbol: "TCS", company: "Tata Consultancy Services" },
	{ token: "99926037", symbol: "HDFCBANK", company: "HDFC Bank" },
	{ token: "99926074", symbol: "INFY", company: "Infosys" },
	{ token: "99926186", symbol: "ITC", company: "ITC Limited" },
	{ token: "99926011", symbol: "ICICIBANK", company: "ICICI Bank" },
	{ token: "99926015", symbol: "SBI", company: "State Bank of India" },
	{ token: "99926017", symbol: "BHARTIARTL", company: "Bharti Airtel" },
	{ token: "99926021", symbol: "LT", company: "Larsen & Toubro" },
	{ token: "99926025", symbol: "WIPRO", company: "Wipro Limited" },
];

// Generate fallback stock data that matches all availableStocks symbols
export const generateFallbackStocks = (): LiveStock[] => {
	return availableStocks.map((stock) => ({
		symbol: stock.symbol,
		company: stock.company,
		ltp: 1000 + Math.random() * 2000, // Random price between 1000-3000
		percentChange: (Math.random() - 0.5) * 10, // Random change between -5% to +5%
		points: Array.from({ length: 20 }, () => 1000 + Math.random() * 2000),
	}));
};
