document.addEventListener("DOMContentLoaded", () => {
  const entryForm = document.querySelector("#entry-form");
  const instrumentForm = document.querySelector("#instrument-form");
  const instrumentSelect = document.querySelector("#instrument_id");
  const tableBody = document.querySelector("#portfolio-table tbody");
  const dateField = document.querySelector("#date");

  // Set today's date
  dateField.valueAsDate = new Date();

  async function loadInstruments(instruments) {
    instrumentSelect.innerHTML = instruments.map(i => `
      <option value="${i.id}">${i.name}</option>
    `).join("");
  }

  async function loadPortfolio() {
    const res = await fetch("/api/portfolio");
    const { instruments, price_entries } = await res.json();

    await loadInstruments(instruments);

    const grouped = instruments.map(inst => {
      const entries = price_entries.filter(e => e.instrument_id === inst.id);
      const latest = entries.at(-1);

      const total_value = latest ? (latest.current_price * latest.shares).toFixed(2) : 0;
      const gain_pct = latest ? (((latest.current_price - latest.buy_price) / latest.buy_price) * 100).toFixed(2) : 0;

      return {
        ...inst,
        latest,
        total_value,
        gain_pct
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

  entryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      instrument_id: +entryForm.instrument_id.value,
      date: entryForm.date.value,
      buy_price: +entryForm.buy_price.value,
      current_price: +entryForm.current_price.value,
      shares: +entryForm.shares.value
    };

    await fetch("/api/price-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    entryForm.reset();
    dateField.valueAsDate = new Date();
    await loadPortfolio();
  });

  instrumentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.querySelector("#inst-name").value.trim();
    const symbol = document.querySelector("#inst-symbol").value.trim();
    const sector = document.querySelector("#inst-sector").value.trim();

    if (!name) return alert("Instrument name is required");

    await fetch("/api/instruments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, symbol, sector }),
    });

    instrumentForm.reset();
    await loadPortfolio();
  });

  loadPortfolio();
});
