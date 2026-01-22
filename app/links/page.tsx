"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import type { Link } from "@/lib/types/link";

export default function LinksPage() {
	const [links, setLinks] = useState<Link[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedLink, setSelectedLink] = useState<Link | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		fetchLinks();
	}, []);

	const fetchLinks = async () => {
		try {
			const res = await fetch("/api/links?active=true");
			if (res.ok) {
				const data = await res.json();
				setLinks(data);
			}
		} catch (error) {
			console.error("Error fetching links:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleLinkClick = (link: Link) => {
		if (link.promo_code) {
			setSelectedLink(link);
			setCopied(false);
		} else {
			window.open(link.url, "_blank", "noopener,noreferrer");
		}
	};

	const handleCopyCode = async () => {
		if (selectedLink?.promo_code) {
			try {
				await navigator.clipboard.writeText(selectedLink.promo_code);
				setCopied(true);
			} catch (error) {
				console.error("Failed to copy:", error);
			}
		}
	};

	const handleVisitSite = () => {
		if (selectedLink) {
			window.open(selectedLink.url, "_blank", "noopener,noreferrer");
			setSelectedLink(null);
		}
	};

	const closeModal = () => {
		setSelectedLink(null);
		setCopied(false);
	};

	return (
		<div className="min-h-screen bg-[#050505]">
			<Navigation />

			{/* Background elements */}
			<div className="absolute top-0 right-0 w-125 h-125 rounded-full bg-[#22c55e]/5 blur-[150px] pointer-events-none" />

			<main className="relative pt-32 pb-20 min-h-[calc(100vh-200px)]">
				<div className="max-w-2xl mx-auto px-6">
					{/* Header */}
					<div className="text-center mb-16">
						<span className="inline-block text-[#22c55e] text-sm font-medium tracking-wider uppercase mb-4">
							Partner Sites
						</span>
						<h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-[#fafafa] mb-6">
							Our <span className="text-[#22c55e]">Links</span>
						</h1>
						<p className="text-lg text-[#a3a3a3] max-w-xl mx-auto">
							Check out our partner sites and exclusive offers with special promo codes.
						</p>
					</div>

				{loading ? (
					<div className="text-center py-12">
						<div className="text-[#22c55e]">Loading...</div>
					</div>
				) : links.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-[#737373]">No links available at the moment.</p>
					</div>
				) : (
					<div className="space-y-4">
						{links.map((link) => (
							<button
								key={link.id}
								onClick={() => handleLinkClick(link)}
								className="w-full p-5 bg-[#111111] border border-[#262626] rounded-xl hover:border-[#22c55e] hover:bg-[#0a0a0a] transition-all duration-300 text-left group"
							>
								<div className="flex items-center justify-between">
									<div className="flex-1 min-w-0">
										<h3 className="text-lg font-semibold text-[#fafafa] group-hover:text-[#22c55e] transition-colors">
											{link.title}
										</h3>
										{link.description && (
											<p className="text-[#a3a3a3] text-sm mt-1 line-clamp-2">
												{link.description}
											</p>
										)}
									</div>
									<div className="flex items-center gap-3 ml-4">
										{link.promo_code && (
											<span className="px-3 py-1 text-xs font-medium bg-[#22c55e]/20 text-[#22c55e] rounded-full border border-[#22c55e]/50">
												Promo Code
											</span>
										)}
										<svg
											className="w-5 h-5 text-[#737373] group-hover:text-[#22c55e] transition-colors"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
											/>
										</svg>
									</div>
								</div>
							</button>
						))}
					</div>
				)}
				</div>
			</main>

			{/* Promo Code Modal */}
			{selectedLink && (
				<div
					className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
					onClick={closeModal}
				>
					<div
						className="bg-[#111111] border border-[#262626] rounded-2xl max-w-md w-full p-6 shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="text-center">
							<div className="w-16 h-16 bg-[#22c55e]/20 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg
									className="w-8 h-8 text-[#22c55e]"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
									/>
								</svg>
							</div>

							<h2 className="text-2xl font-bold text-[#fafafa] mb-2">
								Exclusive Promo Code!
							</h2>
							<p className="text-[#a3a3a3] mb-6">
								Copy this code to use at {selectedLink.title}
							</p>

							<div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4 mb-6">
								<p className="text-2xl font-mono font-bold text-[#22c55e] tracking-wider">
									{selectedLink.promo_code}
								</p>
							</div>

							<div className="flex flex-col gap-3">
								<button
									onClick={handleCopyCode}
									className={`w-full py-3 rounded-lg font-medium transition-all duration-300 ${
										copied
											? "bg-[#22c55e] text-[#0a0a0a]"
											: "bg-[#1a1a1a] border border-[#262626] text-[#fafafa] hover:border-[#22c55e]"
									}`}
								>
									{copied ? (
										<span className="flex items-center justify-center gap-2">
											<svg
												className="w-5 h-5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 13l4 4L19 7"
												/>
											</svg>
											Copied!
										</span>
									) : (
										<span className="flex items-center justify-center gap-2">
											<svg
												className="w-5 h-5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
												/>
											</svg>
											Copy Code
										</span>
									)}
								</button>

								<button
									onClick={handleVisitSite}
									className="w-full py-3 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-lg hover:bg-[#16a34a] transition-colors flex items-center justify-center gap-2"
								>
									Visit Site
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
										/>
									</svg>
								</button>

								<button
									onClick={closeModal}
									className="w-full py-2 text-[#737373] hover:text-[#fafafa] transition-colors text-sm"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			<Footer />
		</div>
	);
}
