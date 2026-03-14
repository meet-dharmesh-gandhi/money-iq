interface WebSocketStatusProps {
	status: "connecting" | "connected" | "disconnected" | "error";
	subscriptionInfo: string;
	show?: boolean;
}

export default function WebSocketStatus({
	status,
	subscriptionInfo,
	show = true,
}: WebSocketStatusProps) {
	if (!show || process.env.NODE_ENV !== "development") return null;

	const getStatusColor = () => {
		switch (status) {
			case "connected":
				return "text-green-600 bg-green-50 border-green-200";
			case "connecting":
				return "text-yellow-600 bg-yellow-50 border-yellow-200";
			case "error":
				return "text-red-600 bg-red-50 border-red-200";
			default:
				return "text-gray-600 bg-gray-50 border-gray-200";
		}
	};

	const getStatusIcon = () => {
		switch (status) {
			case "connected":
				return "🟢";
			case "connecting":
				return "🟡";
			case "error":
				return "🔴";
			default:
				return "⚪";
		}
	};

	return (
		<div
			className={`fixed bottom-4 right-4 p-3 rounded-lg border text-xs font-mono max-w-sm ${getStatusColor()}`}
		>
			<div className="flex items-center gap-2 mb-1">
				<span>{getStatusIcon()}</span>
				<span className="font-semibold">WebSocket: {status}</span>
			</div>
			<div className="text-xs opacity-75">{subscriptionInfo}</div>
		</div>
	);
}
