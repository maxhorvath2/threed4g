import Link from "next/link";

export default function Navigation() {
	return (
		<nav className="border-b border-[#262626] bg-[#0a0a0a]/95 backdrop-blur-sm sticky top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<Link href="/" className="text-xl font-semibold text-[#fafafa] hover:text-[#22c55e] transition-colors">
						ThreeD4G
					</Link>
					<div className="flex gap-8 items-center">
						<Link href="/" className="text-sm text-[#a3a3a3] hover:text-[#fafafa] transition-colors">
							Home
						</Link>
						<Link href="/gallery" className="text-sm text-[#a3a3a3] hover:text-[#fafafa] transition-colors">
							Gallery
						</Link>
						<Link href="/contact" className="text-sm text-[#a3a3a3] hover:text-[#fafafa] transition-colors">
							Contact
						</Link>
					</div>
				</div>
			</div>
		</nav>
	);
}
