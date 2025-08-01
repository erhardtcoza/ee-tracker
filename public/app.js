document.addEventListener("DOMContentLoaded", () => {
  const diyBody = document.querySelector("#diy-table tbody");
  const managedBody = document.querySelector("#managed-table tbody");
  const soldBody = document.querySelector("#sold-table tbody");
  const alertDiv = document.createElement("div");
  document.body.insertBefore(alertDiv, document.querySelector(".section"));

  let pieChart, lineChart;

  // Add Entry Floating Button
  const addBtn = document.createElement("button");
  addBtn.id = "add-entry-btn";
  addBtn.textContent = "+ Add Entry";
  addBtn.onclick = () => showEntryPopup();
  document.body.appendChild(addBtn);

  // Helper Functions
  function colorize(val) {
    if (val > 0) return `<span style="color:green;font-weight:bold;">+R${Number(val).toFixed(2)}</span>`;
    if (val < 0) return `<span style="color:red;font-weight:bold;">R${Number(val).toFixed(2)}</span>`;
    return `<span>R${Number(val).toFixed(2)}</span>`;
  }
  function colorizePct(val) {
    const num = parseFloat(val);
    if (num > 0) return `<span style="color:green;font-weight:bold;">+${num.toFixed(2)}%</span>`;
    if (num < 0) return `<span style="color:red;font-weight:bold;">${num.toFixed(2)}%</span>`;
    return `<span>${num.toFixed(2)}%</span>`;
  }
  function colorizeDelta(val) {
    const num = parseFloat(val);
    if (num > 0) return `<span style="color:green;">▲ ${num.toFixed(2)}%</span>`;
    if (num < 0) return `<span style="color:red;">▼ ${num.toFixed(2)}%</span>`;
    return `<span>${num.toFixed(2)}%</span>`;
  }
  function colorizePL(val, pct) {
    const num = parseFloat(val);
    let str = (num >= 0 ? "+" : "") + "R" + Math.abs(num).toFixed(2);
    let pctStr = " (" + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%)";
    if (num > 0) return `<span style="color:green;font-weight:bold;">${str}${pctStr}</span>`;
    if (num < 0) return `<span style="color:red;font-weight:bold;">${str}${pctStr}</span>`;
    return `<span>${str}${pctStr}</span>`;
  }

  function showToast(msg, color = "#222") {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.position = "fixed";
    t.style.bottom = "25px";
    t.style.left = "50%";
    t.style.transform = "translateX(-50%)";
    t.style.background = color;
    t.style.color = "#fff";
    t.style.padding = "12px 30px";
    t.style.borderRadius = "20px";
    t.style.fontWeight = "bold";
    t.style.fontSize = "1.1em";
    t.style.zIndex = 9999;
    t.style.boxShadow = "0 8px 20px #0002";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  function showEntryPopup(existing = null) {
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
    popup.style.zIndex = 1000;
    const today = new Date().toISOString().slice(0,10);

    popup.innerHTML = `
      <div class="quick-popup">
        <h3 style="margin-top:0;">${existing ? 'Edit Entry' : 'Add Entry'}</h3>
        <label>Name / Symbol / Sector</label>
        <input type="text" id="popup-name" value="${existing?.name||""}" placeholder="e.g. Satrix 40" required ${existing ? "readonly" : ""} />
        <label>Date</label>
        <input type="date" id="popup-date" value="${today}" required ${existing ? "readonly" : ""}/>
        <label>Purchase Value (R)</label>
        <input type="number" step="0.01" id="popup-purchase_value" value="${existing?.purchase_value||""}" required ${existing ? "readonly" : ""}/>
        <label>Current Price (R)</label>
        <input type="number" step="0.01" id="popup-current_price" value="${existing?.current_price||""}" required />
        <label>Managed?</label>
        <select id="popup-managed" ${existing ? "disabled" : ""}>
          <option value="false" ${existing?.managed==0 ? "selected" : ""}>DIY</option>
          <option value="true" ${existing?.managed==1 ? "selected" : ""}>Managed</option>
        </select>
        <br><br>
        <button id="popup-save" style="background:#e2001a;color:#fff;font-weight:bold;padding:8px 20px;border-radius:5px;">Save</button>
        <button id="popup-cancel" style="margin-left:10px;background:#eee;">Cancel</button>
      </div>
    `;
    document.body.appendChild(popup);

    popup.querySelector("#popup-cancel").onclick = () => popup.remove();

    popup.querySelector("#popup-save").onclick = async () => {
      const name = popup.querySelector("#popup-name").value.trim();
      const date = popup.querySelector("#popup-date").value;
      const purchase_value = +popup.querySelector("#popup-purchase_value").value;
      const current_price = +popup.querySelector("#popup-current_price").value;
      const managed = popup.querySelector("#popup-managed")?.value === "true" ? 1 : 0;

      if (!name || !date || !purchase_value || !current_price) {
        showToast("All fields required!", "#dc2626");
        return;
      }

      // When editing: keep holding & purchase_value fixed, only update price!
      let holding;
      if (existing) {
        holding = existing.holding;
      } else {
        holding = purchase_value / current_price;
      }
      let current_value = holding * current_price;

      await fetch("/api/price-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          managed,
          date,
          purchase_value,
          current_price,
          current_value
        }),
      });
      popup.remove();
      await loadPortfolio();
    };
  }

  async function loadPortfolio() {
    const res = await fetch("/api/portfolio");
    const { price_entries, sales } = await res.json();

    // Exclude sold from active
    const soldNames = new Set(sales.map(s => s.name));
    const activeEntries = price_entries.filter(e => !soldNames.has(e.name));

    // Group by instrument
    const byInstrument = {};
    activeEntries.forEach(e => {
      if (!byInstrument[e.name]) byInstrument[e.name] = [];
      byInstrument[e.name].push(e);
    });

    diyBody.innerHTML = "";
    managedBody.innerHTML = "";

    Object.entries(byInstrument).forEach(([name, entries]) => {
      entries.sort((a, b) => new Date(a.date) - new Date(b.date)); // oldest first

      const latest = entries[entries.length - 1];
      const prev = entries.length > 1 ? entries[entries.length - 2] : null;
      const first = entries[0];

      // Always use holding from original purchase value / price
      const orig_purchase_value = first.purchase_value;
      const orig_price = first.current_price;
      const holding = orig_purchase_value / orig_price;

      // Always use original purchase value for profit
      const current_value = holding * latest.current_price;
      const profit = current_value - orig_purchase_value;
      const profit_pct = orig_purchase_value ? ((profit / orig_purchase_value) * 100) : 0;

      let delta = "0.00";
      if (prev) {
        const prev_current_value = holding * prev.current_price;
        const prev_profit = prev_current_value - orig_purchase_value;
        const prev_pct = orig_purchase_value ? ((prev_profit / orig_purchase_value) * 100) : 0;
        delta = (profit_pct - prev_pct).toFixed(2);
      }

      const uniqueDays = Array.from(new Set(entries.map(e => e.date))).sort();
      const days_held = uniqueDays.length;

      let actions = `
        <button class="edit-btn" data-name="${name}">✏️</button>
        <button class="delete-btn" data-id="${latest.id}">🗑</button>
        <button class="sell-btn" data-name="${name}" data-pv="${orig_purchase_value}" data-hold="${holding}" data-date="${latest.date}" data-origprice="${orig_price}">💸 Sell</button>
      `;

      let row = `
        <tr>
          <td>${name}</td>
          <td>${holding.toFixed(4)}</td>
          <td>R${orig_purchase_value.toFixed(2)}</td>
          <td>R${current_value.toFixed(2)}</td>
          <td>R${latest.current_price.toFixed(2)}</td>
          <td>${colorize(profit)}</td>
          <td>${colorizePct(profit_pct)}</td>
          <td>${colorizeDelta(delta)}</td>
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
      // Profit = sell_value - purchase_value; % = profit / purchase_value
      const profit = sale.sell_value - sale.purchase_value;
      const pct = sale.purchase_value ? (profit / sale.purchase_value) * 100 : 0;
      let colorized = colorizePL(profit, pct);
      let row = `
        <tr>
          <td>${sale.name}</td>
          <td>${sale.date}</td>
          <td>R${sale.sell_value.toFixed(2)}</td>
          <td>${colorized}</td>
        </tr>
      `;
      soldBody.insertAdjacentHTML("beforeend", row);
    });

    setupRowEvents(byInstrument);
    updateCharts(activeEntries);
  }

  function setupRowEvents(byInstrument) {
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

    // Sell
    document.querySelectorAll(".sell-btn").forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.name;
        const orig_pv = parseFloat(btn.dataset.pv);
        const holding = parseFloat(btn.dataset.hold);
        const orig_price = parseFloat(btn.dataset.origprice);
        const saleDate = new Date().toISOString().slice(0, 10);

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
          <div class="quick-popup">
            <h3>Sell ${name}</h3>
            <label>Date</label>
            <input type="date" id="sell-date" value="${saleDate}"/>
            <label>Sell Price (per share)</label>
            <input type="number" id="sell-price" step="0.01" required/>
            <label>Amount (shares)</label>
            <input type="number" id="sell-amount" step="0.0001" value="${holding}" required/>
            <br/>
            <button id="confirm-sell">Confirm Sell</button>
            <button id="close-sell">Cancel</button>
          </div>
        `;
        document.body.appendChild(popup);

        popup.querySelector("#confirm-sell").onclick = async () => {
          const date = popup.querySelector("#sell-date").value;
          const sell_price = +popup.querySelector("#sell-price").value;
          const amount = +popup.querySelector("#sell-amount").value;
          const sell_value = sell_price * amount;
          const profit = sell_value - orig_pv;
          await fetch("/api/sell", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, date, sell_price, sell_value, profit, purchase_value: orig_pv }),
          });
          popup.remove();
          await loadPortfolio();
        };

        popup.querySelector("#close-sell").onclick = () => popup.remove();
      };
    });

    // Edit
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.name;
        const byInst = byInstrument[name];
        const first = byInst[0];
        const latest = byInst[byInst.length - 1];
        showEntryPopup({
          name: name,
          purchase_value: first.purchase_value,
          current_price: latest.current_price,
          managed: first.managed,
          holding: first.purchase_value / first.current_price,
        });
      };
    });
  }

  function updateCharts(entries) {
    // PIE
    const lastMap = {};
    entries.forEach(e => {
      if (!lastMap[e.name] || new Date(e.date) > new Date(lastMap[e.name].date)) {
        lastMap[e.name] = e;
      }
    });
    const pieLabels = Object.keys(lastMap);
    const pieData = pieLabels.map(k => lastMap[k].current_value);

    if (pieChart) pieChart.destroy();
    pieChart = new Chart(document.getElementById("pieChart"), {
      type: "pie",
      data: {
        labels: pieLabels,
        datasets: [{ data: pieData }]
      },
      options: {
        plugins: { legend: { position: "bottom" } },
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 2
      }
    });

    // LINE
    const instrumentHistory = {};
    entries.forEach(e => {
      if (!instrumentHistory[e.name]) instrumentHistory[e.name] = [];
      instrumentHistory[e.name].push({ date: e.date, value: e.current_value });
    });

    Object.values(instrumentHistory).forEach(arr => arr.sort((a, b) => new Date(a.date) - new Date(b.date)));
    const allDates = Array.from(new Set(entries.map(e => e.date))).sort();
    const datasets = Object.entries(instrumentHistory).map(([name, values]) => {
      const data = allDates.map(d => {
        const found = values.find(v => v.date === d);
        return found ? found.value : null;
      });
      return {
        label: name,
        data,
        borderWidth: 2,
        fill: false,
        tension: 0.3
      };
    });

    if (lineChart) lineChart.destroy();
    lineChart = new Chart(document.getElementById("lineChart"), {
      type: "line",
      data: {
        labels: allDates,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 3.2,
        plugins: {
          legend: { position: "bottom" },
        },
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false
        }
      }
    });
  }

  loadPortfolio();
});
