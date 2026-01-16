import Navigation from "@/components/Navigation";
import { Footer } from "@/components/layout/Footer";
import { ContactContent } from "@/components/sections/ContactContent";

export default function Contact() {
	return (
		<div className="min-h-screen bg-[#050505]">
			<Navigation />
			<ContactContent />
			<Footer />
		</div>
	);
}
