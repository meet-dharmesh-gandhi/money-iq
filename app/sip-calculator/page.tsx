import Navbar from "@/components/Navbar";
import SipCalculator from "@/components/calculator/SipCalculator";

export const metadata = {
	title: "Calculators | MoneyIQ",
};

export default function CalculatorPage() {
	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<Navbar
				actions={[
					{
						type: "link",
						label: "Log in",
						href: "/login",
						className: "hidden md:inline-flex",
					},
					{
						type: "link",
						label: "Get started",
						href: "/signup",
						variant: "primary",
					},
				]}
			/>
			<main className="mx-auto w-full max-w-5xl px-6 py-12">
				<div className="mb-10 space-y-3 text-center">
					<h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
						Financial Calculators
					</h1>
					<p className="text-lg text-slate-600">
						Plan your investments and achieve your financial goals with precision.
					</p>
				</div>

				<div className="mx-auto max-w-fit rounded-full bg-slate-200/60 p-1 mb-12">
					<div className="flex gap-1">
						<button className="rounded-full bg-white px-8 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition">
							SIP Calculator
						</button>
						<button className="rounded-full px-8 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-200/50 hover:text-slate-900 opacity-60 cursor-not-allowed" title="Coming soon">
							Retirement Calculator
						</button>
					</div>
				</div>

				<div className="mx-auto w-full">
					<SipCalculator />
				</div>
			</main>
		</div>
	);
}
