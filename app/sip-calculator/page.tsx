import Navbar from "@/components/Navbar";
import SipCalculator from "@/components/calculator/SipCalculator";

export const metadata = {
	title: "SIP Calculator | MoneyIQ",
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
			<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
				<section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
					<div className="space-y-3">
						<p className="text-sm font-medium uppercase tracking-wide text-slate-500">
							Financial Calculator
						</p>
						<h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
							SIP Calculator
						</h1>
						<p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
							Estimate your SIP corpus with monthly contribution, annual return, and
							time horizon inputs.
						</p>
					</div>
				</section>

				<div className="w-full">
					<SipCalculator />
				</div>
			</main>
		</div>
	);
}
