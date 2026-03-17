type AdminPlaceholderProps = {
	title: string;
	description: string;
};

export default function AdminPlaceholder({ title, description }: AdminPlaceholderProps) {
	return (
		<section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
				Admin mode
			</p>
			<h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
			<p className="mt-2 text-sm text-slate-600">{description}</p>
			<div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
				Dummy admin UI placeholder. Full admin dashboard will be added next.
			</div>
		</section>
	);
}
