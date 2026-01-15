import Image from "next/image";

interface Product {
	id: number;
	name: string;
	description: string | null;
	image_url: string;
	category: string | null;
	featured: boolean;
}

interface ProductCardProps {
	product: Product;
	variant?: "default" | "featured";
}

export default function ProductCard({ product }: ProductCardProps) {
	return (
		<div className="group relative overflow-hidden rounded-lg border border-[#262626] bg-[#111111] hover:border-[#22c55e]/50 transition-all duration-200">
			<div className="aspect-square relative overflow-hidden bg-[#1a1a1a]">
				<Image
					src={product.image_url}
					alt={product.name}
					fill
					className="object-cover group-hover:scale-105 transition-transform duration-300"
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
				/>
			</div>
			<div className="p-4">
				<h3 className="text-base font-semibold text-[#fafafa] mb-1.5">{product.name}</h3>
				{product.description && <p className="text-sm text-[#a3a3a3] line-clamp-2 mb-2">{product.description}</p>}
				{product.category && (
					<span className="inline-block px-2 py-0.5 text-xs font-medium bg-[#1a1a1a] text-[#22c55e] rounded border border-[#262626]">
						{product.category}
					</span>
				)}
			</div>
		</div>
	);
}
