interface TabNavigationProps {
	activeSection: string;
	switchSection: (sectionId: string) => void;
}

const sectionAnchors = [
	{ id: "stocks", label: "Live stocks" },
	{ id: "ipos", label: "IPOs" },
	{ id: "mutual-funds", label: "Mutual funds" },
];

export default function TabNavigation({ activeSection, switchSection }: TabNavigationProps) {
	return (
		<div className="flex items-center justify-center">
			<div className="inline-flex gap-4 w-full">
				{sectionAnchors.map((anchor) => {
					const isActive = activeSection === anchor.id;
					return (
						<button
							key={anchor.id}
							type="button"
							onClick={() => switchSection(anchor.id)}
							className={`px-8 py-4 text-sm rounded-xl w-full font-semibold transition-all border shadow-sm border-slate-200 last:border-r-0 cursor-pointer ${
								isActive
									? "bg-slate-900 text-white"
									: "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
							}`}
						>
							{anchor.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
