"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type {
	ProductWithDetails,
	ProductImage,
	ProductVariant,
	CreateProductImageInput,
	CreateProductVariantInput,
} from "@/lib/types/product";
import type { Link } from "@/lib/types/link";
import type { OrderWithItems } from "@/lib/types/order";

interface Admin {
	id: number;
	username: string;
	created_at: string;
}

// Form state for images
interface ImageFormItem {
	id?: number;
	image_url: string;
	alt_text: string;
	is_primary: boolean;
}

// Form state for variants
interface VariantFormItem {
	id?: number;
	name: string;
	price: string;
	sku: string;
	stock_quantity: string;
}

export default function AdminDashboard() {
	const router = useRouter();
	const [products, setProducts] = useState<ProductWithDetails[]>([]);
	const [admins, setAdmins] = useState<Admin[]>([]);
	const [links, setLinks] = useState<Link[]>([]);
	const [orders, setOrders] = useState<OrderWithItems[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<
		"products" | "admins" | "links" | "orders"
	>("products");
	const [showProductForm, setShowProductForm] = useState(false);
	const [showAdminForm, setShowAdminForm] = useState(false);
	const [editingProduct, setEditingProduct] =
		useState<ProductWithDetails | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	// Product form state
	const [productName, setProductName] = useState("");
	const [productDescription, setProductDescription] = useState("");
	const [productCategory, setProductCategory] = useState("");
	const [productFeatured, setProductFeatured] = useState(false);

	// Multiple images state
	const [productImages, setProductImages] = useState<ImageFormItem[]>([]);

	// Multiple variants state
	const [productVariants, setProductVariants] = useState<VariantFormItem[]>(
		[],
	);

	// Admin form state
	const [adminUsername, setAdminUsername] = useState("");
	const [adminPassword, setAdminPassword] = useState("");

	// Link form state
	const [showLinkForm, setShowLinkForm] = useState(false);
	const [editingLink, setEditingLink] = useState<Link | null>(null);
	const [linkTitle, setLinkTitle] = useState("");
	const [linkUrl, setLinkUrl] = useState("");
	const [linkPromoCode, setLinkPromoCode] = useState("");
	const [linkDescription, setLinkDescription] = useState("");
	const [linkSortOrder, setLinkSortOrder] = useState("");
	const [linkActive, setLinkActive] = useState(true);

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			const [productsRes, adminsRes, linksRes, ordersRes] =
				await Promise.all([
					fetch("/api/products"),
					fetch("/api/admin"),
					fetch("/api/links"),
					fetch("/api/orders"),
				]);

			if (productsRes.ok) {
				const productsData = await productsRes.json();
				setProducts(productsData);
			}

			if (adminsRes.ok) {
				const adminsData = await adminsRes.json();
				setAdmins(adminsData);
			}

			if (linksRes.ok) {
				const linksData = await linksRes.json();
				setLinks(linksData);
			}

			if (ordersRes.ok) {
				const ordersData = await ordersRes.json();
				setOrders(ordersData);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		router.push("/login");
		router.refresh();
	};

	const handleImageUpload = async (file: File, index: number) => {
		setUploading(true);
		setUploadError(null);
		try {
			const formData = new FormData();
			formData.append("file", file);

			const res = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || "Upload failed");
			}

			const data = await res.json();

			// Update the specific image in the array
			setProductImages((prev) =>
				prev.map((img, i) =>
					i === index ? { ...img, image_url: data.url } : img,
				),
			);

			return data.url;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to upload image";
			setUploadError(errorMessage);
			return null;
		} finally {
			setUploading(false);
		}
	};

	const addImage = () => {
		const isPrimary = productImages.length === 0;
		setProductImages([
			...productImages,
			{ image_url: "", alt_text: "", is_primary: isPrimary },
		]);
	};

	const removeImage = (index: number) => {
		const newImages = productImages.filter((_, i) => i !== index);
		// If we removed the primary image, make the first one primary
		if (productImages[index].is_primary && newImages.length > 0) {
			newImages[0].is_primary = true;
		}
		setProductImages(newImages);
	};

	const setPrimaryImage = (index: number) => {
		setProductImages((prev) =>
			prev.map((img, i) => ({ ...img, is_primary: i === index })),
		);
	};

	const addVariant = () => {
		setProductVariants([
			...productVariants,
			{ name: "", price: "", sku: "", stock_quantity: "0" },
		]);
	};

	const removeVariant = (index: number) => {
		setProductVariants(productVariants.filter((_, i) => i !== index));
	};

	const updateVariant = (
		index: number,
		field: keyof VariantFormItem,
		value: string,
	) => {
		setProductVariants((prev) =>
			prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
		);
	};

	const handleProductSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate images
		const validImages = productImages.filter(
			(img) => img.image_url.trim() !== "",
		);
		if (validImages.length === 0) {
			setUploadError("Please add at least one image");
			return;
		}

		// Validate variants
		const validVariants = productVariants.filter(
			(v) => v.name.trim() !== "" && v.price.trim() !== "",
		);
		if (validVariants.length === 0) {
			setUploadError(
				"Please add at least one variant with name and price",
			);
			return;
		}

		const hasInvalidStock = validVariants.some((v) => {
			const stock = Number.parseInt(v.stock_quantity, 10);
			return Number.isNaN(stock) || stock < 0;
		});

		if (hasInvalidStock) {
			setUploadError(
				"Stock quantity must be a whole number of 0 or more",
			);
			return;
		}

		if (uploading) {
			setUploadError("Please wait for the image upload to complete");
			return;
		}

		try {
			const url = editingProduct?.id
				? `/api/products/${editingProduct.id}`
				: "/api/products";
			const method = editingProduct?.id ? "PUT" : "POST";

			// Prepare images for API
			const images: CreateProductImageInput[] = validImages.map(
				(img, index) => ({
					image_url: img.image_url,
					alt_text: img.alt_text || undefined,
					is_primary: img.is_primary,
					sort_order: index,
				}),
			);

			// Prepare variants for API
			const variants: CreateProductVariantInput[] = validVariants.map(
				(v, index) => ({
					name: v.name,
					price: parseFloat(v.price),
					sku: v.sku || undefined,
					sort_order: index,
					stock_quantity: Number.parseInt(v.stock_quantity, 10),
				}),
			);

			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: productName,
					description: productDescription || null,
					category: productCategory || null,
					featured: productFeatured,
					images,
					variants,
				}),
			});

			if (!res.ok) throw new Error("Failed to save product");

			await fetchData();
			resetProductForm();
		} catch (error) {
			alert("Failed to save product");
			console.log(error);
		}
	};

	const handleAdminSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const res = await fetch("/api/admin", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: adminUsername,
					password: adminPassword,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to create admin");
			}

			await fetchData();
			resetAdminForm();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to create admin";
			alert(message);
		}
	};

	const handleDeleteProduct = async (id: number) => {
		if (!confirm("Are you sure you want to delete this product?")) return;

		try {
			const res = await fetch(`/api/products/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete product");
			await fetchData();
		} catch (error) {
			alert("Failed to delete product");
			console.log(error);
		}
	};

	const handleDeleteAdmin = async (id: number) => {
		if (!confirm("Are you sure you want to delete this admin?")) return;

		try {
			const res = await fetch(`/api/admin/${id}`, { method: "DELETE" });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to delete admin");
			}
			await fetchData();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to delete admin";
			alert(message);
		}
	};

	const handleEditProduct = (product: ProductWithDetails) => {
		setEditingProduct(product);
		setProductName(product.name);
		setProductDescription(product.description || "");
		setProductCategory(product.category || "");
		setProductFeatured(product.featured);

		// Load images
		const images: ImageFormItem[] = product.images.map(
			(img: ProductImage) => ({
				id: img.id,
				image_url: img.image_url,
				alt_text: img.alt_text || "",
				is_primary: img.is_primary,
			}),
		);
		setProductImages(images.length > 0 ? images : []);

		// Load variants
		const variants: VariantFormItem[] = product.variants.map(
			(v: ProductVariant) => ({
				id: v.id,
				name: v.name,
				price: v.price.toString(),
				sku: v.sku || "",
				stock_quantity: String(v.stock_quantity ?? 0),
			}),
		);
		setProductVariants(variants.length > 0 ? variants : []);

		setShowProductForm(true);
	};

	const resetProductForm = () => {
		setEditingProduct(null);
		setProductName("");
		setProductDescription("");
		setProductCategory("");
		setProductFeatured(false);
		setProductImages([]);
		setProductVariants([]);
		setUploadError(null);
		setShowProductForm(false);
	};

	const resetAdminForm = () => {
		setAdminUsername("");
		setAdminPassword("");
		setShowAdminForm(false);
	};

	const handleLinkSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const url = editingLink?.id
				? `/api/links/${editingLink.id}`
				: "/api/links";
			const method = editingLink?.id ? "PUT" : "POST";

			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: linkTitle,
					url: linkUrl,
					promo_code: linkPromoCode || null,
					description: linkDescription || null,
					sort_order:
						linkSortOrder.trim() !== ""
							? parseInt(linkSortOrder)
							: undefined,
					active: linkActive,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to save link");
			}

			await fetchData();
			resetLinkForm();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to save link";
			alert(message);
		}
	};

	const handleDeleteLink = async (id: number) => {
		if (!confirm("Are you sure you want to delete this link?")) return;

		try {
			const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Failed to delete link");
			await fetchData();
		} catch (error) {
			alert("Failed to delete link");
			console.log(error);
		}
	};

	const handleEditLink = (link: Link) => {
		setEditingLink(link);
		setLinkTitle(link.title);
		setLinkUrl(link.url);
		setLinkPromoCode(link.promo_code || "");
		setLinkDescription(link.description || "");
		setLinkSortOrder(link.sort_order.toString());
		setLinkActive(link.active);
		setShowLinkForm(true);
	};

	const resetLinkForm = () => {
		setEditingLink(null);
		setLinkTitle("");
		setLinkUrl("");
		setLinkPromoCode("");
		setLinkDescription("");
		setLinkSortOrder("");
		setLinkActive(true);
		setShowLinkForm(false);
	};

	// Helper to get price display for product card
	const getPriceDisplay = (product: ProductWithDetails) => {
		if (!product.variants || product.variants.length === 0) {
			return product.price !== null
				? `$${Number(product.price).toFixed(2)}`
				: null;
		}

		const prices = product.variants.map((v) => Number(v.price));
		const minPrice = Math.min(...prices);
		const maxPrice = Math.max(...prices);

		if (minPrice === maxPrice) {
			return `$${minPrice.toFixed(2)}`;
		}
		return `From $${minPrice.toFixed(2)}`;
	};

	const getTotalStock = (product: ProductWithDetails) => {
		if (!product.variants || product.variants.length === 0) {
			return 0;
		}
		return product.variants.reduce(
			(total, variant) => total + Number(variant.stock_quantity ?? 0),
			0,
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
				<div className="text-[#22c55e]">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#0a0a0a]">
			<nav className="border-b border-[#262626] bg-[#0a0a0a]/95 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<h1 className="text-2xl font-semibold text-[#fafafa]">
							Admin Dashboard
						</h1>
						<button
							onClick={handleLogout}
							className="px-4 py-2 border border-[#7f1d1d] text-[#fca5a5] rounded-lg hover:bg-[#7f1d1d]/20 transition-colors"
						>
							Logout
						</button>
					</div>
				</div>
			</nav>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Tabs */}
				<div className="flex gap-4 mb-8 border-b border-[#262626]">
					<button
						onClick={() => setActiveTab("products")}
						className={`px-6 py-3 font-medium transition-colors ${
							activeTab === "products"
								? "text-[#22c55e] border-b-2 border-[#22c55e]"
								: "text-[#a3a3a3] hover:text-[#fafafa]"
						}`}
					>
						Products
					</button>
					<button
						onClick={() => setActiveTab("admins")}
						className={`px-6 py-3 font-medium transition-colors ${
							activeTab === "admins"
								? "text-[#22c55e] border-b-2 border-[#22c55e]"
								: "text-[#a3a3a3] hover:text-[#fafafa]"
						}`}
					>
						Admins
					</button>
					<button
						onClick={() => setActiveTab("links")}
						className={`px-6 py-3 font-medium transition-colors ${
							activeTab === "links"
								? "text-[#22c55e] border-b-2 border-[#22c55e]"
								: "text-[#a3a3a3] hover:text-[#fafafa]"
						}`}
					>
						Links
					</button>
					<button
						onClick={() => setActiveTab("orders")}
						className={`px-6 py-3 font-medium transition-colors ${
							activeTab === "orders"
								? "text-[#22c55e] border-b-2 border-[#22c55e]"
								: "text-[#a3a3a3] hover:text-[#fafafa]"
						}`}
					>
						Orders
					</button>
				</div>

				{/* Products Tab */}
				{activeTab === "products" && (
					<div>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-2xl font-semibold text-[#fafafa]">
								Products
							</h2>
							<button
								onClick={() => {
									resetProductForm();
									setShowProductForm(true);
								}}
								className="px-4 py-2 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-lg hover:bg-[#16a34a] transition-colors"
							>
								Add Product
							</button>
						</div>

						{/* Product Form */}
						{showProductForm && (
							<div className="mb-8 border border-[#262626] rounded-lg p-6 bg-[#111111]">
								<h3 className="text-xl font-semibold text-[#fafafa] mb-4">
									{editingProduct
										? "Edit Product"
										: "Add New Product"}
								</h3>
								<form
									onSubmit={handleProductSubmit}
									className="space-y-6"
								>
									{/* Basic Info */}
									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">
											Name *
										</label>
										<input
											type="text"
											value={productName}
											onChange={(e) =>
												setProductName(e.target.value)
											}
											required
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">
											Description
										</label>
										<textarea
											value={productDescription}
											onChange={(e) =>
												setProductDescription(
													e.target.value,
												)
											}
											rows={3}
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-[#fafafa] mb-2">
												Category
											</label>
											<input
												type="text"
												value={productCategory}
												onChange={(e) =>
													setProductCategory(
														e.target.value,
													)
												}
												className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
											/>
										</div>
										<div className="flex items-center pt-8">
											<input
												type="checkbox"
												id="featured"
												checked={productFeatured}
												onChange={(e) =>
													setProductFeatured(
														e.target.checked,
													)
												}
												className="w-4 h-4 text-[#22c55e] bg-[#1a1a1a] border-[#262626] rounded focus:ring-[#22c55e]"
											/>
											<label
												htmlFor="featured"
												className="ml-2 text-sm text-[#fafafa]"
											>
												Featured
											</label>
										</div>
									</div>

									{/* Images Section */}
									<div className="border border-[#262626] rounded-lg p-4 bg-[#0a0a0a]">
										<div className="flex justify-between items-center mb-4">
											<label className="text-sm font-medium text-[#fafafa]">
												Images *
											</label>
											<button
												type="button"
												onClick={addImage}
												className="px-3 py-1.5 text-sm bg-[#22c55e] text-[#0a0a0a] font-medium rounded hover:bg-[#16a34a] transition-colors"
											>
												+ Add Image
											</button>
										</div>

										{productImages.length === 0 && (
											<p className="text-[#737373] text-sm">
												No images added yet. Click
												&quot;Add Image&quot; to add
												product images.
											</p>
										)}

										<div className="space-y-4">
											{productImages.map((img, index) => (
												<div
													key={index}
													className="flex gap-4 items-start p-3 border border-[#262626] rounded-lg bg-[#111111]"
												>
													<div className="flex-1 space-y-3">
														<div className="flex gap-2">
															<input
																type="file"
																accept="image/*"
																onChange={async (
																	e,
																) => {
																	const file =
																		e.target
																			.files?.[0];
																	if (file) {
																		await handleImageUpload(
																			file,
																			index,
																		);
																	}
																}}
																className="flex-1 px-3 py-2 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-[#fafafa] focus:outline-none focus:border-[#22c55e]"
															/>
														</div>
														{img.image_url && (
															<input
																type="text"
																placeholder="Image URL"
																value={
																	img.image_url
																}
																onChange={(
																	e,
																) => {
																	setProductImages(
																		(
																			prev,
																		) =>
																			prev.map(
																				(
																					i,
																					idx,
																				) =>
																					idx ===
																					index
																						? {
																								...i,
																								image_url:
																									e
																										.target
																										.value,
																							}
																						: i,
																			),
																	);
																}}
																className="w-full px-3 py-2 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-[#fafafa] focus:outline-none focus:border-[#22c55e]"
															/>
														)}
														<input
															type="text"
															placeholder="Alt text (optional)"
															value={img.alt_text}
															onChange={(e) => {
																setProductImages(
																	(prev) =>
																		prev.map(
																			(
																				i,
																				idx,
																			) =>
																				idx ===
																				index
																					? {
																							...i,
																							alt_text:
																								e
																									.target
																									.value,
																						}
																					: i,
																		),
																);
															}}
															className="w-full px-3 py-2 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-[#fafafa] focus:outline-none focus:border-[#22c55e]"
														/>
														<div className="flex items-center gap-4">
															<button
																type="button"
																onClick={() =>
																	setPrimaryImage(
																		index,
																	)
																}
																className={`px-3 py-1 text-xs rounded ${
																	img.is_primary
																		? "bg-[#22c55e] text-[#0a0a0a]"
																		: "border border-[#262626] text-[#a3a3a3] hover:text-[#fafafa]"
																}`}
															>
																{img.is_primary
																	? "Primary"
																	: "Set Primary"}
															</button>
															<button
																type="button"
																onClick={() =>
																	removeImage(
																		index,
																	)
																}
																className="px-3 py-1 text-xs border border-[#7f1d1d] text-[#fca5a5] rounded hover:bg-[#7f1d1d]/20"
															>
																Remove
															</button>
														</div>
													</div>
													{img.image_url && (
														<div className="relative w-24 h-24 rounded overflow-hidden border border-[#262626] shrink-0">
															<Image
																src={
																	img.image_url
																}
																alt={
																	img.alt_text ||
																	"Preview"
																}
																fill
																className="object-cover"
															/>
														</div>
													)}
												</div>
											))}
										</div>

										{uploading && (
											<p className="text-[#22c55e] text-sm mt-2">
												Uploading...
											</p>
										)}
										{uploadError && (
											<p className="text-[#fca5a5] text-sm mt-2">
												{uploadError}
											</p>
										)}
									</div>

									{/* Variants Section */}
									<div className="border border-[#262626] rounded-lg p-4 bg-[#0a0a0a]">
										<div className="flex justify-between items-center mb-4">
											<label className="text-sm font-medium text-[#fafafa]">
												Variants (Sizes/Options) *
											</label>
											<button
												type="button"
												onClick={addVariant}
												className="px-3 py-1.5 text-sm bg-[#22c55e] text-[#0a0a0a] font-medium rounded hover:bg-[#16a34a] transition-colors"
											>
												+ Add Variant
											</button>
										</div>

										{productVariants.length === 0 && (
											<p className="text-[#737373] text-sm">
												No variants added yet. Add
												variants for different sizes or
												options with their prices.
											</p>
										)}

										<div className="space-y-3">
											{productVariants.map(
												(variant, index) => (
													<div
														key={index}
														className="flex gap-3 items-center p-3 border border-[#262626] rounded-lg bg-[#111111]"
													>
														<div className="flex-1">
															<input
																type="text"
																placeholder="Variant name (e.g., Small, 6-inch)"
																value={
																	variant.name
																}
																onChange={(e) =>
																	updateVariant(
																		index,
																		"name",
																		e.target
																			.value,
																	)
																}
																className="w-full px-3 py-2 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-[#fafafa] focus:outline-none focus:border-[#22c55e]"
															/>
														</div>
														<div className="w-32">
															<input
																type="number"
																step="0.01"
																min="0"
																placeholder="Price"
																value={
																	variant.price
																}
																onChange={(e) =>
																	updateVariant(
																		index,
																		"price",
																		e.target
																			.value,
																	)
																}
																className="w-full px-3 py-2 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-[#fafafa] focus:outline-none focus:border-[#22c55e]"
															/>
														</div>
														<div className="w-32">
															<input
																type="number"
																step="1"
																min="0"
																placeholder="Stock"
																value={
																	variant.stock_quantity
																}
																onChange={(e) =>
																	updateVariant(
																		index,
																		"stock_quantity",
																		e.target
																			.value,
																	)
																}
																className="w-full px-3 py-2 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-[#fafafa] focus:outline-none focus:border-[#22c55e]"
															/>
														</div>
														<div className="w-32">
															<input
																type="text"
																placeholder="SKU (optional)"
																value={
																	variant.sku
																}
																onChange={(e) =>
																	updateVariant(
																		index,
																		"sku",
																		e.target
																			.value,
																	)
																}
																className="w-full px-3 py-2 text-sm bg-[#1a1a1a] border border-[#262626] rounded text-[#fafafa] focus:outline-none focus:border-[#22c55e]"
															/>
														</div>
														<button
															type="button"
															onClick={() =>
																removeVariant(
																	index,
																)
															}
															className="px-3 py-2 text-sm border border-[#7f1d1d] text-[#fca5a5] rounded hover:bg-[#7f1d1d]/20"
														>
															Remove
														</button>
													</div>
												),
											)}
										</div>
									</div>

									<div className="flex gap-4">
										<button
											type="submit"
											className="px-6 py-2 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-lg hover:bg-[#16a34a] transition-colors"
										>
											{editingProduct
												? "Update"
												: "Create"}
										</button>
										<button
											type="button"
											onClick={resetProductForm}
											className="px-6 py-2 border border-[#262626] text-[#fafafa] rounded-lg hover:bg-[#1a1a1a] transition-colors"
										>
											Cancel
										</button>
									</div>
								</form>
							</div>
						)}

						{/* Products List */}
						<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{products.map((product) => (
								<div
									key={product.id}
									className="border border-[#262626] rounded-lg overflow-hidden bg-[#111111]"
								>
									<div className="relative w-full h-48">
										<Image
											src={
												product.images?.[0]
													?.image_url ||
												product.image_url
											}
											alt={product.name}
											fill
											className="object-cover"
										/>
										{product.images &&
											product.images.length > 1 && (
												<div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
													+{product.images.length - 1}{" "}
													more
												</div>
											)}
									</div>
									<div className="p-4">
										<div className="flex justify-between items-start mb-2">
											<h3 className="text-lg font-semibold text-[#fafafa]">
												{product.name}
											</h3>
											{getPriceDisplay(product) && (
												<span className="text-[#22c55e] font-bold">
													{getPriceDisplay(product)}
												</span>
											)}
										</div>
										{product.description && (
											<p className="text-[#a3a3a3] text-sm mb-2 line-clamp-2">
												{product.description}
											</p>
										)}
										<div className="flex flex-wrap gap-2 mb-2">
											{product.category && (
												<span className="inline-block px-2 py-1 text-xs bg-[#1a1a1a] text-[#22c55e] rounded border border-[#262626]">
													{product.category}
												</span>
											)}
											{product.featured && (
												<span className="px-2 py-1 text-xs bg-[#1a1a1a] text-[#22c55e] rounded border border-[#262626]">
													Featured
												</span>
											)}
											<span
												className={`px-2 py-1 text-xs rounded border ${
													getTotalStock(product) > 0
														? "bg-[#1a1a1a] text-[#22c55e] border-[#262626]"
														: "bg-[#1a1a1a] text-[#fca5a5] border-[#7f1d1d]"
												}`}
											>
												{getTotalStock(product)} in
												stock
											</span>
											{product.variants &&
												product.variants.length > 0 && (
													<span className="px-2 py-1 text-xs bg-[#1a1a1a] text-[#a3a3a3] rounded border border-[#262626]">
														{
															product.variants
																.length
														}{" "}
														variant
														{product.variants
															.length > 1
															? "s"
															: ""}
													</span>
												)}
										</div>
										{/* Show variant names */}
										{product.variants &&
											product.variants.length > 0 && (
												<div className="text-xs text-[#737373] mb-2">
													{product.variants
														.map(
															(v) =>
																`${v.name} (${v.stock_quantity ?? 0})`,
														)
														.join(", ")}
												</div>
											)}
										<div className="flex gap-2 mt-4">
											<button
												onClick={() =>
													handleEditProduct(product)
												}
												className="flex-1 px-3 py-1.5 text-sm border border-[#262626] text-[#fafafa] rounded hover:bg-[#1a1a1a] transition-colors"
											>
												Edit
											</button>
											<button
												onClick={() =>
													handleDeleteProduct(
														product.id,
													)
												}
												className="flex-1 px-3 py-1.5 text-sm border border-[#7f1d1d] text-[#fca5a5] rounded hover:bg-[#7f1d1d]/20 transition-colors"
											>
												Delete
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Admins Tab */}
				{activeTab === "admins" && (
					<div>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-2xl font-semibold text-[#fafafa]">
								Admins
							</h2>
							<button
								onClick={() => setShowAdminForm(true)}
								className="px-4 py-2 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-lg hover:bg-[#16a34a] transition-colors"
							>
								Add Admin
							</button>
						</div>

						{/* Admin Form */}
						{showAdminForm && (
							<div className="mb-8 border border-[#262626] rounded-lg p-6 bg-[#111111]">
								<h3 className="text-xl font-semibold text-[#fafafa] mb-4">
									Add New Admin
								</h3>
								<form
									onSubmit={handleAdminSubmit}
									className="space-y-4"
								>
									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">
											Username *
										</label>
										<input
											type="text"
											value={adminUsername}
											onChange={(e) =>
												setAdminUsername(e.target.value)
											}
											required
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">
											Password * (min 6 characters)
										</label>
										<input
											type="password"
											value={adminPassword}
											onChange={(e) =>
												setAdminPassword(e.target.value)
											}
											required
											minLength={6}
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>

									<div className="flex gap-4">
										<button
											type="submit"
											className="px-6 py-2 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-lg hover:bg-[#16a34a] transition-colors"
										>
											Create
										</button>
										<button
											type="button"
											onClick={resetAdminForm}
											className="px-6 py-2 border border-[#262626] text-[#fafafa] rounded-lg hover:bg-[#1a1a1a] transition-colors"
										>
											Cancel
										</button>
									</div>
								</form>
							</div>
						)}

						{/* Admins List */}
						<div className="space-y-4">
							{admins.map((admin) => (
								<div
									key={admin.id}
									className="flex justify-between items-center p-4 border border-[#262626] rounded-lg bg-[#111111]"
								>
									<div>
										<p className="text-[#fafafa] font-semibold">
											{admin.username}
										</p>
										<p className="text-[#737373] text-sm">
											Created:{" "}
											{new Date(
												admin.created_at,
											).toLocaleDateString()}
										</p>
									</div>
									<button
										onClick={() =>
											handleDeleteAdmin(admin.id)
										}
										className="px-4 py-2 border border-[#7f1d1d] text-[#fca5a5] rounded-lg hover:bg-[#7f1d1d]/20 transition-colors"
									>
										Delete
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Links Tab */}
				{activeTab === "links" && (
					<div>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-2xl font-semibold text-[#fafafa]">
								Links
							</h2>
							<button
								onClick={() => {
									resetLinkForm();
									setShowLinkForm(true);
								}}
								className="px-4 py-2 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-lg hover:bg-[#16a34a] transition-colors"
							>
								Add Link
							</button>
						</div>

						{/* Link Form */}
						{showLinkForm && (
							<div className="mb-8 border border-[#262626] rounded-lg p-6 bg-[#111111]">
								<h3 className="text-xl font-semibold text-[#fafafa] mb-4">
									{editingLink ? "Edit Link" : "Add New Link"}
								</h3>
								<form
									onSubmit={handleLinkSubmit}
									className="space-y-4"
								>
									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">
											Title *
										</label>
										<input
											type="text"
											value={linkTitle}
											onChange={(e) =>
												setLinkTitle(e.target.value)
											}
											required
											placeholder="e.g., Visit our Instagram"
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">
											URL *
										</label>
										<input
											type="url"
											value={linkUrl}
											onChange={(e) =>
												setLinkUrl(e.target.value)
											}
											required
											placeholder="https://example.com"
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">
											Promo Code (optional)
										</label>
										<input
											type="text"
											value={linkPromoCode}
											onChange={(e) =>
												setLinkPromoCode(e.target.value)
											}
											placeholder="e.g., SAVE20"
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
										<p className="text-[#737373] text-xs mt-1">
											If set, users will see a modal to
											copy the code before visiting the
											site
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">
											Description (optional)
										</label>
										<textarea
											value={linkDescription}
											onChange={(e) =>
												setLinkDescription(
													e.target.value,
												)
											}
											rows={2}
											placeholder="Brief description of the link"
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-[#fafafa] mb-2">
												Sort Order
											</label>
											<input
												type="number"
												value={linkSortOrder}
												onChange={(e) =>
													setLinkSortOrder(
														e.target.value,
													)
												}
												placeholder="Auto"
												className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
											/>
											<p className="text-[#737373] text-xs mt-1">
												Leave empty to auto-assign.
												Lower numbers appear first.
											</p>
										</div>
										<div className="flex items-center pt-8">
											<input
												type="checkbox"
												id="linkActive"
												checked={linkActive}
												onChange={(e) =>
													setLinkActive(
														e.target.checked,
													)
												}
												className="w-4 h-4 text-[#22c55e] bg-[#1a1a1a] border-[#262626] rounded focus:ring-[#22c55e]"
											/>
											<label
												htmlFor="linkActive"
												className="ml-2 text-sm text-[#fafafa]"
											>
												Active (visible on /links page)
											</label>
										</div>
									</div>

									<div className="flex gap-4">
										<button
											type="submit"
											className="px-6 py-2 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-lg hover:bg-[#16a34a] transition-colors"
										>
											{editingLink ? "Update" : "Create"}
										</button>
										<button
											type="button"
											onClick={resetLinkForm}
											className="px-6 py-2 border border-[#262626] text-[#fafafa] rounded-lg hover:bg-[#1a1a1a] transition-colors"
										>
											Cancel
										</button>
									</div>
								</form>
							</div>
						)}

						{/* Links List */}
						<div className="space-y-4">
							{links.length === 0 && (
								<p className="text-[#737373] text-center py-8">
									No links added yet. Click &quot;Add
									Link&quot; to create your first link.
								</p>
							)}
							{links.map((link) => (
								<div
									key={link.id}
									className="flex justify-between items-center p-4 border border-[#262626] rounded-lg bg-[#111111]"
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<p className="text-[#fafafa] font-semibold truncate">
												{link.title}
											</p>
											{!link.active && (
												<span className="px-2 py-0.5 text-xs bg-[#7f1d1d]/20 text-[#fca5a5] rounded border border-[#7f1d1d]">
													Inactive
												</span>
											)}
											{link.promo_code && (
												<span className="px-2 py-0.5 text-xs bg-[#22c55e]/20 text-[#22c55e] rounded border border-[#22c55e]/50">
													Has promo code
												</span>
											)}
										</div>
										<p className="text-[#737373] text-sm truncate">
											{link.url}
										</p>
										{link.description && (
											<p className="text-[#a3a3a3] text-sm mt-1 line-clamp-1">
												{link.description}
											</p>
										)}
										<p className="text-[#525252] text-xs mt-1">
											Sort order: {link.sort_order}
										</p>
									</div>
									<div className="flex gap-2 ml-4">
										<button
											onClick={() => handleEditLink(link)}
											className="px-4 py-2 border border-[#262626] text-[#fafafa] rounded-lg hover:bg-[#1a1a1a] transition-colors"
										>
											Edit
										</button>
										<button
											onClick={() =>
												handleDeleteLink(link.id)
											}
											className="px-4 py-2 border border-[#7f1d1d] text-[#fca5a5] rounded-lg hover:bg-[#7f1d1d]/20 transition-colors"
										>
											Delete
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Orders Tab */}
				{activeTab === "orders" && (
					<div>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-2xl font-semibold text-[#fafafa]">
								Orders
							</h2>
						</div>

						{orders.length === 0 ? (
							<p className="text-[#737373] text-center py-8">
								No orders yet.
							</p>
						) : (
							<div className="space-y-4">
								{orders.map((order) => (
									<div
										key={order.id}
										className="border border-[#262626] rounded-lg bg-[#111111] p-4"
									>
										<div className="flex flex-wrap justify-between items-start gap-3 mb-3">
											<div>
												<p className="text-[#fafafa] font-semibold">
													Order #{order.id}
												</p>
												<p className="text-[#a3a3a3] text-sm">
													{order.customer_name} (
													{order.customer_email})
												</p>
												<p className="text-[#737373] text-xs mt-1">
													{new Date(
														order.created_at,
													).toLocaleString()}
												</p>
											</div>
											<div className="text-right">
												<p className="text-[#22c55e] font-bold text-lg">
													$
													{Number(
														order.subtotal,
													).toFixed(2)}
												</p>
												<p className="text-xs text-[#a3a3a3] uppercase">
													{order.currency}
												</p>
												<div className="mt-1 text-xs text-[#a3a3a3]">
													Status: {order.status}
												</div>
												<div className="text-xs text-[#a3a3a3]">
													Payment:{" "}
													{order.payment_status}
												</div>
											</div>
										</div>

										<div className="text-sm text-[#a3a3a3] space-y-1 border-t border-[#262626] pt-3">
											{order.items.map((item) => (
												<div
													key={item.id}
													className="flex justify-between gap-3"
												>
													<span>
														{item.product_name} -{" "}
														{item.variant_name} x{" "}
														{item.quantity}
													</span>
													<span>
														$
														{Number(
															item.line_total,
														).toFixed(2)}
													</span>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
