"use client";

import { useRef, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";

const features = [
	{
		icon: (
			<svg
				className="w-8 h-8"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
				/>
			</svg>
		),
		title: "Dial In the Clean",
		description:
			"The adjustable knob controls how hard the ISO gets pushed through your piece. Caked-on residue? Crank it up. Light maintenance? Back it off. You're in control.",
	},
	{
		icon: (
			<svg
				className="w-8 h-8"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
				/>
			</svg>
		),
		title: "Fits Like a Rig",
		description:
			"Your piece drops into the bath the same way it fits into a rig — that joint connection you already know. No adapters, no fiddling, no improvising.",
	},
	{
		icon: (
			<svg
				className="w-8 h-8"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
				/>
			</svg>
		),
		title: "Sealed & Solvent-Ready",
		description:
			"The lid locks everything down so the ISO stays where it should. High-grade PETG handles cleaning solution daily without warping, clouding, or cracking.",
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
				},
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
					},
				);
			}
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative py-20 md:py-32 overflow-hidden"
		>
			{/* Background accent */}
			<div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#171717] to-transparent" />

			<div className="max-w-7xl mx-auto px-4 sm:px-6">
				{/* Section Header */}
				<div className="features-heading text-center max-w-3xl mx-auto mb-12 md:mb-20">
					<span className="inline-block text-[#22c55e] text-sm font-medium tracking-wider uppercase mb-4">
						Why It Slaps
					</span>
					<h2 className="text-headline text-[#fafafa] mb-6">
						Every Detail{" "}
						<span className="text-[#22c55e]">Matters</span>
					</h2>
					<p className="text-lg text-[#a3a3a3] leading-relaxed">
						Drop your piece in, fill with ISO, close the lid, and
						dial the knob. That&apos;s the whole process — no
						soaking overnight, no scrubbing residue off your banger.
					</p>
				</div>

				{/* Feature Cards */}
				<div
					ref={cardsRef}
					className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8"
				>
					{features.map((feature, index) => (
						<Card
							key={index}
							variant="interactive"
							className="p-5 sm:p-6 md:p-8 group"
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
							<div className="absolute bottom-0 left-8 right-8 h-px bg-linear-to-r from-transparent via-[#22c55e]/0 to-transparent group-hover:via-[#22c55e]/50 transition-all duration-500" />
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
