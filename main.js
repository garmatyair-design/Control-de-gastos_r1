/* ================= CONFIG SUPABASE ================= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ================= ESTADO GLOBAL ================= */
let reporteActivo = null;
let montoAsignado = 0;
let gastos = [];

/* ================= UTILIDADES ================= */
const money = n =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN"
  });

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* ================= CREAR REPORTE ================= */
document.getElementById("btnCrearReporte")?.addEventListener("click", async () => {
  const nombre = reporteNombre.value.trim();
  montoAsignado = Number(montoComprobar.value || 0);
  const fecha = fechaReporte.value;
  const ejecutivo = ejecutivoReporte.value;

  if (!nombre || !montoAsignado) {
    alert("Completa nombre y monto");
    return;
  }

  const { data, error } = await supabase
    .from("reports")
    .insert([{ nombre, monto: montoAsignado, fecha, ejecutivo }])
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  reporteActivo = data.id;
  document.getElementById("reportePanel").style.display = "block";
  document.getElementById("reporteTitulo").textContent = nombre;
  document.getElementById("lblMontoAsignado").textContent = money(montoAsignado);

  cargarGastos();
});

/* ================= CARGA MÚLTIPLE INTEGRADA ================= */
document.getElementById("btnProcesarFactura")?.addEventListener("click", async () => {
  const files = inputFactura.files;
  const categoria = document.getElementById("categoriaFactura").value;

  if (!files.length || !reporteActivo) {
    alert("Selecciona archivos y crea un reporte");
    return;
  }

  for (const file of files) {
    let monto = 0;
    let propina = 0;

    if (file.name.endsWith(".xml")) {
      const text = await file.text();
      const match = text.match(/Total="([\d.]+)"/);
      monto = match ? Number(match[1]) : 0;
    } else {
      const result = await Tesseract.recognize(file, "spa");
      const match = result.data.text.match(/(\d+\.\d{2})/);
      monto = match ? Number(match[1]) : 0;
    }

    if (categoria === "Alimentos") {
      propina = Number(prompt(`Propina para ${file.name}`, "0")) || 0;
    }

    await supabase.from("expenses").insert([{
      report_id: reporteActivo,
      categoria,
      concepto: file.name,
      monto,
      propina,
      total: monto + propina
    }]);
  }

  cargarGastos();
});

/* ================= CARGAR GASTOS ================= */
async function cargarGastos() {
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("report_id", reporteActivo);

  gastos = data || [];
  renderGastos();
  actualizarTotales();
}

/* ================= RENDER GASTOS ================= */
function renderGastos() {
  gastosList.innerHTML = "";

  gastos.forEach(g => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <strong>${g.categoria}</strong> — ${g.concepto}<br>
      Monto: ${money(g.monto)}
      ${g.propina ? `<br>Propina: ${money(g.propina)}` : ""}
    `;
    gastosList.appendChild(div);
  });
}

/* ================= TOTALES ================= */
function actualizarTotales() {
  const totalGastado = gastos.reduce((s, g) => s + g.total, 0);
  const resultado = montoAsignado - totalGastado;

  lblTotalGastado.textContent = money(totalGastado);
  lblResultado.textContent =
    resultado >= 0
      ? `A devolver ${money(resultado)}`
      : `Reembolso ${money(Math.abs(resultado))}`;
}

