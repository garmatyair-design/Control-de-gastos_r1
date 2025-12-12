/**************** CONFIG ****************/
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";
const STORAGE_BUCKET = "comprobantes";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("MAIN NUEVO CARGADO");

/**************** UTIL ****************/
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**************** AUTH ****************/
let user = null;
supabase.auth.getUser().then(r => user = r.data?.user);

/**************** EVENT ****************/
document.getElementById("btnProcesarFactura")
  .addEventListener("click", procesarMultiples);

/**************** CORE ****************/
async function procesarMultiples() {
  const files = [...document.getElementById("inputFactura").files];
  const categoria = document.getElementById("categoriaMulti").value;

  if (!files.length) return alert("Selecciona archivos");

  for (const file of files) {
    await procesarArchivo(file, categoria);
  }

  document.getElementById("inputFactura").value = "";
  alert("Archivos procesados");
}

/**************** FILE HANDLER ****************/
async function procesarArchivo(file, categoria) {

  let total = 0;
  let propina = 0;
  let fecha = new Date().toISOString().slice(0, 10);

  /* XML */
  if (file.name.toLowerCase().endsWith(".xml")) {
    const text = await file.text();
    const xml = new DOMParser().parseFromString(text, "text/xml");
    const comp = xml.querySelector("Comprobante") || xml.querySelector("cfdi\\:Comprobante");
    total = parseFloat(comp?.getAttribute("Total") || 0);
    fecha = comp?.getAttribute("Fecha")?.slice(0,10) || fecha;
  } else {
    total = Number(prompt(`Monto para ${file.name}`) || 0);
  }

  if (categoria === "Alimentos") {
    propina = Number(prompt(`Propina para ${file.name} (opcional)`) || 0);
  }

  const path = `${uid()}_${file.name}`;
  await supabase.storage.from(STORAGE_BUCKET).upload(path, file);

  await supabase.from("expenses").insert({
    tipo: "archivo",
    concepto: file.name,
    categoria,
    monto_base: total,
    propina,
    total: total + propina,
    fecha,
    storage_path: path
  });

  agregarLineaUI(file.name, categoria, total, propina);
}

/**************** UI ****************/
function agregarLineaUI(nombre, categoria, total, propina) {
  const div = document.createElement("div");
  div.className = "item";
  div.innerHTML = `
    <div>
      <strong>${nombre}</strong>
      <div style="font-size:12px">${categoria}</div>
    </div>
    <div>
      $${total.toFixed(2)}
      ${propina ? `<small> + propina $${propina}</small>` : ""}
    </div>
  `;
  document.getElementById("gastosList").appendChild(div);
  async function cargarGastos() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error cargando gastos", error);
    return;
  }

  document.getElementById("gastosList").innerHTML = "";

  data.forEach(g => {
    agregarLineaUI(
      g.concepto,
      g.categoria,
      Number(g.monto_base),
      Number(g.propina || 0)
    );
  });
}

}

