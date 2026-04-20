"use client";

import { useRef, useEffect, useState } from "react";
import { usePostHog } from "@posthog/next";
import { gsap } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
	const posthog = usePostHog();
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
			posthog?.capture("contact_form_submitted", {
				subject: formData.subject,
			});

			setStatus("success");
			setFormData({ name: "", email: "", subject: "", message: "" });
		} catch (error) {
			setStatus("error");
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Failed to send message",
			);
		}
	};

	return (
		<section ref={sectionRef} className="pt-24 sm:pt-32 pb-16 sm:pb-20 relative">
			{/* Background elements */}
			<div className="absolute top-1/4 left-0 w-100 h-100 rounded-full bg-[#22c55e]/5 blur-[150px] pointer-events-none" />
			<div className="absolute bottom-1/4 right-0 w-75 h-75 rounded-full bg-[#22c55e]/5 blur-[120px] pointer-events-none" />

			<div className="max-w-5xl mx-auto px-4 sm:px-6">
				{/* Header */}
				<div className="contact-header text-center mb-12 md:mb-20">
					<span className="inline-block text-[#22c55e] text-sm font-medium tracking-wider uppercase mb-4">
						Get in Touch
					</span>
					<h1 className="text-headline text-[#fafafa] mb-6">
						Let&apos;s{" "}
						<span className="text-[#22c55e]">Connect</span>
					</h1>
					<p className="text-lg text-[#a3a3a3] max-w-2xl mx-auto">
						Have questions about our products or need a custom
						solution? We&apos;d love to hear from you.
					</p>

					{/* Contact options */}
					<div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
						<a
							href="https://www.instagram.com/threed4g/"
							target="_blank"
							rel="noopener noreferrer"
							onClick={() =>
								posthog?.capture(
									"contact_instagram_link_clicked",
									{
										url: "https://www.instagram.com/threed4g/",
									},
								)
							}
							className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/5 text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
						>
							<svg
								className="w-5 h-5"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									fillRule="evenodd"
									d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
									clipRule="evenodd"
								/>
							</svg>
							DM us on Instagram
						</a>
						<span className="text-[#525252]">or</span>
						<span className="text-[#a3a3a3]">
							use the form below
						</span>
					</div>
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
								ThreeD4G specialises in creating high-quality 3D
								printed accessories specifically designed for
								grow tent environments. We understand the unique
								challenges and requirements of indoor growing
								setups, and our products are engineered to
								enhance functionality, organisation, and
								efficiency.
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
								We typically respond within 24-48 hours. For
								urgent matters, please indicate so in your
								message.
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
										Thank you for reaching out. We&apos;ll
										get back to you soon.
									</p>
									<Button
										variant="outline"
										onClick={() => setStatus("idle")}
									>
										Send Another Message
									</Button>
								</div>
							) : (
								<form
									onSubmit={handleSubmit}
									className="space-y-5"
								>
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
						Thank you for visiting ThreeD4G. We&apos;re passionate
						about helping growers optimise their setups with quality
						3D printed accessories.
					</p>
				</div>
			</div>
		</section>
	);
}
