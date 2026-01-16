"use client";

import { useRef, useEffect, ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface FadeInProps {
	children: ReactNode;
	className?: string;
	delay?: number;
	duration?: number;
	direction?: "up" | "down" | "left" | "right" | "none";
	distance?: number;
	trigger?: "load" | "scroll";
	once?: boolean;
}

export function FadeIn({
	children,
	className = "",
	delay = 0,
	duration = 0.8,
	direction = "up",
	distance = 30,
	trigger = "scroll",
	once = true,
}: FadeInProps) {
	const elementRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!elementRef.current) return;

		const element = elementRef.current;

		const directionMap = {
			up: { y: distance, x: 0 },
			down: { y: -distance, x: 0 },
			left: { x: distance, y: 0 },
			right: { x: -distance, y: 0 },
			none: { x: 0, y: 0 },
		};

		const { x, y } = directionMap[direction];

		gsap.set(element, {
			opacity: 0,
			x,
			y,
		});

		const animationConfig = {
			opacity: 1,
			x: 0,
			y: 0,
			duration,
			delay,
			ease: "power3.out",
		};

		if (trigger === "scroll") {
			gsap.to(element, {
				...animationConfig,
				scrollTrigger: {
					trigger: element,
					start: "top 90%",
					once,
				},
			});
		} else {
			gsap.to(element, animationConfig);
		}

		return () => {
			ScrollTrigger.getAll().forEach((t) => t.kill());
		};
	}, [delay, duration, direction, distance, trigger, once]);

	return (
		<div ref={elementRef} className={className}>
			{children}
		</div>
	);
}
