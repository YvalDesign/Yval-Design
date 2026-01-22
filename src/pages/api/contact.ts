// src/pages/api/contact.ts
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  
  // 1. HONEYPOT CHECK
  const honeypot = data.get("company");
  if (honeypot) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  const name = `${data.get("firstName")} ${data.get("lastName")}`;
  const email = data.get("email")?.toString();
  const message = data.get("message")?.toString();
  const budget = data.get("budget")?.toString();
  const phone = data.get("phone")?.toString();

  // 2. API KEY HOLEN (Korrektur: process.env entfernt!)
  // Auf Cloudflare muss die Variable via import.meta.env oder context kommen.
  const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error("CRITICAL: RESEND_API_KEY is missing in environment variables!");
    return new Response(
      JSON.stringify({ message: "Server Configuration Error" }),
      { status: 500 }
    );
  }

  // 3. SENDEN VIA RESEND
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Yval Website <onboarding@resend.dev>", 
        to: ["info@yval-design.de"], 
        reply_to: email,
        subject: `Anfrage: ${name} (${budget}€)`,
        html: `
          <h3>Neue Anfrage über Website</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Telefon:</strong> ${phone}</p>
          <p><strong>Budget:</strong> ${budget}€</p>
          <hr />
          <p><strong>Nachricht:</strong></p>
          <p>${message?.replace(/\n/g, "<br>")}</p>
        `,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("Resend API Error:", JSON.stringify(json));
      return new Response(JSON.stringify({ message: "Error sending email" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Fetch/Network Error:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
};