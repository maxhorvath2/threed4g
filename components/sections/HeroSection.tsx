"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";
import { MagneticButton } from "@/components/animations/MagneticButton";

export function HeroSection() {
	const sectionRef = useRef<HTMLElement>(null);
	const titleRef = useRef<HTMLHeadingElement>(null);
	const subtitleRef = useRef<HTMLParagraphElement>(null);
	const buttonsRef = useRef<HTMLDivElement>(null);
	const orb1Ref = useRef<HTMLDivElement>(null);
	const orb2Ref = useRef<HTMLDivElement>(null);
	const orb3Ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const ctx = gsap.context(() => {
			// Initial states
			gsap.set(
				[titleRef.current, subtitleRef.current, buttonsRef.current],
				{
					opacity: 0,
					y: 60,
				},
			);

			// Create timeline
			const tl = gsap.timeline({ delay: 0.3 });

			// Animate title words
			if (titleRef.current) {
				const words = titleRef.current.querySelectorAll(".word");
				gsap.set(words, { y: 100, opacity: 0 });

				tl.to(titleRef.current, { opacity: 1, y: 0, duration: 0 }).to(
					words,
					{
						y: 0,
						opacity: 1,
						duration: 1,
						stagger: 0.08,
						ease: "power4.out",
					},
				);
			}

			// Animate subtitle
			tl.to(
				subtitleRef.current,
				{
					opacity: 1,
					y: 0,
					duration: 0.8,
					ease: "power3.out",
				},
				"-=0.5",
			);

			// Animate buttons
			tl.to(
				buttonsRef.current,
				{
					opacity: 1,
					y: 0,
					duration: 0.8,
					ease: "power3.out",
				},
				"-=0.5",
			);

			// Floating orbs animation
			gsap.to(orb1Ref.current, {
				y: -30,
				x: 20,
				duration: 6,
				repeat: -1,
				yoyo: true,
				ease: "sine.inOut",
			});

			gsap.to(orb2Ref.current, {
				y: 40,
				x: -30,
				duration: 8,
				repeat: -1,
				yoyo: true,
				ease: "sine.inOut",
			});

			gsap.to(orb3Ref.current, {
				y: -20,
				x: -20,
				duration: 7,
				repeat: -1,
				yoyo: true,
				ease: "sine.inOut",
			});
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	// Mouse parallax effect for orbs
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			const { clientX, clientY } = e;
			const centerX = window.innerWidth / 2;
			const centerY = window.innerHeight / 2;

			const moveX = (clientX - centerX) / 50;
			const moveY = (clientY - centerY) / 50;

			gsap.to(orb1Ref.current, {
				x: moveX * 2,
				y: moveY * 2,
				duration: 1,
				ease: "power2.out",
			});

			gsap.to(orb2Ref.current, {
				x: moveX * -1.5,
				y: moveY * -1.5,
				duration: 1,
				ease: "power2.out",
			});

			gsap.to(orb3Ref.current, {
				x: moveX * 1,
				y: moveY * 1,
				duration: 1,
				ease: "power2.out",
			});
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	const titleWords = ["Precision", "Engineered", "Grow", "Accessories"];

	return (
		<section
			ref={sectionRef}
			className="relative min-h-screen flex items-center justify-center overflow-hidden"
		>
			{/* Background gradient orbs */}
			<div
				ref={orb1Ref}
				className="absolute top-1/4 left-1/4 w-125 h-125 rounded-full bg-[#22c55e]/10 blur-[120px] pointer-events-none"
			/>
			<div
				ref={orb2Ref}
				className="absolute bottom-1/4 right-1/4 w-150 h-150 rounded-full bg-[#22c55e]/5 blur-[150px] pointer-events-none"
			/>
			<div
				ref={orb3Ref}
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-100 h-100 rounded-full bg-[#16a34a]/10 blur-[100px] pointer-events-none"
			/>

			{/* Grid pattern overlay */}
			<div
				className="absolute inset-0 opacity-[0.03]"
				style={{
					backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(34, 197, 94, 0.3) 1px, transparent 1px)`,
					backgroundSize: "60px 60px",
				}}
			/>

			{/* Content */}
			<div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-20">
				{/* Eyebrow */}
				<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/5 mb-8 animate-fade-in">
					<span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
					<span className="text-sm text-[#22c55e] font-medium">
						Premium 3D Printed Products
					</span>
				</div>

				{/* Title */}
				<h1
					ref={titleRef}
					className="text-hero mb-8 text-[#fafafa] font-display"
				>
					{titleWords.map((word, index) => (
						<span
							key={index}
							className="inline-block overflow-visible mr-[0.3em]"
						>
							<span className="word inline-block">
								{word === "Grow" ? (
									<span className="text-[#22c55e]">
										{word}
									</span>
								) : (
									word
								)}
							</span>
						</span>
					))}
				</h1>

				{/* Subtitle */}
				<p
					ref={subtitleRef}
					className="text-subheadline text-[#a3a3a3] max-w-2xl mx-auto mb-12 leading-relaxed"
				>
					Elevate your growing experience with meticulously designed,
					high-quality 3D printed accessories built to last.
				</p>

				{/* Buttons */}
				<div
					ref={buttonsRef}
					className="flex flex-col sm:flex-row gap-4 justify-center"
				>
					<MagneticButton strength={0.15}>
						<Button asChild size="lg">
							<Link href="/products">
								Explore Products
								<svg
									className="w-5 h-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 8l4 4m0 0l-4 4m4-4H3"
									/>
								</svg>
							</Link>
						</Button>
					</MagneticButton>

					<MagneticButton strength={0.15}>
						<Button asChild variant="outline" size="lg">
							<Link href="/contact">Get in Touch</Link>
						</Button>
					</MagneticButton>
				</div>
			</div>

			{/* Scroll indicator - positioned outside content div, hidden on mobile */}
			<div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 animate-fade-in stagger-5 z-20">
				<span className="text-xs text-[#737373] uppercase tracking-widest">
					Scroll
				</span>
				<div className="w-px h-12 bg-linear-to-b from-[#22c55e] to-transparent" />
			</div>

			{/* Bottom gradient fade */}
			<div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-[#050505] to-transparent pointer-events-none" />
		</section>
	);
}
