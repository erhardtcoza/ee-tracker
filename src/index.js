export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // --- Static asset routing ---
    if (request.method === "GET") {
      if (pathname === "/") {
        return fetch(new URL("../public/index.html", import.meta.url));
      }
      if (pathname === "/app.js") {
        return fetch(new URL("../public/app.js", import.meta.url));
      }
    }

    // --- Add new instrument ---
    if (request.method === "POST" && pathname === "/api/instruments") {
      const data = await request.json();
      await env.DB.prepare(`INSERT INTO instruments (name, symbol, sector) VALUES (?, ?, ?)`)
        .bind(data.name, data.symbol || null, data.sector || null)
        .run();
      return json({ success: true });
    }

    // --- Add daily price entry ---
    if (request.method === "POST" && pathname === "/api/price-entry") {
      const data = await request.json();
      await env.DB.prepare(`INSERT INTO price_entries (instrument_id, date, buy_price, current_price, shares) VALUES (?, ?, ?, ?, ?)`)
        .bind(data.instrument_id, data.date, data.buy_price, data.current_price, data.shares)
        .run();
      return json({ success: true });
    }

    // --- Get current portfolio ---
    if (request.method === "GET" && pathname === "/api/portfolio") {
      const instruments = await env.DB.prepare("SELECT * FROM instruments").all();
      const entries = await env.DB.prepare("SELECT * FROM price_entries").all();
      return json({ instruments: instruments.results, price_entries: entries.results });
    }

    return new Response("Not found", { status: 404 });
  }
};

// --- Helper: JSON response ---
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
