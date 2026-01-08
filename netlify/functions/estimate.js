export default async (request, context) => {
  // CORS (на всякий случай; запрос и так будет на твой домен Netlify)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Preflight
  if (request.method === "OPTIONS") {
    return new Response("", { status: 204, headers: corsHeaders });
  }

  // Только POST
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Твой n8n webhook (Timeweb)
    const N8N_WEBHOOK_URL =
      "https://n8n-amstardam.tw1.su/webhook/b7598374-c25f-42ed-957c-06527e2e8616";

    // Берём multipart/form-data от браузера
    const incoming = await request.formData();

    // Собираем multipart/form-data для n8n
    const outgoing = new FormData();

    // audio (обязательно)
    const audio = incoming.get("audio");
    if (!audio) {
      return new Response(JSON.stringify({ error: "Missing audio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    outgoing.append("audio", audio, audio.name || `voice_${Date.now()}.webm`);

    // дополнительные поля
    outgoing.append("niche", incoming.get("niche") || "");
    outgoing.append("company", incoming.get("company") || "");
    outgoing.append("city", incoming.get("city") || "");

    // Проксируем запрос в n8n
    const resp = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      body: outgoing,
    });

    // Если n8n вернул JSON — отдадим JSON
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Иначе вернём текст/HTML как текст — полезно для диагностики 500
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};