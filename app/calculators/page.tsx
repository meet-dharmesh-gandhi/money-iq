import Navbar from "@/components/Navbar";
import CalculatorsTabs from "@/components/calculator/CalculatorsTabs";

export const metadata = {
	title: "Calculators | MoneyIQ",
};

export default function CalculatorsPage() {
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
					{ type: "link", label: "Get started", href: "/signup", variant: "primary" },
				]}
			/>

			<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
				<CalculatorsTabs />
			</main>
		</div>
	);
}
