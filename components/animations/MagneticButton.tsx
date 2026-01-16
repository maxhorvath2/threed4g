"use client";

import { useRef, useEffect, ReactNode } from "react";
import { gsap } from "gsap";

interface MagneticButtonProps {
	children: ReactNode;
	className?: string;
	strength?: number;
}

export function MagneticButton({
	children,
	className = "",
	strength = 0.3,
}: MagneticButtonProps) {
	const buttonRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const button = buttonRef.current;
		if (!button) return;

		const handleMouseMove = (e: MouseEvent) => {
			const rect = button.getBoundingClientRect();
			const x = e.clientX - rect.left - rect.width / 2;
			const y = e.clientY - rect.top - rect.height / 2;

			gsap.to(button, {
				x: x * strength,
				y: y * strength,
				duration: 0.3,
				ease: "power2.out",
			});
		};

		const handleMouseLeave = () => {
			gsap.to(button, {
				x: 0,
				y: 0,
				duration: 0.5,
				ease: "elastic.out(1, 0.3)",
			});
		};

		button.addEventListener("mousemove", handleMouseMove);
		button.addEventListener("mouseleave", handleMouseLeave);

		return () => {
			button.removeEventListener("mousemove", handleMouseMove);
			button.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [strength]);

	return (
		<div ref={buttonRef} className={`inline-block ${className}`}>
			{children}
		</div>
	);
}
