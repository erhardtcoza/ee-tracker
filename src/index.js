export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- Handle API routes first ---
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

    // --- Serve static files manually from /public ---
    if (path === "/" || path === "/index.html") {
      return serveFile("index.html", "text/html");
    }

    if (path === "/app.js") {
      return serveFile("app.js", "application/javascript");
    }

    return new Response("Not found", { status: 404 });
  }
};

// --- Serve static files using native fetch ---
async function serveFile(filename, contentType) {
  const url = new URL(`../public/${filename}`, import.meta.url);
  const res = await fetch(url);
  const body = await res.text();

  return new Response(body, {
    headers: { "Content-Type": contentType }
  });
}

// --- JSON helper ---
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
