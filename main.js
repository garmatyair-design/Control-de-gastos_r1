/* ================= SUPABASE CONFIG ================= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";

if (!window.supabase) {
  throw new Error("Supabase SDK no cargado");
}

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const STORAGE_BUCKET = "comprobantes";

console.log("Supabase OK", supabase);

/* ================= UTILIDADES ================= */
const byId = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

/* ================= AUTH ================= */
document.addEventListener("DOMContentLoaded", () => {

  if (byId("btnSignIn")) {
    byId("btnSignIn").addEventListener("click", async () => {
      const email = byId("siEmail").value.trim();
      const password = byId("siPassword").value.trim();

      if (!email || !password) {
        alert("Datos incompletos");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        alert(error.message);
        return;
      }

      location.href = "jdashboard.html";
    });
  }
});

/* ================= CREAR REPORTE ================= */
async function crearReporte(nombre, monto) {
  const session = await supabase.auth.getSession();
  if (!session.data.session) return alert("No autenticado");

  const { error } = await supabase
    .from("reports")
    .insert({
      owner: session.data.session.user.id,
      name: nombre,
      monto_asignado: monto,
      fecha: new Date().toISOString().slice(0, 10)
    });

  if (error) {
    alert(error.message);
  } else {
    alert("Reporte creado");
  }
}

/* ================= PROCESAR FACTURA XML ================= */
async function processFactura(file, reportId) {
  if (!file || !reportId) return;

  if (file.name.toLowerCase().endsWith(".xml")) {
    const text = await file.text();
    const xml = new DOMParser().parseFromString(text, "application/xml");

    const comprobante = [...xml.getElementsByTagName("*")]
      .find(el => el.localName === "Comprobante");

    if (!comprobante) {
      alert("XML no válido");
      return;
    }

    const total = parseFloat(comprobante.getAttribute("Total") || 0);
    const fecha = comprobante.getAttribute("Fecha") || new Date().toISOString().slice(0,10);

    const path = `${reportId}/${uid()}_${file.name}`;

    await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file);

    await supabase.from("expenses").insert({
      report_id: reportId,
      tipo: "factura",
      concepto: file.name,
      total,
      fecha,
      categoria: "Varios",
      storage_path: path
    });

    alert("Factura guardada");
  }
}
