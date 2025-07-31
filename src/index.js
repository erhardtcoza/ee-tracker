export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- API Routes ---
    if (path === "/api/instruments" && request.method === "POST") {
      const data = await request.json();
      await env.DB.prepare("INSERT INTO instruments (name, symbol, sector) VALUES (?, ?, ?)")
        .bind(data.name, data.symbol || null, data.sector || null)
        .run();
      return json({ success: true });
    }

    if (path === "/api/price-entry" && request.method === "POST") {
      const data = await request.json();
      await env.DB.prepare("INSERT INTO price_entries (instrument_id, date, buy_price, current_price, shares) VALUES (?, ?, ?, ?, ?)")
        .bind(data.instrument_id, data.date, data.buy_price, data.current_price, data.shares)
        .run();
      return json({ success: true });
    }

    if (path === "/api/portfolio" && request.method === "GET") {
      const instruments = await env.DB.prepare("SELECT * FROM instruments").all();
      const entries = await env.DB.prepare("SELECT * FROM price_entries").all();
      return json({ instruments: instruments.results, price_entries: entries.results });
    }

    // --- Static Files ---
    const assetPath = path === "/" ? "index.html" : path.slice(1);
    const file = await env.__STATIC_CONTENT.get(assetPath, "stream");

    if (!file) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(file, {
      headers: { "Content-Type": getMimeType(assetPath) }
    });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function getMimeType(filename) {
  if (filename.endsWith(".html")) return "text/html";
  if (filename.endsWith(".js")) return "application/javascript";
  if (filename.endsWith(".css")) return "text/css";
  return "application/octet-stream";
}
