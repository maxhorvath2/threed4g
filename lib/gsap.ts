import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register plugins
if (typeof window !== "undefined") {
	gsap.registerPlugin(ScrollTrigger);
}

// Global defaults for consistent feel
gsap.defaults({
	duration: 1,
	ease: "power3.out",
});

// Custom ease curves
const customEases = {
	smoothOut: "power4.out",
	smoothInOut: "power2.inOut",
	bounce: "elastic.out(1, 0.5)",
	snap: "back.out(1.7)",
};

export { gsap, ScrollTrigger, customEases };
