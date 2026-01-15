"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.error || "Login failed");
				setLoading(false);
				return;
			}

			router.push("/admin");
			router.refresh();
		} catch {
			setError("An error occurred. Please try again.");
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-semibold mb-2 text-[#fafafa]">ThreeD4G</h1>
					<p className="text-[#a3a3a3]">Admin Login</p>
				</div>

				<div className="border border-[#262626] rounded-lg p-8 bg-[#111111]">
					<form onSubmit={handleSubmit} className="space-y-6">
						{error && <div className="p-3 bg-[#7f1d1d] border border-[#991b1b] rounded text-[#fca5a5] text-sm">{error}</div>}

						<div>
							<label htmlFor="username" className="block text-sm font-medium text-[#fafafa] mb-2">
								Username
							</label>
							<input
								id="username"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
							/>
						</div>

						<div>
							<label htmlFor="password" className="block text-sm font-medium text-[#fafafa] mb-2">
								Password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[#fafafa] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full px-4 py-2.5 bg-[#22c55e] text-[#0a0a0a] font-medium rounded-lg hover:bg-[#16a34a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? "Logging in..." : "Login"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
