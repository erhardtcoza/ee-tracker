export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Serve static HTML
    if (request.method === "GET" && pathname === "/") {
      return new Response(await env.ASSETS.get("index.html"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (request.method === "GET" && pathname === "/app.js") {
      return new Response(await env.ASSETS.get("app.js"), {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // Create instrument
    if (request.method === "POST" && pathname === "/api/instruments") {
      const data = await request.json();
      await env.DB.prepare(`INSERT INTO instruments (name, symbol, sector) VALUES (?, ?, ?)`)
        .bind(data.name, data.symbol || null, data.sector || null)
        .run();
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }

    // Add price entry
    if (request.method === "POST" && pathname === "/api/price-entry") {
      const data = await request.json();
      await env.DB.prepare(`INSERT INTO price_entries (instrument_id, date, buy_price, current_price, shares) VALUES (?, ?, ?, ?, ?)`)
        .bind(data.instrument_id, data.date, data.buy_price, data.current_price, data.shares)
        .run();
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }

    // Get portfolio
    if (request.method === "GET" && pathname === "/api/portfolio") {
      const instruments = await env.DB.prepare("SELECT * FROM instruments").all();
      const price_entries = await env.DB.prepare("SELECT * FROM price_entries").all();
      return new Response(JSON.stringify({ instruments: instruments.results, price_entries: price_entries.results }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
}
