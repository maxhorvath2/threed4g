"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";

const features = [
	{
		icon: (
			<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
				/>
			</svg>
		),
		title: "Precision Design",
		description:
			"Every product is meticulously engineered using advanced CAD software, ensuring perfect fit and optimal performance in grow tent environments.",
	},
	{
		icon: (
			<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
				/>
			</svg>
		),
		title: "Premium Materials",
		description:
			"Built with high-grade PETG and ASA filaments that withstand humidity, heat, and the unique conditions of indoor growing environments.",
	},
	{
		icon: (
			<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
				/>
			</svg>
		),
		title: "Custom Solutions",
		description:
			"Need something unique? We collaborate with growers to create bespoke solutions tailored to your specific setup and requirements.",
	},
];

export function FeaturesSection() {
	const sectionRef = useRef<HTMLElement>(null);
	const cardsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const ctx = gsap.context(() => {
			// Animate heading
			gsap.fromTo(
				".features-heading",
				{ opacity: 0, y: 30 },
				{
					opacity: 1,
					y: 0,
					duration: 0.6,
					ease: "power4.out",
					scrollTrigger: {
						trigger: ".features-heading",
						start: "top 90%",
						once: true,
					},
				}
			);

			// Animate cards with stagger
			if (cardsRef.current) {
				const cards = cardsRef.current.children;
				gsap.fromTo(
					cards,
					{ opacity: 0, y: 40 },
					{
						opacity: 1,
						y: 0,
						duration: 0.5,
						stagger: 0.08,
						ease: "power4.out",
						scrollTrigger: {
							trigger: cardsRef.current,
							start: "top 90%",
							once: true,
						},
					}
				);
			}
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative py-32 overflow-hidden"
		>
			{/* Background accent */}
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#171717] to-transparent" />

			<div className="max-w-7xl mx-auto px-6">
				{/* Section Header */}
				<div className="features-heading text-center max-w-3xl mx-auto mb-20">
					<span className="inline-block text-[#22c55e] text-sm font-medium tracking-wider uppercase mb-4">
						Why Choose Us
					</span>
					<h2 className="text-headline text-[#fafafa] mb-6">
						Engineered for{" "}
						<span className="text-[#22c55e]">Excellence</span>
					</h2>
					<p className="text-lg text-[#a3a3a3] leading-relaxed">
						We combine cutting-edge 3D printing technology with deep
						understanding of grow tent environments to deliver products that
						actually work.
					</p>
				</div>

				{/* Feature Cards */}
				<div
					ref={cardsRef}
					className="grid md:grid-cols-3 gap-6 lg:gap-8"
				>
					{features.map((feature, index) => (
						<Card
							key={index}
							variant="interactive"
							className="p-8 group"
						>
							{/* Icon */}
							<div className="w-14 h-14 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-[#22c55e] mb-6 group-hover:bg-[#22c55e]/20 group-hover:scale-110 transition-all duration-300">
								{feature.icon}
							</div>

							{/* Content */}
							<h3 className="text-xl font-semibold text-[#fafafa] mb-3 group-hover:text-[#22c55e] transition-colors duration-300">
								{feature.title}
							</h3>
							<p className="text-[#a3a3a3] leading-relaxed">
								{feature.description}
							</p>

							{/* Decorative line */}
							<div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#22c55e]/0 to-transparent group-hover:via-[#22c55e]/50 transition-all duration-500" />
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
