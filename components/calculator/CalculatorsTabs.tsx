"use client";

import { useState } from "react";
import SipCalculator from "@/components/calculator/SipCalculator";
import RetirementCalculator from "@/components/calculator/RetirementCalculator";

type CalculatorTab = "sip" | "retirement";

export default function CalculatorsTabs() {
	const [activeTab, setActiveTab] = useState<CalculatorTab>("sip");

	return (
		<div className="space-y-6">
			<section className="flex flex-wrap items-center justify-center">
				<div className="flex w-fit rounded-full p-2 gap-3 border border-slate-200 bg-white shadow-sm">
					<button
						type="button"
						onClick={() => setActiveTab("sip")}
						className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
							activeTab === "sip"
								? "bg-slate-900 text-white"
								: "border border-slate-300 bg-gray-100 text-slate-700 hover:border-slate-400"
						}`}
					>
						SIP Calculator
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("retirement")}
						className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
							activeTab === "retirement"
								? "bg-slate-900 text-white"
								: "border border-slate-300 bg-gray-100 text-slate-700 hover:border-slate-400"
						}`}
					>
						Retirement Calculator
					</button>
				</div>
			</section>

			{activeTab === "sip" ? (
				<div className="space-y-6">
					<div className="text-center space-y-4">
						<h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
							How much can your SIP grow over time?
						</h1>
						<p className="mx-auto max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
							This calculator helps you project the future value of your monthly SIP
							by factoring in your contribution amount, expected annual return, and
							investment duration, so you can plan your financial goals with more
							clarity.
						</p>
					</div>
					<SipCalculator />
				</div>
			) : (
				<RetirementCalculator />
			)}
		</div>
	);
}
