import Navigation from "@/components/Navigation";

export default function Contact() {
	return (
		<div className="min-h-screen bg-[#0a0a0a]">
			<Navigation />

			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
				<div className="text-center mb-16">
					<h1 className="text-4xl sm:text-5xl font-bold mb-4 text-[#fafafa]">Contact Us</h1>
					<p className="text-[#a3a3a3] text-lg">Get in touch for custom orders or questions</p>
				</div>

				<div className="grid md:grid-cols-2 gap-8 mb-16">
					<div className="space-y-8">
						<div>
							<h2 className="text-2xl font-semibold text-[#fafafa] mb-4">About ThreeD4G</h2>
							<p className="text-[#a3a3a3] leading-relaxed">
								ThreeD4G specializes in creating high-quality 3D printed accessories specifically designed for grow tent
								environments. We understand the unique challenges and requirements of indoor growing setups, and our
								products are engineered to enhance functionality, organization, and efficiency.
							</p>
						</div>

						<div>
							<h3 className="text-xl font-semibold text-[#fafafa] mb-4">What We Offer</h3>
							<ul className="space-y-3 text-[#a3a3a3]">
								<li className="flex items-start">
									<span className="text-[#22c55e] mr-3 mt-0.5">✓</span>
									<span>Custom mounting solutions</span>
								</li>
								<li className="flex items-start">
									<span className="text-[#22c55e] mr-3 mt-0.5">✓</span>
									<span>Organization accessories</span>
								</li>
								<li className="flex items-start">
									<span className="text-[#22c55e] mr-3 mt-0.5">✓</span>
									<span>Equipment holders and brackets</span>
								</li>
								<li className="flex items-start">
									<span className="text-[#22c55e] mr-3 mt-0.5">✓</span>
									<span>Custom design services</span>
								</li>
							</ul>
						</div>
					</div>

					<div className="border border-[#262626] rounded-lg p-8 bg-[#111111]">
						<h2 className="text-2xl font-semibold text-[#fafafa] mb-6">Get in Touch</h2>
						<div className="space-y-4 text-[#a3a3a3]">
							<p>
								For inquiries about our products, custom orders, or general questions, please reach out to us through your
								preferred communication method.
							</p>
							<p className="text-sm text-[#737373]">
								We typically respond within 24-48 hours. For urgent matters, please indicate so in your message.
							</p>
						</div>

						<div className="mt-8 pt-8 border-t border-[#262626]">
							<h3 className="text-lg font-semibold text-[#fafafa] mb-4">Custom Orders</h3>
							<p className="text-[#a3a3a3] text-sm leading-relaxed">
								Need something specific for your setup? We love working on custom projects. Describe your requirements and
								we&apos;ll work together to create the perfect solution.
							</p>
						</div>
					</div>
				</div>

				<div className="border-t border-[#262626] pt-12 text-center">
					<p className="text-[#a3a3a3]">
						Thank you for visiting ThreeD4G. We&apos;re passionate about helping growers optimize their setups with quality 3D
						printed accessories.
					</p>
				</div>
			</div>

			{/* Footer */}
			<footer className="border-t border-[#262626] mt-20">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="text-center text-[#a3a3a3] text-sm">
						<p>&copy; {new Date().getFullYear()} ThreeD4G. All rights reserved.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
