"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface TextRevealProps {
	children: string;
	className?: string;
	delay?: number;
	stagger?: number;
	trigger?: "load" | "scroll";
}

export function TextReveal({
	children,
	className = "",
	delay = 0,
	stagger = 0.02,
	trigger = "scroll",
}: TextRevealProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const hasAnimated = useRef(false);

	useEffect(() => {
		if (!containerRef.current || hasAnimated.current) return;

		const words = containerRef.current.querySelectorAll(".word");

		gsap.set(words, {
			y: "100%",
			opacity: 0,
		});

		const animationConfig = {
			y: "0%",
			opacity: 1,
			duration: 0.8,
			stagger: stagger,
			delay: delay,
			ease: "power4.out",
		};

		if (trigger === "scroll") {
			gsap.to(words, {
				...animationConfig,
				scrollTrigger: {
					trigger: containerRef.current,
					start: "top 85%",
					once: true,
				},
			});
		} else {
			gsap.to(words, animationConfig);
		}

		hasAnimated.current = true;

		return () => {
			ScrollTrigger.getAll().forEach((t) => t.kill());
		};
	}, [delay, stagger, trigger]);

	// Split text into words
	const words = children.split(" ").map((word, i) => (
		<span key={i} className="inline-block overflow-hidden">
			<span className="word inline-block">{word}</span>
			{i < children.split(" ").length - 1 && <span>&nbsp;</span>}
		</span>
	));

	return (
		<div ref={containerRef} className={className}>
			{words}
		</div>
	);
}
