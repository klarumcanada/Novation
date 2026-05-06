import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  console.log("Sending to Resend, from: hello@klarum.ca, to: contactklarum@gmail.com");
  console.log("API key present:", !!process.env.RESEND_API_KEY);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Klarum <onboarding@resend.dev>",
      to: "contactklarum@gmail.com",
      subject: "New contact form submission — Klarum",
      html: `
        <p>Someone requested more information from klarum.ca.</p>
        <p><strong>Email:</strong> ${email}</p>
      `,
      reply_to: email,
    }),
  });

  const data = await res.json();
  console.log("Resend response status:", res.status);
  console.log("Resend response body:", JSON.stringify(data));

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to send email", details: data }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}