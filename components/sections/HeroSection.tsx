"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";
import { MagneticButton } from "@/components/animations/MagneticButton";

export function HeroSection() {
	const sectionRef = useRef<HTMLElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLDivElement>(null);
	const glowRef = useRef<HTMLDivElement>(null);
	const lineRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const ctx = gsap.context(() => {
			// Stagger the text children in
			if (textRef.current) {
				const kids = Array.from(textRef.current.children);
				gsap.fromTo(
					kids,
					{ opacity: 0, y: 32 },
					{
						opacity: 1,
						y: 0,
						duration: 0.8,
						stagger: 0.09,
						ease: "power3.out",
						delay: 0.25,
					},
				);
			}

			// Image slides in from the right
			gsap.fromTo(
				imageRef.current,
				{ opacity: 0, x: 48, scale: 0.96 },
				{
					opacity: 1,
					x: 0,
					scale: 1,
					duration: 1.2,
					ease: "power3.out",
					delay: 0.4,
				},
			);

			// Glow breathes
			gsap.to(glowRef.current, {
				scale: 1.15,
				opacity: 0.7,
				duration: 3.5,
				repeat: -1,
				yoyo: true,
				ease: "sine.inOut",
			});

			// Scroll-line grows
			gsap.fromTo(
				lineRef.current,
				{ scaleY: 0, transformOrigin: "top center" },
				{
					scaleY: 1,
					duration: 1.2,
					ease: "power2.out",
					delay: 1.4,
				},
			);
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative min-h-screen flex items-center overflow-hidden"
		>
			{/* ── Background ─────────────────────────────────── */}
			<div className="absolute inset-0 bg-[#050505]" />

			{/* Subtle grid */}
			<div
				className="absolute inset-0 opacity-[0.025]"
				style={{
					backgroundImage: `
						linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px),
						linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)
					`,
					backgroundSize: "64px 64px",
				}}
			/>

			{/* Ambient orbs */}
			<div className="absolute top-1/4 -left-32 w-140 h-140 rounded-full bg-[#22c55e]/6 blur-[180px] pointer-events-none" />
			<div className="absolute bottom-0 right-0 w-100 h-100 rounded-full bg-[#22c55e]/5 blur-[160px] pointer-events-none" />

			{/* ── Layout ─────────────────────────────────────── */}
			<div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
				<div className="grid lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_520px] gap-12 xl:gap-20 items-center min-h-screen py-32">
					{/* Left: text */}
					<div
						ref={textRef}
						className="flex flex-col items-start order-2 lg:order-1"
					>
						{/* Launch badge */}
						<div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#22c55e]/25 bg-[#22c55e]/8 mb-10">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-60" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
							</span>
							<span className="text-xs font-bold text-[#22c55e] tracking-[0.22em] uppercase">
								4/20 Drop · Now Live
							</span>
						</div>

						{/* Headline */}
						<h1 className="font-display font-black leading-[0.88] tracking-tight mb-8">
							<span className="block text-[clamp(3.5rem,6.5vw,7rem)] text-[#fafafa]">
								THE
							</span>
							<span
								className="block text-[clamp(3.5rem,6.5vw,7rem)] text-[#22c55e]"
								style={{
									textShadow:
										"0 0 100px rgba(34,197,94,0.45), 0 0 30px rgba(34,197,94,0.25)",
								}}
							>
								BANGER
							</span>
							<span className="block text-[clamp(3.5rem,6.5vw,7rem)] text-[#fafafa]">
								BATH
							</span>
						</h1>

						{/* Tagline */}
						<p className="text-[#737373] text-base font-medium italic tracking-wide mb-3">
							&quot;Keep your nails fresh to death.&quot;
						</p>

						{/* Description */}
						<p className="text-[#a3a3a3] text-base leading-relaxed max-w-120 mb-10">
							Drop your piece into the bath — it seats just like
							it would in a rig. Fill with isopropyl, close the
							lid, and dial the knob to push it through. Clean
							glass in seconds, no scrubbing required.
						</p>

						{/* Feature pills */}
						<div className="flex flex-wrap gap-2 mb-12">
							{[
								"ISO Bath",
								"Adjustable Knob",
								"Joint Fit",
								"Solvent-Tough PETG",
							].map((tag) => (
								<span
									key={tag}
									className="px-3.5 py-1.5 rounded-full bg-[#0f0f0f] border border-[#252525] text-sm text-[#737373] font-medium"
								>
									{tag}
								</span>
							))}
						</div>

						{/* CTAs */}
						<div className="flex flex-col sm:flex-row gap-4">
							<MagneticButton strength={0.15}>
								<Button asChild size="lg">
									<Link href="/product/11">
										Shop The Drop
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
									<Link href="/contact">Get In Touch</Link>
								</Button>
							</MagneticButton>
						</div>
					</div>

					{/* Right: product photo */}
					<div
						ref={imageRef}
						className="relative order-1 lg:order-2 flex justify-center lg:justify-end"
					>
						{/* Glow halo */}
						<div
							ref={glowRef}
							className="absolute inset-0 rounded-[2.5rem] bg-[#22c55e]/18 blur-[72px] pointer-events-none"
						/>

						{/* Image frame */}
						<div className="relative w-full max-w-sm lg:max-w-none rounded-4xl overflow-hidden border border-[#22c55e]/12 shadow-[0_0_80px_rgba(34,197,94,0.12)]">
							<Image
								src="/bath1.JPG"
								alt="Banger Bath — precision engineered dab accessory"
								width={800}
								height={1067}
								className="w-full h-auto object-cover"
								priority
							/>
							{/* Bottom gradient so image bleeds into page */}
							<div className="absolute bottom-0 left-0 right-0 h-28 bg-linear-to-t from-[#050505] to-transparent" />
						</div>

						{/* Floating stat cards */}
						<div className="absolute -left-4 top-1/4 hidden lg:flex flex-col gap-1 px-4 py-3 rounded-2xl bg-[#0f0f0f]/90 border border-[#1e1e1e] backdrop-blur-sm shadow-xl">
							<span className="text-xs text-[#737373] font-medium uppercase tracking-wider">
								Pressure
							</span>
							<span className="text-sm font-semibold text-[#fafafa]">
								Adjustable Knob
							</span>
						</div>
						<div className="absolute -right-4 bottom-1/3 hidden lg:flex flex-col gap-1 px-4 py-3 rounded-2xl bg-[#0f0f0f]/90 border border-[#1e1e1e] backdrop-blur-sm shadow-xl">
							<span className="text-xs text-[#737373] font-medium uppercase tracking-wider">
								Fit
							</span>
							<span className="text-sm font-semibold text-[#22c55e]">
								Standard Joint
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Scroll indicator */}
			<div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 z-20">
				<span className="text-[10px] text-[#525252] uppercase tracking-[0.25em]">
					Scroll
				</span>
				<div
					ref={lineRef}
					className="w-px h-12 bg-linear-to-b from-[#22c55e] to-transparent"
				/>
			</div>

			{/* Bottom page fade */}
			<div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-[#050505] to-transparent pointer-events-none" />
		</section>
	);
}
