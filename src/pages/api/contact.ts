// src/pages/api/contact.ts
import type { APIRoute } from "astro";

// WICHTIG: Server-Modus aktivieren
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const formData = await request.formData();
    const name = formData.get("firstName") + " " + formData.get("lastName");
    const email = formData.get("email")?.toString();
    const message = formData.get("message")?.toString();
    const budget = formData.get("budget")?.toString();
    const phone = formData.get("phone")?.toString();

    // --- API KEY LOGIK (ABSTURZSICHER) ---
    
    let RESEND_API_KEY;

    // 1. Zuerst: Prüfen wir die lokale .env Datei (Das funktioniert lokal IMMER)
    if (import.meta.env.RESEND_API_KEY) {
      RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
    } 
    // 2. Fallback: Nur wenn wir bei Cloudflare sind, nutzen wir locals
    // Wir prüfen vorsichtig Schritt für Schritt, ob 'runtime' existiert
    else if (locals && locals.runtime && locals.runtime.env) {
      RESEND_API_KEY = locals.runtime.env.RESEND_API_KEY;
    }

    // --- ENDE API KEY LOGIK ---

    if (!RESEND_API_KEY) {
      console.error("❌ CRITICAL: Kein API Key gefunden. Prüfe deine .env Datei!");
      return new Response(JSON.stringify({ message: "Server-Config Fehler: API Key fehlt" }), { status: 500 });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Yval Website <info@yval-design.de>",
        to: ["info@yval-design.de"],
        reply_to: email,
        subject: `Anfrage: ${name} (${budget}€)`,
        html: `
          <h3>Neue Anfrage</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Tel:</strong> ${phone}</p>
          <p><strong>Budget:</strong> ${budget}€</p>
          <hr />
          <p><strong>Nachricht:</strong></p>
          <p>${message?.replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Resend API Fehler:", errorData);
        return new Response(JSON.stringify({ message: "Fehler beim E-Mail Versand" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Server Crash:", error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
};