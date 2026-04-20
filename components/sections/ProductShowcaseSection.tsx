"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";

export function ProductShowcaseSection() {
	const sectionRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const ctx = gsap.context(() => {
			// Heading reveal
			gsap.fromTo(
				".showcase-heading",
				{ opacity: 0, y: 40 },
				{
					opacity: 1,
					y: 0,
					duration: 0.8,
					ease: "power3.out",
					scrollTrigger: {
						trigger: ".showcase-heading",
						start: "top 85%",
						once: true,
					},
				},
			);

			// Each photo tile fades + slides up
			gsap.fromTo(
				".showcase-tile",
				{ opacity: 0, y: 32, scale: 0.97 },
				{
					opacity: 1,
					y: 0,
					scale: 1,
					duration: 0.75,
					stagger: 0.1,
					ease: "power3.out",
					scrollTrigger: {
						trigger: ".showcase-grid",
						start: "top 85%",
						once: true,
					},
				},
			);
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative py-24 overflow-hidden bg-[#050505]"
		>
			{/* Top border */}
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1a1a1a] to-transparent" />

			<div className="max-w-7xl mx-auto px-4 sm:px-6">
				{/* Section header */}
				<div className="showcase-heading flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-14">
					<div>
						<span className="block text-[#22c55e] text-xs font-bold tracking-[0.25em] uppercase mb-3">
							The Craft
						</span>
						<h2
							className="font-display font-black leading-[0.9] tracking-tight text-[clamp(2.5rem,5vw,5rem)] text-[#fafafa]"
						>
							BUILT TO HIT<br />
							<span
								className="text-[#22c55e]"
								style={{
									textShadow:
										"0 0 60px rgba(34,197,94,0.35), 0 0 20px rgba(34,197,94,0.2)",
								}}
							>
								DIFFERENT.
							</span>
						</h2>
					</div>
					<p className="text-[#737373] text-sm leading-relaxed max-w-xs md:text-right">
						Every curve, every channel — engineered for the
						perfect cold side and the cleanest dab.
					</p>
				</div>

				{/* Asymmetric photo grid */}
				<div className="showcase-grid grid grid-cols-2 lg:grid-cols-12 gap-3 lg:gap-4">
					{/* bath3 — full width on mobile, tall left anchor on desktop */}
					<div
						className="showcase-tile col-span-2 lg:col-span-5 lg:row-span-2 relative rounded-2xl overflow-hidden border border-[#1a1a1a] group aspect-[4/3] lg:aspect-[3/4]"
					>
						<Image
							src="/bath3.JPG"
							alt="Banger Bath — front profile"
							fill
							sizes="(min-width: 1024px) 41vw, 100vw"
							className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
						/>
						<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505]/80 to-transparent" />
						<div className="absolute bottom-5 left-5 flex flex-col gap-0.5">
							<span className="text-[10px] text-[#525252] uppercase tracking-[0.2em] font-medium">
								Profile View
							</span>
							<span className="text-sm font-semibold text-[#fafafa]">
								The Banger Bath
							</span>
						</div>
					</div>

					{/* bath1 + bath2 — 2-col row on mobile, right-side panel on desktop */}
					<div className="showcase-tile col-span-2 lg:col-span-7 flex gap-3 lg:gap-4 aspect-[2/1] lg:aspect-auto lg:h-64">
						{/* bath1 — top view */}
						<div className="relative flex-1 rounded-2xl overflow-hidden border border-[#1a1a1a] group">
							<Image
								src="/bath1.JPG"
								alt="Banger Bath — top angle"
								fill
								sizes="(min-width: 1024px) 33vw, 50vw"
								className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
							/>
							<div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050505]/70 to-transparent" />
							<div className="absolute bottom-4 left-4">
								<span className="text-[10px] text-[#525252] uppercase tracking-[0.2em] font-medium">
									Top View
								</span>
							</div>
						</div>

						{/* bath2 — detail */}
						<div className="relative flex-1 rounded-2xl overflow-hidden border border-[#22c55e]/15 shadow-[0_0_40px_rgba(34,197,94,0.08)] group">
							<Image
								src="/bath2.JPG"
								alt="Banger Bath — detail shot"
								fill
								sizes="(min-width: 1024px) 25vw, 50vw"
								className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
							/>
							<div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050505]/70 to-transparent" />
							<div className="absolute bottom-4 left-4">
								<span className="text-[10px] text-[#22c55e] uppercase tracking-[0.2em] font-medium">
									Precision Detail
								</span>
							</div>
						</div>
					</div>

					{/* bath4 — full width wide shot */}
					<div
						className="showcase-tile col-span-2 lg:col-span-7 relative rounded-2xl overflow-hidden border border-[#1a1a1a] group aspect-[16/9]"
					>
						<Image
							src="/bath4.JPG"
							alt="Banger Bath — wide angle"
							fill
							sizes="(min-width: 1024px) 58vw, 100vw"
							className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
						/>
						<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505]/80 to-transparent" />
						<div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
							<div className="flex flex-col gap-0.5">
								<span className="text-[10px] text-[#525252] uppercase tracking-[0.2em] font-medium">
									Full Assembly
								</span>
								<span className="text-sm font-semibold text-[#fafafa]">
									Joint-Fit ISO Bath
								</span>
							</div>
							<span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0f0f0f]/80 border border-[#22c55e]/20 text-xs font-medium text-[#22c55e] backdrop-blur-sm">
								<span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
								In Stock
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Bottom border */}
			<div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1a1a1a] to-transparent" />
		</section>
	);
}
