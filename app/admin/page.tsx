"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Product {
	id: number;
	name: string;
	description: string | null;
	image_url: string;
	category: string | null;
	featured: boolean;
	price: number | null;
}

interface Admin {
	id: number;
	username: string;
	created_at: string;
}

export default function AdminDashboard() {
	const router = useRouter();
	const [products, setProducts] = useState<Product[]>([]);
	const [admins, setAdmins] = useState<Admin[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"products" | "admins">("products");
	const [showProductForm, setShowProductForm] = useState(false);
	const [showAdminForm, setShowAdminForm] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	// Product form state
	const [productName, setProductName] = useState("");
	const [productDescription, setProductDescription] = useState("");
	const [productCategory, setProductCategory] = useState("");
	const [productImageUrl, setProductImageUrl] = useState("");
	const [productFeatured, setProductFeatured] = useState(false);
	const [productPrice, setProductPrice] = useState("");

	// Admin form state
	const [adminUsername, setAdminUsername] = useState("");
	const [adminPassword, setAdminPassword] = useState("");

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			const [productsRes, adminsRes] = await Promise.all([fetch("/api/products"), fetch("/api/admin")]);

			if (productsRes.ok) {
				const productsData = await productsRes.json();
				setProducts(productsData);
			}

			if (adminsRes.ok) {
				const adminsData = await adminsRes.json();
				setAdmins(adminsData);
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

	const handleImageUpload = async (file: File) => {
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
			setProductImageUrl(data.url);
			return data.url;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
			setUploadError(errorMessage);
			// Don't throw - let the error state handle the UI feedback
			return null;
		} finally {
			setUploading(false);
		}
	};

	const handleProductSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate that image URL is present
		if (!productImageUrl) {
			setUploadError("Please upload an image before submitting");
			return;
		}

		// Don't submit if upload is in progress
		if (uploading) {
			setUploadError("Please wait for the image upload to complete");
			return;
		}

		try {
			const url = editingProduct?.id ? `/api/products/${editingProduct.id}` : "/api/products";
			const method = editingProduct?.id ? "PUT" : "POST";

			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: productName,
					description: productDescription || null,
					image_url: productImageUrl,
					category: productCategory || null,
					featured: productFeatured,
					price: productPrice ? parseFloat(productPrice) : null,
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
			const message = error instanceof Error ? error.message : "Failed to create admin";
			alert(message);
		}
	};

	const handleDeleteProduct = async (id: number) => {
		if (!confirm("Are you sure you want to delete this product?")) return;

		try {
			const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
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
			const message = error instanceof Error ? error.message : "Failed to delete admin";
			alert(message);
		}
	};

	const handleEditProduct = (product: Product) => {
		setEditingProduct(product);
		setProductName(product.name);
		setProductDescription(product.description || "");
		setProductCategory(product.category || "");
		setProductImageUrl(product.image_url);
		setProductFeatured(product.featured);
		setProductPrice(product.price !== null ? product.price.toString() : "");
		setShowProductForm(true);
	};

	const resetProductForm = () => {
		setEditingProduct(null);
		setProductName("");
		setProductDescription("");
		setProductCategory("");
		setProductImageUrl("");
		setProductFeatured(false);
		setProductPrice("");
		setUploadError(null);
		setShowProductForm(false);
	};

	const resetAdminForm = () => {
		setAdminUsername("");
		setAdminPassword("");
		setShowAdminForm(false);
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
						<h1 className="text-2xl font-semibold text-[#fafafa]">Admin Dashboard</h1>
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
							activeTab === "products" ? "text-[#22c55e] border-b-2 border-[#22c55e]" : "text-[#a3a3a3] hover:text-[#fafafa]"
						}`}
					>
						Products
					</button>
					<button
						onClick={() => setActiveTab("admins")}
						className={`px-6 py-3 font-medium transition-colors ${
							activeTab === "admins" ? "text-[#22c55e] border-b-2 border-[#22c55e]" : "text-[#a3a3a3] hover:text-[#fafafa]"
						}`}
					>
						Admins
					</button>
				</div>

				{/* Products Tab */}
				{activeTab === "products" && (
					<div>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-2xl font-semibold text-[#fafafa]">Products</h2>
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
									{editingProduct ? "Edit Product" : "Add New Product"}
								</h3>
								<form onSubmit={handleProductSubmit} className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">Name *</label>
										<input
											type="text"
											value={productName}
											onChange={(e) => setProductName(e.target.value)}
											required
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">Description</label>
										<textarea
											value={productDescription}
											onChange={(e) => setProductDescription(e.target.value)}
											rows={3}
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">Category</label>
										<input
											type="text"
											value={productCategory}
											onChange={(e) => setProductCategory(e.target.value)}
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">Price ($)</label>
										<input
											type="number"
											step="0.01"
											min="0"
											value={productPrice}
											onChange={(e) => setProductPrice(e.target.value)}
											placeholder="0.00"
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
									</div>
									</div>

									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">Image *</label>
										<input
											type="file"
											accept="image/*"
											onChange={async (e) => {
												const file = e.target.files?.[0];
												if (file) {
													await handleImageUpload(file);
												}
											}}
											className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
										/>
										{uploading && <p className="text-[#22c55e] text-sm mt-2">Uploading...</p>}
										{uploadError && <p className="text-[#fca5a5] text-sm mt-2">{uploadError}</p>}
										{productImageUrl && (
											<div className="mt-2">
												<p className="text-sm text-[#a3a3a3] mb-2">Image URL:</p>
												<input
													type="text"
													value={productImageUrl}
													onChange={(e) => setProductImageUrl(e.target.value)}
													required
													className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] text-sm transition-colors"
												/>
												<div className="mt-2 relative w-32 h-32 rounded-lg overflow-hidden border border-[#262626]">
													<Image src={productImageUrl} alt="Preview" fill className="object-cover" />
												</div>
											</div>
										)}
									</div>

									<div className="flex items-center">
										<input
											type="checkbox"
											id="featured"
											checked={productFeatured}
											onChange={(e) => setProductFeatured(e.target.checked)}
											className="w-4 h-4 text-[#22c55e] bg-[#1a1a1a] border-[#262626] rounded focus:ring-[#22c55e]"
										/>
										<label htmlFor="featured" className="ml-2 text-sm text-[#fafafa]">
											Featured
										</label>
									</div>

									<div className="flex gap-4">
										<button
											type="submit"
											className="px-6 py-2 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-lg hover:bg-[#16a34a] transition-colors"
										>
											{editingProduct ? "Update" : "Create"}
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
								<div key={product.id} className="border border-[#262626] rounded-lg overflow-hidden bg-[#111111]">
									<div className="relative w-full h-48">
										<Image src={product.image_url} alt={product.name} fill className="object-cover" />
									</div>
									<div className="p-4">
										<div className="flex justify-between items-start mb-2">
											<h3 className="text-lg font-semibold text-[#fafafa]">{product.name}</h3>
											{product.price !== null && (
												<span className="text-[#22c55e] font-bold">${Number(product.price).toFixed(2)}</span>
											)}
										</div>
										{product.description && (
											<p className="text-[#a3a3a3] text-sm mb-2 line-clamp-2">{product.description}</p>
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
										{product.price === null && (
											<span className="px-2 py-1 text-xs bg-[#7f1d1d]/20 text-[#fca5a5] rounded border border-[#7f1d1d]">
												No Price
											</span>
										)}
										</div>
										<div className="flex gap-2 mt-4">
											<button
												onClick={() => handleEditProduct(product)}
												className="flex-1 px-3 py-1.5 text-sm border border-[#262626] text-[#fafafa] rounded hover:bg-[#1a1a1a] transition-colors"
											>
												Edit
											</button>
											<button
												onClick={() => handleDeleteProduct(product.id)}
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
							<h2 className="text-2xl font-semibold text-[#fafafa]">Admins</h2>
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
								<h3 className="text-xl font-semibold text-[#fafafa] mb-4">Add New Admin</h3>
								<form onSubmit={handleAdminSubmit} className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-[#fafafa] mb-2">Username *</label>
										<input
											type="text"
											value={adminUsername}
											onChange={(e) => setAdminUsername(e.target.value)}
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
											onChange={(e) => setAdminPassword(e.target.value)}
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
										<p className="text-[#fafafa] font-semibold">{admin.username}</p>
										<p className="text-[#737373] text-sm">Created: {new Date(admin.created_at).toLocaleDateString()}</p>
									</div>
									<button
										onClick={() => handleDeleteAdmin(admin.id)}
										className="px-4 py-2 border border-[#7f1d1d] text-[#fca5a5] rounded-lg hover:bg-[#7f1d1d]/20 transition-colors"
									>
										Delete
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
