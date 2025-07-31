document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#entry-form");
  const diyBody = document.querySelector("#diy-table tbody");
  const managedBody = document.querySelector("#managed-table tbody");
  const soldBody = document.querySelector("#sold-table tbody");
  const dateField = document.querySelector("#date");

  dateField.valueAsDate = new Date();

  // Utility for coloring profit/loss
  function colorize(val) {
    if (val > 0) return `<span style="color:green;font-weight:bold;">+R${val}</span>`;
    if (val < 0) return `<span style="color:red;font-weight:bold;">R${val}</span>`;
    return `<span>${val}</span>`;
  }

  async function loadPortfolio() {
    const res = await fetch("/api/portfolio");
    const { price_entries, sales } = await res.json();

    // Group latest entry per instrument (DIY/Managed)
    const byInstrument = {};
    price_entries.forEach(e => {
      if (!byInstrument[e.name]) byInstrument[e.name] = [];
      byInstrument[e.name].push(e);
    });

    diyBody.innerHTML = "";
    managedBody.innerHTML = "";

    Object.entries(byInstrument).forEach(([name, entries]) => {
      // Most recent first
      entries.sort((a, b) => new Date(b.date) - new Date(a.date));
      const latest = entries[0];
      const first = entries[entries.length - 1];
      const days_held = Math.max(1, Math.floor((new Date(latest.date) - new Date(first.date)) / (1000 * 60 * 60 * 24)));
      const holding = (latest.current_price > 0) ? (latest.purchase_value / latest.current_price).toFixed(4) : "-";
      const profit = (latest.current_value - latest.purchase_value).toFixed(2);
      const profit_pct = latest.purchase_value ? (((latest.current_value - latest.purchase_value) / latest.purchase_value) * 100).toFixed(2) : "0.00";

      let actions = `
        <button class="edit-btn" data-name="${name}">✏️</button>
        <button class="delete-btn" data-id="${latest.id}">🗑</button>
        <button class="sell-btn" data-name="${name}" data-pv="${latest.purchase_value}" data-hold="${holding}">💸 Sell</button>
      `;

      let row = `
        <tr>
          <td>${name}</td>
          <td>${holding}</td>
          <td>R${latest.purchase_value.toFixed(2)}</td>
          <td>R${latest.current_value.toFixed(2)}</td>
          <td>R${latest.current_price.toFixed(2)}</td>
          <td>${colorize(profit)}</td>
          <td>${colorize(profit_pct + "%")}</td>
          <td>${days_held}</td>
          <td>${actions}</td>
        </tr>
      `;

      if (latest.managed) {
        managedBody.insertAdjacentHTML("beforeend", row);
      } else {
        diyBody.insertAdjacentHTML("beforeend", row);
      }
    });

    // Sold instruments
    soldBody.innerHTML = "";
    sales.forEach(sale => {
      let row = `
        <tr>
          <td>${sale.name}</td>
          <td>${sale.date}</td>
          <td>R${sale.sell_value.toFixed(2)}</td>
          <td>R${sale.profit.toFixed(2)}</td>
        </tr>
      `;
      soldBody.insertAdjacentHTML("beforeend", row);
    });

    setupRowEvents();
  }

  // Inline editing, deleting, and selling
  function setupRowEvents() {
    // Delete
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.onclick = async () => {
        if (confirm("Delete this entry?")) {
          await fetch("/api/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: btn.dataset.id }),
          });
          await loadPortfolio();
        }
      };
    });

    // Sell popup
    document.querySelectorAll(".sell-btn").forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.name;
        const pv = btn.dataset.pv;
        const hold = btn.dataset.hold;

        const popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.left = "0";
        popup.style.top = "0";
        popup.style.width = "100vw";
        popup.style.height = "100vh";
        popup.style.background = "rgba(0,0,0,0.3)";
        popup.style.display = "flex";
        popup.style.justifyContent = "center";
        popup.style.alignItems = "center";
        popup.innerHTML = `
          <div style="background:#fff;padding:20px;border-radius:6px;min-width:300px;box-shadow:0 0 20px #0002;">
            <h3>Sell ${name}</h3>
            <label>Date</label>
            <input type="date" id="sell-date" value="${new Date().toISOString().slice(0,10)}"/>
            <label>Sell Price (per share)</label>
            <input type="number" id="sell-price" step="0.01" value=""/>
            <label>Sell Value (total)</label>
            <input type="number" id="sell-value" step="0.01" value=""/>
            <label>Profit</label>
            <input type="number" id="sell-profit" step="0.01" value=""/>
            <br/>
            <button id="confirm-sell">Confirm Sell</button>
            <button id="close-sell">Cancel</button>
          </div>
        `;
        document.body.appendChild(popup);

        popup.querySelector("#confirm-sell").onclick = async () => {
          const date = popup.querySelector("#sell-date").value;
          const sell_price = +popup.querySelector("#sell-price").value;
          const sell_value = +popup.querySelector("#sell-value").value;
          const profit = +popup.querySelector("#sell-profit").value;
          await fetch("/api/sell", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, date, sell_price, sell_value, profit }),
          });
          popup.remove();
          await loadPortfolio();
        };

        popup.querySelector("#close-sell").onclick = () => popup.remove();
      };
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: form.name.value,
      managed: form.managed.value === "true" ? 1 : 0,
      date: form.date.value,
      purchase_value: +form.purchase_value.value,
      current_price: +form.current_price.value,
      current_value: +form.current_value.value
    };
    await fetch("/api/price-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    form.reset();
    dateField.valueAsDate = new Date();
    await loadPortfolio();
  });

  loadPortfolio();
});
