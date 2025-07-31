export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- Handle API routes ---
    if (request.method === "POST" && path === "/api/instruments") {
      const data = await request.json();
      await env.DB.prepare("INSERT INTO instruments (name, symbol, sector) VALUES (?, ?, ?)")
        .bind(data.name, data.symbol || null, data.sector || null)
        .run();
      return json({ success: true });
    }

    if (request.method === "POST" && path === "/api/price-entry") {
      const data = await request.json();
      await env.DB.prepare("INSERT INTO price_entries (instrument_id, date, buy_price, current_price, shares) VALUES (?, ?, ?, ?, ?)")
        .bind(data.instrument_id, data.date, data.buy_price, data.current_price, data.shares)
        .run();
      return json({ success: true });
    }

    if (request.method === "GET" && path === "/api/portfolio") {
      const instruments = await env.DB.prepare("SELECT * FROM instruments").all();
      const entries = await env.DB.prepare("SELECT * FROM price_entries").all();
      return json({ instruments: instruments.results, price_entries: entries.results });
    }

    // --- Serve static files from /public ---
    try {
      const assetPath = path === "/" ? "/index.html" : path;
      const asset = await env.__STATIC_CONTENT.get(assetPath.slice(1));
      if (!asset) return new Response("Not found", { status: 404 });

      const contentType = getMimeType(assetPath);
      return new Response(asset, {
        headers: { "Content-Type": contentType }
      });
    } catch (err) {
      return new Response("Error loading static file", { status: 500 });
    }
  }
};

// --- Helpers ---
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function getMimeType(path) {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".css")) return "text/css";
  return "application/octet-stream";
}
