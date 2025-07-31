import { getAssetFromKV } from "@cloudflare/kv-asset-handler";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Handle API routes first
    if (request.method === "POST" && pathname === "/api/instruments") {
      const data = await request.json();
      await env.DB.prepare(`INSERT INTO instruments (name, symbol, sector) VALUES (?, ?, ?)`)
        .bind(data.name, data.symbol || null, data.sector || null)
        .run();
      return json({ success: true });
    }

    if (request.method === "POST" && pathname === "/api/price-entry") {
      const data = await request.json();
      await env.DB.prepare(`INSERT INTO price_entries (instrument_id, date, buy_price, current_price, shares) VALUES (?, ?, ?, ?, ?)`)
        .bind(data.instrument_id, data.date, data.buy_price, data.current_price, data.shares)
        .run();
      return json({ success: true });
    }

    if (request.method === "GET" && pathname === "/api/portfolio") {
      const instruments = await env.DB.prepare("SELECT * FROM instruments").all();
      const entries = await env.DB.prepare("SELECT * FROM price_entries").all();
      return json({ instruments: instruments.results, price_entries: entries.results });
    }

    // Serve static assets from /public
    try {
      return await getAssetFromKV({ request, waitUntil: ctx.waitUntil });
    } catch (err) {
      return new Response("Not found", { status: 404 });
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
