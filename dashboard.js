/* ================= SUPABASE ================= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ================= HELPERS ================= */
const money = n =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN"
  });

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  cargarDashboard();
});

/* ================= DASHBOARD ================= */
async function cargarDashboard() {

  /* REPORTES */
  const { data: reports } = await supabase
    .from("reports")
    .select("*");

  /* GASTOS */
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*");

  /* KPIs */
  document.getElementById("kpiReportes").textContent = reports.length;

  const totalGastado = expenses.reduce((s, e) => s + e.total, 0);
  document.getElementById("kpiGastado").textContent = money(totalGastado);

  const promedio = reports.length ? totalGastado / reports.length : 0;
  document.getElementById("kpiPromedio").textContent = money(promedio);

  /* GRAFICA POR CATEGORIA */
  const porCategoria = {};
  expenses.forEach(e => {
    porCategoria[e.categoria] = (porCategoria[e.categoria] || 0) + e.total;
  });

  new Chart(document.getElementById("chartCategorias"), {
    type: "doughnut",
    data: {
      labels: Object.keys(porCategoria),
      datasets: [{
        data: Object.values(porCategoria)
      }]
    }
  });

  /* GRAFICA POR MES */
  const porMes = {};
  expenses.forEach(e => {
    const mes = new Date(e.created_at).toLocaleString("es-MX", {
      month: "short",
      year: "numeric"
    });
    porMes[mes] = (porMes[mes] || 0) + e.total;
  });

  new Chart(document.getElementById("chartMeses"), {
    type: "bar",
    data: {
      labels: Object.keys(porMes),
      datasets: [{
        label: "Gasto mensual",
        data: Object.values(porMes)
      }]
    }
  });

  /* ULTIMOS GASTOS */
  const contenedor = document.getElementById("ultimosGastos");
  contenedor.innerHTML = "";

  expenses
    .slice(-10)
    .reverse()
    .forEach(e => {
      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `
        <strong>${e.categoria}</strong> — ${e.concepto}<br>
        ${money(e.total)}
      `;
      contenedor.appendChild(div);
    });
}

/* ================= LOGOUT ================= */
document.getElementById("btnSignOut")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "index.html";
});
