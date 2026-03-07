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
		<section ref={sectionRef} className="relative py-32 overflow-hidden">
			{/* Background */}
			<div className="absolute inset-0 bg-linear-to-b from-transparent via-[#22c55e]/5 to-transparent" />
			<div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#22c55e]/30 to-transparent" />
			<div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#22c55e]/30 to-transparent" />

			{/* Floating orbs */}
			<div className="absolute top-1/4 left-1/4 w-75 h-75 rounded-full bg-[#22c55e]/10 blur-[100px] pointer-events-none animate-float-slow" />
			<div className="absolute bottom-1/4 right-1/4 w-62.5 h-62.5 rounded-full bg-[#22c55e]/10 blur-[80px] pointer-events-none animate-float-delayed" />

			<div className="relative max-w-4xl mx-auto px-6 text-center">
				<div ref={contentRef}>
					{/* Badge */}
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/5 mb-8">
						<span className="text-sm text-[#22c55e] font-medium">
							Custom Orders Available
						</span>
					</div>

					{/* Heading */}
					<h2 className="text-headline text-[#fafafa] mb-6">
						Need Something{" "}
						<span className="text-[#22c55e]">Custom?</span>
					</h2>

					{/* Description */}
					<p className="text-lg text-[#a3a3a3] mb-10 max-w-2xl mx-auto leading-relaxed">
						We love a challenge. Tell us about your setup and
						we&apos;ll design a solution that fits perfectly. From
						mounting brackets to organisation systems, if you can
						imagine it, we can print it.
					</p>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<MagneticButton strength={0.15}>
							<Button asChild size="lg">
								<Link href="/contact">
									Start a Conversation
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
											d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
										/>
									</svg>
								</Link>
							</Button>
						</MagneticButton>

						<MagneticButton strength={0.15}>
							<Button asChild variant="ghost" size="lg">
								<Link href="/products">Browse Products</Link>
							</Button>
						</MagneticButton>
					</div>
				</div>
			</div>
		</section>
	);
}
