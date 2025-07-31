document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#entry-form");
  const tableBody = document.querySelector("#portfolio-table tbody");

  async function loadPortfolio() {
    const res = await fetch("/api/portfolio");
    const { instruments, price_entries } = await res.json();

    // Group by instrument
    const grouped = instruments.map((inst) => {
      const entries = price_entries.filter(e => e.instrument_id === inst.id);
      const latest = entries.at(-1); // latest entry
      const total_value = latest ? (latest.current_price * latest.shares).toFixed(2) : 0;
      const gain_pct = latest ? (((latest.current_price - latest.buy_price) / latest.buy_price) * 100).toFixed(2) : 0;

      return {
        ...inst,
        latest,
        total_value,
        gain_pct,
      };
    });

    tableBody.innerHTML = grouped.map(g => `
      <tr>
        <td>${g.name}</td>
        <td>${g.latest?.buy_price || "-"}</td>
        <td>${g.latest?.current_price || "-"}</td>
        <td>${g.latest?.shares || "-"}</td>
        <td>${g.total_value}</td>
        <td>${g.gain_pct}%</td>
      </tr>
    `).join("");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      instrument_id: +form.instrument_id.value,
      date: form.date.value,
      buy_price: +form.buy_price.value,
      current_price: +form.current_price.value,
      shares: +form.shares.value
    };
    await fetch("/api/price-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await loadPortfolio();
    form.reset();
  });

  loadPortfolio();
});
