"use client";

import { useRef, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";

const features = [
	{
		icon: (
			<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
			</svg>
		),
		text: "Custom mounting solutions",
	},
	{
		icon: (
			<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
			</svg>
		),
		text: "Organization accessories",
	},
	{
		icon: (
			<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
			</svg>
		),
		text: "Equipment holders and brackets",
	},
	{
		icon: (
			<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
			</svg>
		),
		text: "Custom design services",
	},
];

export function ContactContent() {
	const sectionRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const ctx = gsap.context(() => {
			// Animate header
			gsap.from(".contact-header", {
				opacity: 0,
				y: 40,
				duration: 0.8,
				ease: "power3.out",
			});

			// Animate left column
			gsap.from(".contact-left > *", {
				opacity: 0,
				x: -30,
				duration: 0.8,
				stagger: 0.15,
				ease: "power3.out",
				delay: 0.3,
			});

			// Animate right column
			gsap.from(".contact-right", {
				opacity: 0,
				x: 30,
				duration: 0.8,
				ease: "power3.out",
				delay: 0.4,
			});

			// Animate feature items
			gsap.from(".feature-item", {
				opacity: 0,
				x: -20,
				duration: 0.5,
				stagger: 0.1,
				ease: "power3.out",
				delay: 0.6,
			});
		}, sectionRef);

		return () => ctx.revert();
	}, []);

	return (
		<section ref={sectionRef} className="pt-32 pb-20 relative">
			{/* Background elements */}
			<div className="absolute top-1/4 left-0 w-[400px] h-[400px] rounded-full bg-[#22c55e]/5 blur-[150px] pointer-events-none" />
			<div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] rounded-full bg-[#22c55e]/5 blur-[120px] pointer-events-none" />

			<div className="max-w-5xl mx-auto px-6">
				{/* Header */}
				<div className="contact-header text-center mb-20">
					<span className="inline-block text-[#22c55e] text-sm font-medium tracking-wider uppercase mb-4">
						Get in Touch
					</span>
					<h1 className="text-headline text-[#fafafa] mb-6">
						Let&apos;s <span className="text-[#22c55e]">Connect</span>
					</h1>
					<p className="text-lg text-[#a3a3a3] max-w-2xl mx-auto">
						Have questions about our products or need a custom solution?
						We&apos;d love to hear from you.
					</p>
				</div>

				{/* Content Grid */}
				<div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
					{/* Left Column - Info */}
					<div className="contact-left space-y-10">
						{/* About */}
						<div>
							<h2 className="text-2xl font-semibold text-[#fafafa] mb-4 font-display">
								About ThreeD4G
							</h2>
							<p className="text-[#a3a3a3] leading-relaxed">
								ThreeD4G specializes in creating high-quality 3D printed
								accessories specifically designed for grow tent environments.
								We understand the unique challenges and requirements of indoor
								growing setups, and our products are engineered to enhance
								functionality, organization, and efficiency.
							</p>
						</div>

						{/* Features */}
						<div>
							<h3 className="text-xl font-semibold text-[#fafafa] mb-6 font-display">
								What We Offer
							</h3>
							<ul className="space-y-4">
								{features.map((feature, index) => (
									<li
										key={index}
										className="feature-item flex items-center gap-4 text-[#a3a3a3]"
									>
										<div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-[#22c55e]">
											{feature.icon}
										</div>
										<span>{feature.text}</span>
									</li>
								))}
							</ul>
						</div>
					</div>

					{/* Right Column - Contact Card */}
					<div className="contact-right">
						<Card variant="elevated" className="p-8 lg:p-10">
							<h2 className="text-2xl font-semibold text-[#fafafa] mb-6 font-display">
								Get in Touch
							</h2>

							<div className="space-y-6 text-[#a3a3a3]">
								<p className="leading-relaxed">
									For inquiries about our products, custom orders, or general
									questions, please reach out to us through your preferred
									communication method.
								</p>

								<div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#171717]">
									<p className="text-sm text-[#737373]">
										We typically respond within 24-48 hours. For urgent
										matters, please indicate so in your message.
									</p>
								</div>
							</div>

							{/* Custom Orders Section */}
							<div className="mt-8 pt-8 border-t border-[#171717]">
								<div className="flex items-start gap-4">
									<div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-[#22c55e] flex-shrink-0">
										<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={1.5}
												d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
											/>
										</svg>
									</div>
									<div>
										<h3 className="text-lg font-semibold text-[#fafafa] mb-2">
											Custom Orders
										</h3>
										<p className="text-[#a3a3a3] text-sm leading-relaxed">
											Need something specific for your setup? We love working
											on custom projects. Describe your requirements and
											we&apos;ll work together to create the perfect
											solution.
										</p>
									</div>
								</div>
							</div>
						</Card>
					</div>
				</div>

				{/* Bottom Note */}
				<div className="mt-20 text-center">
					<p className="text-[#737373] max-w-2xl mx-auto">
						Thank you for visiting ThreeD4G. We&apos;re passionate about
						helping growers optimize their setups with quality 3D printed
						accessories.
					</p>
				</div>
			</div>
		</section>
	);
}
