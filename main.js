/**********************************************************
 *  main.js – Comprobación de Gastos (VERSIÓN FINAL)
 *  - Supabase Auth + DB + Storage
 *  - XML automático
 *  - OCR imágenes
 *  - Carga múltiple integrada por categoría
 *  - Propina solo en Alimentos
 **********************************************************/

/* ================= CONFIG ================= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";
const STORAGE_BUCKET = "comprobantes";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ================= UTIL ================= */
const $ = (id) => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

let activeReport = null;
let previewItems = [];

/* ================= AUTH ================= */
supabase.auth.onAuthStateChange((_, session) => {
  if (!session && !location.pathname.endsWith("index.html")) {
    location.href = "index.html";
  }
});

/* ================= DOM READY ================= */
document.addEventListener("DOMContentLoaded", () => {
  /* -------- LOGIN -------- */
  if ($("btnSignIn")) {
    $("btnSignIn").onclick = async () => {
      const email = $("siEmail").value;
      const password = $("siPassword").value;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return alert(error.message);
      location.href = "jdashboard.html";
    };

    $("btnSignUp").onclick = async () => {
      const email = $("suEmail").value;
      const password = $("suPassword").value;
      const name = $("suName").value;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) return alert(error.message);
      alert("Usuario creado");
    };
    return;
  }

  /* -------- LOGOUT -------- */
  $("btnSignOut2")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "index.html";
  });

  /* -------- REPORTE -------- */
  if (location.pathname.endsWith("reporte.html")) {
    $("btnCrearReporte").onclick = crearReporte;

    // CARGA MÚLTIPLE (INTEGRADA)
    bindMulti("Alimentos");
    bindMulti("Transporte");
    bindMulti("Hospedaje");
    bindMulti("Casetas");
    bindMulti("Varios");
  }
});

/* ================= REPORTE ================= */
async function crearReporte() {
  const name = $("reporteNombre").value;
  const monto = Number($("montoComprobar").value);
  if (!name || !monto) return alert("Datos incompletos");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      owner: user.id,
      name,
      monto_asignado: monto,
      fecha: $("fechaReporte").value,
      ejecutivo: $("ejecutivoReporte").value,
    })
    .select()
    .single();

  if (error) return alert(error.message);
  activeReport = data;
  $("reportePanel").style.display = "block";
  $("reporteTitulo").innerText = data.name;
}

/* ================= MULTI UPLOAD ================= */
function bindMulti(cat) {
  $(`btnProcesar${cat}`)?.addEventListener("click", async () => {
    const files = $(`input${cat}Multi`).files;
    if (!files.length) return alert("Selecciona archivos");
    if (!activeReport) return alert("Crea o abre un reporte");

    previewItems = [];

    for (const file of files) {
      let monto = 0;
      let fecha = new Date().toISOString().slice(0, 10);
      let propina = 0;

      // XML
      if (file.name.endsWith(".xml")) {
        const txt = await file.text();
        const xml = new DOMParser().parseFromString(txt, "application/xml");
        const c = xml.querySelector("Comprobante, cfdi\\:Comprobante");
        monto = Number(c?.getAttribute("Total") || 0);
        fecha = c?.getAttribute("Fecha")?.slice(0, 10) || fecha;
      }
      // IMAGEN OCR
      else if (file.type.startsWith("image/")) {
        const res = await Tesseract.recognize(file, "eng");
        const match = res.data.text.match(/(\d+\.\d{2})/);
        monto = match ? Number(match[1]) : 0;
      }
      // OTROS
      else {
        monto = Number(prompt(`Monto para ${file.name}`) || 0);
      }

      previewItems.push({
        file,
        categoria: cat,
        concepto: file.name,
        fecha,
        monto,
        propina,
        total: monto,
      });
    }

    renderPreview();
    $("previewModal").style.display = "flex";
  });
}

/* ================= PREVIEW ================= */
function renderPreview() {
  const tbody = document.querySelector("#previewTable tbody");
  tbody.innerHTML = "";

  previewItems.forEach((g, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${g.concepto}</td>
      <td>${g.categoria}</td>
      <td><input type="date" value="${g.fecha}"
        onchange="previewItems[${i}].fecha=this.value"></td>
      <td><input type="number" value="${g.monto}"
        onchange="previewItems[${i}].monto=Number(this.value);updateTotal(${i})"></td>
      <td>${
        g.categoria === "Alimentos"
          ? `<input type="number" value="${g.propina}"
              onchange="previewItems[${i}].propina=Number(this.value);updateTotal(${i})">`
          : "-"
      }</td>
      <td>${money(g.total)}</td>
      <td><button onclick="removeItem(${i})">❌</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateTotal(i) {
  const g = previewItems[i];
  g.total = g.monto + (g.categoria === "Alimentos" ? g.propina : 0);
  renderPreview();
}

function removeItem(i) {
  previewItems.splice(i, 1);
  renderPreview();
}

/* ================= GUARDAR ================= */
async function guardarPreview() {
  for (const g of previewItems) {
    const path = `${activeReport.id}/${uid()}_${g.file.name}`;
    const { data: up } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, g.file);

    await supabase.from("expenses").insert({
      report_id: activeReport.id,
      tipo: "ticket",
      concepto: g.concepto,
      categoria: g.categoria,
      fecha: g.fecha,
      monto_base: g.monto,
      propina: g.propina,
      iva: 0,
      total: g.total,
      storage_path: up?.path || null,
    });
  }

  previewItems = [];
  $("previewModal").style.display = "none";
  alert("Gastos guardados correctamente");
}

/* ================= GLOBAL ================= */
window.guardarPreview = guardarPreview;
window.cerrarPreview = () => ($("previewModal").style.display = "none");
window.previewItems = previewItems;
window.updateTotal = updateTotal;
window.removeItem = removeItem;
