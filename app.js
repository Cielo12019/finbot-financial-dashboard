const API_URL =
  "https://script.google.com/macros/s/AKfycbyd0zU-mPL48wQJ8ySV_A_GmKRmypOajYVQySDrpuEnK5szmmJs6qZCIdSFJ3gXcn--Zg/exec";

let gastosChart = null;
let ingresosChart = null;
let ingresosGastosChart = null;
let tendenciaChart = null;
let incomeDetailChart = null;
let expenseDetailChart = null;
let savingDetailChart = null;
let reportChart = null;

document.getElementById("searchBtn")?.addEventListener("click", cargarDashboard);
document.getElementById("refreshBtn")?.addEventListener("click", cargarDashboard);
document.getElementById("phone")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") cargarDashboard();
});
document.getElementById("mobileMenu")?.addEventListener("click", () => {
  document.getElementById("sidebar")?.classList.toggle("open");
});

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
    item.classList.add("active");
    const hash = item.getAttribute("href");
    showSection(hash);
    document.getElementById("sidebar")?.classList.remove("open");
  });
});

function showSection(hash) {
  const target = (hash || "#resumen").replace("#", "");
  const dashboard = document.getElementById("dashboard");
  if (dashboard) dashboard.style.display = target === "resumen" ? "block" : "none";
  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.toggle("active", section.id === "section-" + target);
  });
}

