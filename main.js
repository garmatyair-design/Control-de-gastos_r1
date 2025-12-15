/* ========= SUPABASE ========= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ========= AUTH ========= */
document.getElementById("btnLogin")?.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) location.href = "reportes.html";
  else alert(error.message);
});

document.getElementById("btnRegister")?.addEventListener("click", async () => {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value
  });
  if (!error) alert("Usuario creado, ahora entra");
  else alert(error.message);
});

/* ========= REPORTES ========= */
let reporteId = null;
let montoAsignado = 0;

document.getElementById("btnCrearReporte")?.addEventListener("click", async () => {
  const nombre = repNombre.value;
  montoAsignado = Number(repMonto.value);

  const { data, error } = await supabase
    .from("reports")
    .insert({ nombre, monto: montoAsignado })
    .select()
    .single();

  if (!error) {
    reporteId = data.id;
    alert("Reporte creado");
  }
});

document.getElementById("btnProcesar")?.addEventListener("click", async () => {
  if (!reporteId) return alert("Crea un reporte primero");

  const file = archivo.files[0];
  const categoria = categoriaSelect.value;

  let monto = 0;

  if (file.name.endsWith(".xml")) {
    const text = await file.text();
    const match = text.match(/Total=\"([\d.]+)/);
    if (match) monto = Number(match[1]);
  } else {
    monto = await leerMontoOCR(file);
  }

  await supabase.from("expenses").insert({
    report_id: reporteId,
    categoria,
    monto
  });

  cargarGastos();
});

async function cargarGastos() {
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("report_id", reporteId);

  let total = 0;
  listaGastos.innerHTML = "";

  data.forEach(g => {
    total += g.monto;
    listaGastos.innerHTML += `<div>${g.categoria}: $${g.monto}</div>`;
  });

  totalGastado.textContent = `$${total}`;
  resultado.textContent = `$${montoAsignado - total}`;
}

/* ========= DASHBOARD ========= */
async function cargarDashboard() {
  const { data } = await supabase.from("expenses").select("*");

  let total = 0;
  const porCategoria = {};

  data.forEach(e => {
    total += e.monto;
    porCategoria[e.categoria] = (porCategoria[e.categoria] || 0) + e.monto;
  });

  kpiTotal.textContent = `$${total}`;

  const top = Object.entries(porCategoria).sort((a,b)=>b[1]-a[1])[0];
  if (top) kpiConcepto.textContent = top[0];

  new Chart(chartGastos, {
    type: "bar",
    data: {
      labels: Object.keys(porCategoria),
      datasets: [{ data: Object.values(porCategoria) }]
    }
  });
}

if (document.getElementById("chartGastos")) cargarDashboard();
