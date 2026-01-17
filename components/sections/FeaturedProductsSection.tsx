"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/Button";
import { MagneticButton } from "@/components/animations/MagneticButton";

interface Product {
  id: number;
  name: string;
  description: string | null;
  image_url: string;
  category: string | null;
  featured: boolean;
  price: number | null;
}

interface FeaturedProductsSectionProps {
  products: Product[];
}

export function FeaturedProductsSection({
  products,
}: FeaturedProductsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate heading
      gsap.fromTo(
        ".products-heading",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".products-heading",
            start: "top 85%",
            once: true,
          },
        },
      );

      // Animate product cards with stagger
      if (gridRef.current && gridRef.current.children.length > 0) {
        const cards = gridRef.current.children;
        gsap.fromTo(
          cards,
          { opacity: 0, y: 80, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 80%",
              once: true,
            },
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [products]);

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#171717] to-transparent" />
      <div className="absolute top-1/2 right-0 w-100 h-100 rounded-full bg-[#22c55e]/5 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="products-heading flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <span className="inline-block text-[#22c55e] text-sm font-medium tracking-wider uppercase mb-4">
              Our Products
            </span>
            <h2 className="text-headline text-[#fafafa]">
              Featured <span className="text-[#22c55e]">Collection</span>
            </h2>
          </div>
          <p className="text-[#a3a3a3] max-w-md">
            Discover our most popular products, designed and tested by growers
            for growers.
          </p>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div
            ref={gridRef}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {products.slice(0, 6).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="featured"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-[#262626] rounded-2xl">
            <p className="text-[#737373]">No products available yet.</p>
            <p className="text-[#525252] text-sm mt-2">
              Check back soon for our latest collection!
            </p>
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-16">
          <MagneticButton strength={0.15}>
            <Button asChild variant="outline" size="lg">
              <Link href="/gallery">
                View All Products
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </Button>
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
