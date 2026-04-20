"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { Button } from "@/components/ui/Button";
import { MagneticButton } from "@/components/animations/MagneticButton";

export function CTASection() {
	const sectionRef = useRef<HTMLElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const ctx = gsap.context(() => {
			gsap.from(contentRef.current, {
				opacity: 0,
				y: 60,
				duration: 1,
				ease: "power3.out",
				scrollTrigger: {
					trigger: sectionRef.current,
					start: "top 75%",
					once: true,
				},
			});
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	return (
		<section ref={sectionRef} className="relative py-20 md:py-32 overflow-hidden">
			{/* Background */}
			<div className="absolute inset-0 bg-linear-to-b from-transparent via-[#22c55e]/5 to-transparent" />
			<div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#22c55e]/30 to-transparent" />
			<div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#22c55e]/30 to-transparent" />

			{/* Floating orbs */}
			<div className="absolute top-1/4 left-1/4 w-75 h-75 rounded-full bg-[#22c55e]/10 blur-[100px] pointer-events-none animate-float-slow" />
			<div className="absolute bottom-1/4 right-1/4 w-62.5 h-62.5 rounded-full bg-[#22c55e]/10 blur-[80px] pointer-events-none animate-float-delayed" />

			<div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
				<div ref={contentRef}>
					{/* Badge */}
					<div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/8 mb-8">
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-60" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
						</span>
						<span className="text-xs font-bold text-[#22c55e] tracking-[0.2em] uppercase">
							4/20 Drop · Now Live
						</span>
					</div>

					{/* Heading */}
					<h2 className="text-headline text-[#fafafa] mb-6">
						Grab Yours Before{" "}
						<span className="text-[#22c55e]">It&apos;s Gone.</span>
					</h2>

					{/* Description */}
					<p className="text-lg text-[#a3a3a3] mb-10 max-w-2xl mx-auto leading-relaxed">
						Limited first-run stock. Once it&apos;s out, it&apos;s
						out. Keep your banger clean, your hits pure, and your
						setup looking fresh — or hit us up if you need something
						made to order.
					</p>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
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
							<Button asChild variant="ghost" size="lg">
								<Link href="/contact">Get In Touch</Link>
							</Button>
						</MagneticButton>
					</div>
				</div>
			</div>
		</section>
	);
}
