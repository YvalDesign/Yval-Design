// src/pages/api/contact.ts
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.formData();

    // 1. HONEYPOT
    if (data.get("company")) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const name = `${data.get("firstName")} ${data.get("lastName")}`;
    const email = data.get("email")?.toString();
    const message = data.get("message")?.toString();
    const budget = data.get("budget")?.toString();
    const phone = data.get("phone")?.toString();

    // 2. API KEY SUCHE (EXTREM ROBUST)
    // Wir suchen den Key an allen möglichen Orten, wo Cloudflare ihn verstecken könnte.
    let apiKey = import.meta.env.RESEND_API_KEY;

    // Cloudflare Runtime Zugriff (der häufigste Weg für Dashboard-Variablen)
    if (!apiKey && locals && 'runtime' in locals) {
        // @ts-ignore
        const env = locals.runtime.env;
        if (env && env.RESEND_API_KEY) {
            apiKey = env.RESEND_API_KEY;
        }
    }

    // Wenn immer noch kein Key da ist: ABBRECHEN mit genauer Fehlermeldung
    if (!apiKey) {
      console.error("DEBUG: Key wurde nirgends gefunden.");
      return new Response(
        JSON.stringify({ 
          message: "DEBUG ERROR: API Key nicht gefunden. Prüfe Cloudflare Dashboard Variable Namen." 
        }),
        { status: 500 }
      );
    }

    // 3. SENDEN
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Yval Website <info@yval-design.de>",
        // WICHTIG: Solange Domain nicht verifiziert ist, MUSS hier deine Resend-Login-Mail stehen!
        to: ["info@yval-design.de"], 
        reply_to: email,
        subject: `Anfrage: ${name}`,
        html: `
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Budget:</strong> ${budget}€</p>
          <p><strong>Nachricht:</strong> ${message}</p>
        `,
      }),
    });

    const responseData = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ 
          message: `Resend Error: ${responseData.message || JSON.stringify(responseData)}` 
        }), 
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e: any) {
    // Fängt JEDEN Absturz ab und zeigt ihn dir an
    return new Response(
      JSON.stringify({ message: `CRITICAL CRASH: ${e.message || e.toString()}` }),
      { status: 500 }
    );
  }
};