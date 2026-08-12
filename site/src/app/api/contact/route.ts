import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  const { name, company, email, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
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
      subject: `New contact form submission — ${name}`,
      html: `
        <p>Someone requested more information from klarum.ca.</p>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
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