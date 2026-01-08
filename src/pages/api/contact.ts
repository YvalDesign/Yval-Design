// src/pages/api/contact.ts
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  
  // 1. HONEYPOT CHECK (Spamschutz)
  // Wenn das versteckte Feld "company" ausgefüllt ist, ist es ein Bot.
  // Wir tun so, als ob alles geklappt hat, senden aber nichts.
  const honeypot = data.get("company");
  if (honeypot) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  const name = `${data.get("firstName")} ${data.get("lastName")}`;
  const email = data.get("email")?.toString();
  const message = data.get("message")?.toString();
  const budget = data.get("budget")?.toString();
  const phone = data.get("phone")?.toString();

  // 2. API KEY HOLEN
  const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ message: "Server Error: Missing API Key" }),
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
        // WICHTIG: Nutze 'onboarding@resend.dev' solange deine Domain nicht verifiziert ist!
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
      console.error("Resend Error:", json);
      return new Response(JSON.stringify({ message: json.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Fetch Error:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
};