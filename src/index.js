export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Add or update a price entry
    if (path === "/api/price-entry" && request.method === "POST") {
      const data = await request.json();
      await env.DB.prepare(
        `INSERT INTO price_entries (name, managed, date, purchase_value, current_price, current_value)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        data.name,
        data.managed ? 1 : 0,
        data.date,
        data.purchase_value,
        data.current_price,
        data.current_value
      ).run();
      return json({ success: true });
    }

    // Get all portfolio entries and sales
    if (path === "/api/portfolio" && request.method === "GET") {
      const res = await env.DB.prepare(
        "SELECT * FROM price_entries ORDER BY name, date"
      ).all();
      const sales = await env.DB.prepare(
        "SELECT * FROM sales ORDER BY date DESC"
      ).all();
      return json({
        price_entries: res.results,
        sales: sales.results
      });
    }

    // Log a sale (only total sale value and purchase_value)
    if (path === "/api/sell" && request.method === "POST") {
      const data = await request.json();
      if (!data.name || !data.date || data.sell_value === undefined || data.purchase_value === undefined) {
        return json({ error: "Missing fields" }, 400);
      }
      const profit = data.sell_value - data.purchase_value;
      await env.DB.prepare(
        `INSERT INTO sales (name, date, sell_value, profit, purchase_value)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        data.name,
        data.date,
        data.sell_value,
        profit,
        data.purchase_value
      ).run();
      return json({ success: true });
    }

    // Delete an entry
    if (path === "/api/delete" && request.method === "POST") {
      const data = await request.json();
      if (!data.id) return json({ error: "Missing id" }, 400);
      await env.DB.prepare("DELETE FROM price_entries WHERE id = ?").bind(data.id).run();
      return json({ success: true });
    }

    // Serve static (manual KV)
    const key = path === "/" ? "index.html" : path.slice(1);
    const file = await env.STATIC.get(key);
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(file, {
      headers: { "Content-Type": getMimeType(key) }
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
