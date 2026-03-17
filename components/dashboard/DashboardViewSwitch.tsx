import Link from "next/link";

type DashboardViewSwitchProps = {
	activeView: "market-info" | "expert-videos";
};

const views = [
	{ id: "market-info", label: "Market info", href: "/dashboard" },
	{ id: "expert-videos", label: "Expert videos", href: "/dashboard/expert-videos" },
] as const;

export default function DashboardViewSwitch({ activeView }: DashboardViewSwitchProps) {
	return (
		<div className="inline-flex w-full rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
			{views.map((view) => {
				const isActive = activeView === view.id;

				return (
					<Link
						key={view.id}
						href={view.href}
						className={`rounded-xl px-4 py-2 text-sm font-semibold transition sm:px-5 ${
							isActive
								? "bg-slate-900 text-white"
								: "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
						}`}
					>
						{view.label}
					</Link>
				);
			})}
		</div>
	);
}
