"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import posthog from "posthog-js";

const features = [
	{
		icon: (
			<svg
				className="w-5 h-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M5 13l4 4L19 7"
				/>
			</svg>
		),
		text: "Tent ventilation hardware",
	},
	{
		icon: (
			<svg
				className="w-5 h-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M5 13l4 4L19 7"
				/>
			</svg>
		),
		text: "Organisation accessories",
	},
	{
		icon: (
			<svg
				className="w-5 h-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M5 13l4 4L19 7"
				/>
			</svg>
		),
		text: "Equipment holders and brackets",
	},
	{
		icon: (
			<svg
				className="w-5 h-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M5 13l4 4L19 7"
				/>
			</svg>
		),
		text: "Custom design services",
	},
];

export function ContactContent() {
	const sectionRef = useRef<HTMLElement>(null);
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		subject: "",
		message: "",
	});
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState("");

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

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setStatus("loading");
		setErrorMessage("");

		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to send message");
			}

			// Track successful contact form submission
			posthog.capture("contact_form_submitted", {
				subject: formData.subject,
			});

			setStatus("success");
			setFormData({ name: "", email: "", subject: "", message: "" });
		} catch (error) {
			setStatus("error");
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to send message",
			);
		}
	};

	return (
		<section ref={sectionRef} className="pt-32 pb-20 relative">
			{/* Background elements */}
			<div className="absolute top-1/4 left-0 w-100 h-100 rounded-full bg-[#22c55e]/5 blur-[150px] pointer-events-none" />
			<div className="absolute bottom-1/4 right-0 w-75 h-75 rounded-full bg-[#22c55e]/5 blur-[120px] pointer-events-none" />

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
								ThreeD4G specialises in creating high-quality 3D printed
								accessories specifically designed for grow tent environments. We
								understand the unique challenges and requirements of indoor
								growing setups, and our products are engineered to enhance
								functionality, organisation, and efficiency.
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

						{/* Response Time Note */}
						<div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#171717]">
							<p className="text-sm text-[#737373]">
								We typically respond within 24-48 hours. For urgent matters,
								please indicate so in your message.
							</p>
						</div>
					</div>

					{/* Right Column - Contact Form */}
					<div className="contact-right">
						<Card variant="elevated" className="p-6 sm:p-8 lg:p-10">
							<h2 className="text-2xl font-semibold text-[#fafafa] mb-6 font-display">
								Send us a Message
							</h2>

							{status === "success" ? (
								<div className="text-center py-8">
									<div className="w-16 h-16 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-[#22c55e] mx-auto mb-4">
										<svg
											className="w-8 h-8"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 13l4 4L19 7"
											/>
										</svg>
									</div>
									<h3 className="text-xl font-semibold text-[#fafafa] mb-2">
										Message Sent!
									</h3>
									<p className="text-[#a3a3a3] mb-6">
										Thank you for reaching out. We&apos;ll get back to you soon.
									</p>
									<Button variant="outline" onClick={() => setStatus("idle")}>
										Send Another Message
									</Button>
								</div>
							) : (
								<form onSubmit={handleSubmit} className="space-y-5">
									{/* Name */}
									<div>
										<label
											htmlFor="name"
											className="block text-sm font-medium text-[#a3a3a3] mb-2"
										>
											Name
										</label>
										<input
											type="text"
											id="name"
											name="name"
											value={formData.name}
											onChange={handleChange}
											required
											className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#171717] text-[#fafafa] placeholder-[#525252] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
											placeholder="Your name"
										/>
									</div>

									{/* Email */}
									<div>
										<label
											htmlFor="email"
											className="block text-sm font-medium text-[#a3a3a3] mb-2"
										>
											Email
										</label>
										<input
											type="email"
											id="email"
											name="email"
											value={formData.email}
											onChange={handleChange}
											required
											className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#171717] text-[#fafafa] placeholder-[#525252] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
											placeholder="your@email.com"
										/>
									</div>

									{/* Subject */}
									<div>
										<label
											htmlFor="subject"
											className="block text-sm font-medium text-[#a3a3a3] mb-2"
										>
											Subject
										</label>
										<input
											type="text"
											id="subject"
											name="subject"
											value={formData.subject}
											onChange={handleChange}
											required
											className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#171717] text-[#fafafa] placeholder-[#525252] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
											placeholder="What's this about?"
										/>
									</div>

									{/* Message */}
									<div>
										<label
											htmlFor="message"
											className="block text-sm font-medium text-[#a3a3a3] mb-2"
										>
											Message
										</label>
										<textarea
											id="message"
											name="message"
											value={formData.message}
											onChange={handleChange}
											required
											rows={5}
											className="w-full px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#171717] text-[#fafafa] placeholder-[#525252] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors resize-none"
											placeholder="Tell us about your project or question..."
										/>
									</div>

									{/* Error Message */}
									{status === "error" && (
										<div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
											{errorMessage}
										</div>
									)}

									{/* Submit Button */}
									<Button
										type="submit"
										className="w-full"
										disabled={status === "loading"}
									>
										{status === "loading" ? (
											<>
												<svg
													className="animate-spin w-4 h-4"
													viewBox="0 0 24 24"
													fill="none"
												>
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="4"
													/>
													<path
														className="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													/>
												</svg>
												Sending...
											</>
										) : (
											<>
												Send Message
												<svg
													className="w-4 h-4"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M14 5l7 7m0 0l-7 7m7-7H3"
													/>
												</svg>
											</>
										)}
									</Button>
								</form>
							)}
						</Card>
					</div>
				</div>

				{/* Bottom Note */}
				<div className="mt-20 text-center">
					<p className="text-[#737373] max-w-2xl mx-auto">
						Thank you for visiting ThreeD4G. We&apos;re passionate about helping
						growers optimise their setups with quality 3D printed accessories.
					</p>
				</div>
			</div>
		</section>
	);
}
