import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: "default" | "primary" | "secondary" | "outline";
}

export function Badge({
	className,
	variant = "default",
	...props
}: BadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",

				{
					// Default - subtle
					"bg-[#171717] text-[#a3a3a3]": variant === "default",

					// Primary - green
					"bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20":
						variant === "primary",

					// Secondary - muted
					"bg-[#1a1a1a] text-[#737373]": variant === "secondary",

					// Outline
					"border border-[#262626] text-[#a3a3a3]": variant === "outline",
				},

				className
			)}
			{...props}
		/>
	);
}
