import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
	try {
		const { name, email, subject, message } = await request.json();

		// Validate required fields
		if (!name || !email || !subject || !message) {
			return NextResponse.json(
				{ error: "All fields are required" },
				{ status: 400 },
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{ error: "Invalid email address" },
				{ status: 400 },
			);
		}

		const toEmail = process.env.CONTACT_EMAIL;
		if (!toEmail) {
			console.error("CONTACT_EMAIL environment variable is not set");
			return NextResponse.json(
				{ error: "Server configuration error" },
				{ status: 500 },
			);
		}

		// Send email using Resend
		const { error } = await resend.emails.send({
			from: `ThreeD4G Contact Form <form@contact.threed4g.com>`,
			to: toEmail,
			replyTo: email,
			subject: subject,
			html: `
				<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
					<div style="background: #050505; padding: 32px; border-radius: 12px;">
						<h1 style="color: #22c55e; margin: 0 0 24px 0; font-size: 24px;">New Contact Form Submission</h1>

						<div style="background: #0a0a0a; padding: 24px; border-radius: 8px; border: 1px solid #171717;">
							<p style="color: #a3a3a3; margin: 0 0 16px 0;">
								<strong style="color: #fafafa;">From:</strong><br/>
								${name} (${email})
							</p>

							<p style="color: #a3a3a3; margin: 0 0 16px 0;">
								<strong style="color: #fafafa;">Subject:</strong><br/>
								${subject}
							</p>

							<p style="color: #a3a3a3; margin: 0;">
								<strong style="color: #fafafa;">Message:</strong><br/>
								${message.replace(/\n/g, "<br/>")}
							</p>
						</div>

						<p style="color: #737373; font-size: 12px; margin: 24px 0 0 0;">
							This message was sent from the ThreeD4G contact form.
						</p>
					</div>
				</div>
			`,
		});

		if (error) {
			console.error("Resend error:", error);
			return NextResponse.json(
				{ error: "Failed to send email" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Contact form error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
