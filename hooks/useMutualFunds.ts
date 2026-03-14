import { useState, useCallback, useEffect } from "react";
import type { MutualFundResponse } from "@/types/dashboard";

export const useMutualFunds = () => {
	const [mutualFunds, setMutualFunds] = useState<MutualFundResponse[]>([]);
	const [mfLoading, setMfLoading] = useState(false);
	const [mfOffset, setMfOffset] = useState(0);
	const [mfHasMore, setMfHasMore] = useState(true);

	// Load mutual funds
	const loadMutualFunds = useCallback(
		async (offset = 0, reset = false) => {
			if (mfLoading) return;

			setMfLoading(true);
			try {
				const response = await fetch(`/api/mutual-funds?limit=20&offset=${offset}`);
				if (!response.ok) throw new Error("Failed to fetch mutual funds");

				const data = await response.json();
				if (data.success) {
					setMutualFunds((prev) => (reset ? data.data : [...prev, ...data.data]));
					setMfHasMore(data.pagination.hasMore);
					setMfOffset(offset + 20);
				}
			} catch (error) {
				console.error("Error loading mutual funds:", error);
			} finally {
				setMfLoading(false);
			}
		},
		[mfLoading],
	);

	// Load initial mutual funds
	useEffect(() => {
		loadMutualFunds(0, true);
	}, []);

	return {
		mutualFunds,
		mfLoading,
		mfOffset,
		mfHasMore,
		loadMutualFunds,
	};
};
