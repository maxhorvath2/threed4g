import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "elevated" | "glass" | "interactive";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
	({ className, variant = "default", ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"rounded-2xl border transition-all duration-300",

					{
						// Default - subtle background
						"bg-[#0a0a0a] border-[#171717] hover:border-[#262626]":
							variant === "default",

						// Elevated - slightly raised with shadow
						"bg-[#0f0f0f] border-[#1a1a1a] shadow-lg hover:shadow-xl":
							variant === "elevated",

						// Glass - frosted glass effect
						"bg-white/5 border-white/10 backdrop-blur-xl":
							variant === "glass",

						// Interactive - hover lift effect
						"bg-[#0a0a0a] border-[#171717] hover:border-[#22c55e]/30":
							variant === "interactive",
						"hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]":
							variant === "interactive",
					},

					className
				)}
				{...props}
			/>
		);
	}
);

Card.displayName = "Card";

const CardHeader = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("p-6 pb-0", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardContent = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("p-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("p-6 pt-0 flex items-center", className)}
		{...props}
	/>
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardContent, CardFooter };
