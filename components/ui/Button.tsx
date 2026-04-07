import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "ghost" | "outline";
	size?: "sm" | "md" | "lg" | "icon";
	asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant = "primary",
			size = "md",
			asChild = false,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";

		return (
			<Comp
				className={cn(
					// Base styles
					"relative inline-flex items-center justify-center font-medium",
					"transition-all duration-300 ease-out",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]",
					"disabled:pointer-events-none disabled:opacity-50",
					"active:scale-[0.98]",

					// Size variants
					{
						"text-sm px-4 py-2 rounded-lg gap-2": size === "sm",
						"text-base px-6 py-3 rounded-xl gap-2": size === "md",
						"text-lg px-8 py-4 rounded-2xl gap-3": size === "lg",
						"p-2.5 rounded-xl": size === "icon",
					},

					// Visual variants
					{
						// Primary - glowing green
						"bg-[#22c55e] text-[#050505] font-semibold hover:bg-[#16a34a]":
							variant === "primary",
						"hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]":
							variant === "primary",

						// Secondary - subtle dark
						"bg-[#141414] text-[#fafafa] border border-[#262626]":
							variant === "secondary",
						"hover:bg-[#1a1a1a] hover:border-[#333333]":
							variant === "secondary",

						// Ghost - minimal
						"text-[#a3a3a3] hover:text-[#fafafa]":
							variant === "ghost",
						"hover:bg-white/5": variant === "ghost",

						// Outline - bordered
						"border border-[#262626] text-[#fafafa] bg-transparent":
							variant === "outline",
						"hover:border-[#22c55e] hover:text-[#22c55e]":
							variant === "outline",
					},

					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);

Button.displayName = "Button";

export { Button };
