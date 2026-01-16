"use client";

import { useRef, useEffect, ReactNode, Children } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface StaggerChildrenProps {
	children: ReactNode;
	className?: string;
	stagger?: number;
	delay?: number;
	duration?: number;
	direction?: "up" | "down" | "left" | "right";
	distance?: number;
}

export function StaggerChildren({
	children,
	className = "",
	stagger = 0.1,
	delay = 0,
	duration = 0.6,
	direction = "up",
	distance = 30,
}: StaggerChildrenProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const items = containerRef.current.children;

		const directionMap = {
			up: { y: distance, x: 0 },
			down: { y: -distance, x: 0 },
			left: { x: distance, y: 0 },
			right: { x: -distance, y: 0 },
		};

		const { x, y } = directionMap[direction];

		gsap.set(items, {
			opacity: 0,
			x,
			y,
		});

		gsap.to(items, {
			opacity: 1,
			x: 0,
			y: 0,
			duration,
			stagger,
			delay,
			ease: "power3.out",
			scrollTrigger: {
				trigger: containerRef.current,
				start: "top 85%",
				once: true,
			},
		});

		return () => {
			ScrollTrigger.getAll().forEach((t) => t.kill());
		};
	}, [stagger, delay, duration, direction, distance]);

	return (
		<div ref={containerRef} className={className}>
			{Children.map(children, (child) => child)}
		</div>
	);
}
