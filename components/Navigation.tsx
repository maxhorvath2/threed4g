"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartButton } from "@/components/cart/CartButton";
import { MagneticButton } from "@/components/animations/MagneticButton";

export default function Navigation() {
	const [scrolled, setScrolled] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const pathname = usePathname();

	useEffect(() => {
		if (typeof window !== "undefined") {
			const handleScroll = () => {
				setScrolled(window.scrollY > 20);
			};

			window.addEventListener("scroll", handleScroll, { passive: true });
			return () => window.removeEventListener("scroll", handleScroll);
		}
	}, []);

	const navLinks = [
		{ href: "/", label: "Home" },
		{ href: "/gallery", label: "Gallery" },
		{ href: "/contact", label: "Contact" },
		{ href: "/links", label: "Links" },
	];

	return (
		<nav
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
				scrolled || mobileMenuOpen
					? "bg-[#050505]/90 backdrop-blur-xl border-b border-[#171717]"
					: "bg-transparent border-b border-transparent"
			}`}
		>
			<div className="max-w-7xl mx-auto px-6 lg:px-8">
				<div className="relative flex justify-between items-center h-20">
					{/* Logo */}
					<MagneticButton strength={0.15}>
						<Link href="/" className="group flex items-center gap-2">
							<span className="text-2xl font-display font-bold text-[#fafafa] transition-all duration-300 group-hover:text-[#22c55e]">
								ThreeD4G
							</span>
							<span className="w-2 h-2 rounded-full bg-[#22c55e] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
						</Link>
					</MagneticButton>

					{/* Navigation Links - Centered */}
					<div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
						{navLinks.map((link) => {
							const isActive = pathname === link.href;

							return (
								<Link
									key={link.href}
									href={link.href}
									className={`relative px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-lg ${
										isActive
											? "text-[#22c55e]"
											: "text-[#a3a3a3] hover:text-[#fafafa]"
									}`}
								>
									{link.label}
									{isActive && (
										<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#22c55e]" />
									)}
								</Link>
							);
						})}
					</div>

					{/* Right side - Cart */}
					<div className="flex items-center gap-4">
						<CartButton />

						{/* Mobile Menu Button */}
						<button
							className="md:hidden p-2 hover:bg-white/5 rounded-xl transition-colors"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
						>
							<svg
								className="w-6 h-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								{mobileMenuOpen ? (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M6 18L18 6M6 6l12 12"
									/>
								) : (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M4 6h16M4 12h16M4 18h16"
									/>
								)}
							</svg>
						</button>
					</div>
				</div>

				{/* Mobile Menu */}
				<div
					className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
						mobileMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
					}`}
				>
					<div className="py-4 space-y-1 border-t border-[#171717]">
						{navLinks.map((link) => {
							const isActive = pathname === link.href;
							return (
								<Link
									key={link.href}
									href={link.href}
									onClick={() => setMobileMenuOpen(false)}
									className={`block px-4 py-3 text-base font-medium transition-colors duration-300 rounded-lg ${
										isActive
											? "text-[#22c55e] bg-[#22c55e]/10"
											: "text-[#a3a3a3] hover:text-[#fafafa] hover:bg-white/5"
									}`}
								>
									{link.label}
								</Link>
							);
						})}
					</div>
				</div>
			</div>

			{/* Gradient line at bottom when scrolled */}
			<div
				className={`absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#22c55e]/50 to-transparent transition-opacity duration-500 ${
					scrolled ? "opacity-100" : "opacity-0"
				}`}
			/>
		</nav>
	);
}