async function cargarDashboard() {
  const phone = document.getElementById("phone").value.trim();
  const moneda = document.getElementById("moneda").value;

  if (!phone) {
    alert("Ingresa el teléfono del usuario.");
    return;
  }

  try {
    const url = `${API_URL}?phone=${encodeURIComponent(phone)}&moneda=${encodeURIComponent(moneda)}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error("Error HTTP " + response.status);

    const data = await response.json();

    if (!data.success) throw new Error(data.error || "La API devolvió un error.");

    actualizarResumen(data);
    actualizarPlataEntrante(data);
    actualizarPresupuesto(data);
    actualizarGastos(data);
    actualizarIngresosGastos(data);
    actualizarTendencia(data);
    actualizarTransacciones(data);
    actualizarVistasAdicionales(data);
  } catch (error) {
    console.error(error);
    alert("No se pudieron cargar los datos: " + error.message);
  }
}

function actualizarResumen(data) {
  const moneda = data.usuario?.moneda || document.getElementById("moneda")?.value || "PEN";
  const r = data.resumen || {};
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set("ingresos", formatear(r.ingresos, moneda));
  set("gastos", formatear(r.gastos, moneda));
  set("saldo", formatear(r.saldo, moneda));
  set("ahorro", formatear(r.ahorro, moneda));
  set("porcentajeAhorro", `${Number(r.porcentajeAhorro || 0).toFixed(1)}%`);
}

function actualizarPlataEntrante(data) {
  const rows = data.ingresosPorCategoria || [];
  const labels = rows.map(x => x.categoria || "Otros");
  const valores = rows.map(x => Number(x.total || 0));
  const canvas = document.getElementById("ingresosChart");
  const legend = document.getElementById("ingresosLegend");

  if (ingresosChart) ingresosChart.destroy();

  if (canvas && typeof Chart !== "undefined") {
    ingresosChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: valores,
          backgroundColor: ["#0875ee", "#19a86d", "#8545df", "#f59b12", "#ef4148", "#20b99c", "#64748b"],
          borderWidth: 0,
          hoverOffset: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = valores.reduce((a, b) => a + b, 0);
                const pct = total ? (context.raw / total * 100).toFixed(1) : "0.0";
                return ` ${context.label}: ${pct}%`;
              }
            }
          }
        }
      }
    });
  }

  if (legend) {
    const total = valores.reduce((a, b) => a + b, 0);
    legend.innerHTML = rows.length
      ? rows.map((x, i) => {
          const value = Number(x.total || 0);
          const pct = total ? (value / total * 100).toFixed(1) : "0.0";
          const color = ["#0875ee", "#19a86d", "#8545df", "#f59b12", "#ef4148", "#20b99c", "#64748b"][i % 7];
          return `<div class="legend-item"><span class="dot" style="background:${color}"></span><span>${escapeHtml(x.categoria || "Otros")}</span><b>${pct}%</b></div>`;
        }).join("")
      : `<div class="legend-empty">No hay ingresos registrados.</div>`;
  }
}

function actualizarGastos(data) {
  const rows = data.gastosPorCategoria || [];
  const labels = rows.map(x => x.categoria);
  const valores = rows.map(x => Number(x.total));

  if (gastosChart) gastosChart.destroy();

  gastosChart = new Chart(document.getElementById("gastosChart"), {
    type: "doughnut",
    data: { labels, datasets: [{ data: valores }] },
    options: { responsive: true, maintainAspectRatio: false, resizeDelay: 100 }
  });
}

function actualizarIngresosGastos(data) {
  const rows = data.ingresosVsGastos || [];
  const labels = rows.map(x => x.mes);
  const ingresos = rows.map(x => Number(x.ingresos));
  const gastos = rows.map(x => Number(x.gastos));

  if (ingresosGastosChart) ingresosGastosChart.destroy();

  ingresosGastosChart = new Chart(document.getElementById("ingresosGastosChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Ingresos", data: ingresos },
        { label: "Gastos", data: gastos }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, resizeDelay: 100 }
  });
}

function actualizarTendencia(data) {
  const rows = data.tendenciaGastos || [];
  const labels = rows.map(x => x.mes);
  const valores = rows.map(x => Number(x.gastos));

  if (tendenciaChart) tendenciaChart.destroy();

  tendenciaChart = new Chart(document.getElementById("tendenciaChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Gastos",
        data: valores,
        tension: 0.3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, resizeDelay: 100 }
  });
}

function actualizarPresupuesto(data) {
  const p = data.presupuesto || {};
  const porcentaje = Number(p.porcentajeUsado || 0);
  const moneda = data.usuario?.moneda || document.getElementById("moneda")?.value || "PEN";

  const pctEl = document.getElementById("budgetPct");
  if (pctEl) pctEl.textContent = `${porcentaje.toFixed(1)}%`;
  const progress = document.getElementById("progressBar");
  if (progress) progress.style.width = `${Math.min(Math.max(porcentaje, 0), 100)}%`;
  const used = document.getElementById("budgetUsed");
  if (used) used.textContent = formatear(Number(p.usado || 0), moneda);
  const total = document.getElementById("budgetTotal");
  if (total) total.textContent = formatear(Number(p.total || 0), moneda);
}

function actualizarTransacciones(data) {
  const tbody = document.getElementById("transacciones");
  if (!tbody) return;
  tbody.innerHTML = "";

  const rows = (data.transacciones || []).slice(0, 10);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5">No hay transacciones para este usuario.</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement("tr");
    const tipoClass =
      row.tipo === "gasto" ? "tipo-gasto" :
      row.tipo === "ingreso" ? "tipo-ingreso" :
      "tipo-presupuesto";

    tr.innerHTML = `
      <td>${escapeHtml(row.fecha || "")}</td>
      <td>${escapeHtml(row.categoria || "Sin categoría")}</td>
      <td>${escapeHtml(row.descripcion || "-")}</td>
      <td class="${tipoClass}">${escapeHtml(row.tipo || "")}</td>
      <td>${formatear(Number(row.valor || 0), row.moneda || data.usuario.moneda)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function formatear(valor, moneda) {
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: moneda
    }).format(Number(valor || 0));
  } catch {
    return `${moneda} ${Number(valor || 0).toFixed(2)}`;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

cargarDashboard();


function actualizarVistasAdicionales(data) {
  const moneda = data.usuario?.moneda || document.getElementById("moneda")?.value || "PEN";
  const r = data.resumen || {};
  const ingresos = data.ingresosPorCategoria || [];
  const gastos = data.gastosPorCategoria || [];
  const trans = data.transacciones || [];
  const presupuesto = data.presupuesto || {};

  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

  set("incomeTotal", formatear(r.ingresos, moneda));
  set("incomeSources", ingresos.length);
  set("expenseTotal", formatear(r.gastos, moneda));
  set("expenseCategories", gastos.length);
  set("savingPageTotal", formatear(r.ahorro, moneda));
  set("savingPagePct", `${Number(r.porcentajeAhorro || 0).toFixed(1)}%`);
  set("reportIncome", formatear(r.ingresos, moneda));
  set("reportExpense", formatear(r.gastos, moneda));
  set("reportBalance", formatear(r.saldo, moneda));
  set("reportCount", trans.length);
  set("pageBudgetTotal", formatear(presupuesto.total || 0, moneda));
  set("pageBudgetUsed", formatear(presupuesto.usado || 0, moneda));
  set("pageBudgetAvailable", formatear(presupuesto.disponible || 0, moneda));
  set("pageBudgetPct", `${Number(presupuesto.porcentajeUsado || 0).toFixed(1)}%`);

  const pg = document.getElementById("pageProgress");
  if (pg) pg.style.width = `${Math.min(100, Math.max(0, Number(presupuesto.porcentajeUsado || 0)))}%`;

  const goal = document.getElementById("goalProgress");
  if (goal) goal.style.width = `${Math.min(100, Math.max(0, Number(r.ahorro || 0) / 3000 * 100))}%`;
  set("goalText", `${Math.min(100, Math.max(0, Number(r.ahorro || 0) / 3000 * 100)).toFixed(1)}%`);

  const fill = (id, rows, renderer) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = rows.length ? rows.slice(0, 100).map(renderer).join("") :
      `<tr><td colspan="5">No hay registros.</td></tr>`;
  };

  const incomeRows = trans.filter(x => String(x.tipo).toLowerCase() === "ingreso");
  const expenseRows = trans.filter(x => String(x.tipo).toLowerCase() === "gasto");
  fill("incomeTable", incomeRows, x => `<tr><td>${escapeHtml(x.fecha || "")}</td><td>${escapeHtml(x.categoria || "-")}</td><td>${escapeHtml(x.descripcion || "-")}</td><td>${formatear(x.valor, x.moneda || moneda)}</td></tr>`);
  fill("expenseTable", expenseRows, x => `<tr><td>${escapeHtml(x.fecha || "")}</td><td>${escapeHtml(x.descripcion || "-")}</td><td>${escapeHtml(x.categoria || "-")}</td><td>${formatear(x.valor, x.moneda || moneda)}</td></tr>`);

  const debts = trans.filter(x => /deud|pr[eé]st|loan/i.test(`${x.categoria || ""} ${x.descripcion || ""}`));
  fill("debtTable", debts, x => `<tr><td>${escapeHtml(x.fecha || "")}</td><td>${escapeHtml(x.categoria || "-")}</td><td>${escapeHtml(x.descripcion || "-")}</td><td>${formatear(x.valor, x.moneda || moneda)}</td></tr>`);

  if (typeof Chart !== "undefined") {
    if (incomeDetailChart) incomeDetailChart.destroy();
    const incomeCanvas = document.getElementById("incomeDetailChart");
    if (incomeCanvas) incomeDetailChart = new Chart(incomeCanvas, {
      type: "bar",
      data: { labels: ingresos.map(x => x.categoria), datasets: [{ label: "Ingresos", data: ingresos.map(x => Number(x.total)), backgroundColor: "#16a66c", borderRadius: 5 }] },
      options: { responsive: true, maintainAspectRatio: false }
    });

    if (expenseDetailChart) expenseDetailChart.destroy();
    const expenseCanvas = document.getElementById("expenseDetailChart");
    if (expenseCanvas) expenseDetailChart = new Chart(expenseCanvas, {
      type: "doughnut",
      data: { labels: gastos.map(x => x.categoria), datasets: [{ data: gastos.map(x => Number(x.total)), backgroundColor: ["#f59b12","#287bea","#20b99c","#ef4a4e","#7c4bd8","#aaa"] }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "62%" }
    });

    const list = document.getElementById("expenseList");
    if (list) {
      const total = Number(r.gastos || 0);
      list.innerHTML = gastos.map(x => {
        const pct = total ? Number(x.total) / total * 100 : 0;
        return `<div class="expense-line"><span>${escapeHtml(x.categoria || "Otros")}</span><div class="track"><div class="fill" style="width:${pct}%"></div></div><b>${formatear(x.total, moneda)}</b></div>`;
      }).join("");
    }

    const ivg = data.ingresosVsGastos || [];
    if (savingDetailChart) savingDetailChart.destroy();
    const savingCanvas = document.getElementById("savingDetailChart");
    if (savingCanvas) savingDetailChart = new Chart(savingCanvas, {
      type: "bar",
      data: { labels: ivg.map(x => x.mes), datasets: [{ label: "Ahorro", data: ivg.map(x => Number(x.ingresos) - Number(x.gastos)), backgroundColor: "#19a86d", borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false }
    });

    if (reportChart) reportChart.destroy();
    const reportCanvas = document.getElementById("reportChart");
    if (reportCanvas) reportChart = new Chart(reportCanvas, {
      type: "bar",
      data: { labels: ivg.map(x => x.mes), datasets: [
        { label: "Ingresos", data: ivg.map(x => Number(x.ingresos)), backgroundColor: "#22a86f" },
        { label: "Gastos", data: ivg.map(x => Number(x.gastos)), backgroundColor: "#ef4b50" }
      ] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

window.addEventListener("hashchange", () => {
  const hash = location.hash || "#resumen";
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.getAttribute("href") === hash);
  });
  showSection(hash);
});

showSection(location.hash || "#resumen");
