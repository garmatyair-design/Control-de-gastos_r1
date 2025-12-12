/* ========= CONFIG ========= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_ANON_KEY";

const supabase = supabaseJs.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const STORAGE_BUCKET = "comprobantes";

/* ========= HELPERS ========= */
const $ = (id) => document.getElementById(id);
const money = (n) => Number(n || 0).toLocaleString("es-MX", {
  style: "currency",
  currency: "MXN"
});

/* ========= STATE ========= */
let activeReport = null;
let gastos = [];

/* ========= CREAR REPORTE ========= */
$("btnCrearReporte").onclick = async () => {
  const nombre = $("reporteNombre").value;
  const monto = Number($("montoComprobar").value);
  const fecha = $("fechaReporte").value;
  const ejecutivo = $("ejecutivoReporte").value;

  if (!nombre || !monto) return alert("Datos incompletos");

  const { data, error } = await supabase
    .from("reports")
    .insert({ nombre, monto, fecha, ejecutivo })
    .select()
    .single();

  if (error) return alert(error.message);

  activeReport = data;

  $("reporteTitulo").innerText = nombre;
  $("lblMontoAsignado").innerText = money(monto);
  $("reportePanel").style.display = "block";
};

/* ========= PROCESAR MULTI FACTURAS ========= */
$("btnProcesarFactura").onclick = async () => {
  if (!activeReport) return alert("Crea un reporte primero");

  const files = $("inputFactura").files;
  if (!files.length) return alert("Selecciona archivos");

  const categoria = $("categoriaFactura").value;

  for (const file of files) {
    let monto = 0;
    let propina = 0;
    let fecha = new Date().toISOString().slice(0, 10);

    /* XML */
    if (file.name.endsWith(".xml")) {
      const text = await file.text();
      const xml = new DOMParser().parseFromString(text, "application/xml");
      const c = xml.querySelector("Comprobante, cfdi\\:Comprobante");
      monto = Number(c?.getAttribute("Total") || 0);
      fecha = c?.getAttribute("Fecha")?.slice(0, 10) || fecha;
    }

    /* IMAGEN OCR */
    else if (file.type.startsWith("image/")) {
      const ocr = await Tesseract.recognize(file, "eng");
      const match = ocr.data.text.match(/(\d+\.\d{2})/);
      monto = match ? Number(match[1]) : 0;
    }

    /* OTROS */
    else {
      monto = Number(prompt(`Monto para ${file.name}`) || 0);
    }

    /* PROPINA SOLO ALIMENTOS */
    if (categoria === "Alimentos") {
      propina = Number(prompt(`Propina para ${file.name}`) || 0);
    }

    const total = monto + propina;

    /* SUBIR ARCHIVO */
    const path = `${activeReport.id}/${Date.now()}_${file.name}`;
    await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file);

    /* GUARDAR GASTO */
    const { data } = await supabase.from("expenses").insert({
      report_id: activeReport.id,
      concepto: file.name,
      categoria,
      fecha,
      monto_base: monto,
      propina,
      total,
      storage_path: path
    }).select().single();

    gastos.push(data);
  }

  renderGastos();
  $("inputFactura").value = "";
  alert("Archivos procesados correctamente");
};

/* ========= RENDER ========= */
function renderGastos() {
  const cont = $("gastosList");
  cont.innerHTML = "";

  let total = 0;

  gastos.forEach(g => {
    total += g.total;
    cont.innerHTML += `
      <div class="list-item">
        <strong>${g.concepto}</strong>
        <span>${g.categoria}</span>
        <span>${money(g.total)}</span>
      </div>
    `;
  });

  $("lblTotalGastado").innerText = money(total);
  $("lblResultado").innerText = money(
    $("montoComprobar").value - total
  );
}
