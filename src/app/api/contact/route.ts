import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Klarum <hello@klarum.ca>",
      to: "contactklarum@gmail.com",
      subject: "New contact form submission — Klarum",
      html: `
        <p>Someone requested more information from klarum.ca.</p>
        <p><strong>Email:</strong> ${email}</p>
      `,
      reply_to: email,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}