/* main.js - Integrado: Auth, Reports, Expenses, Multi-upload, Preview, OCR, PDF, Excel export */

/* --------------------- CONFIG SUPABASE --------------------- */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const STORAGE_BUCKET = "comprobantes";

console.log("Supabase cargado correctamente:", supabase);

/* --------------------- utilidades --------------------- */
function uid(prefix="") { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function money(n){ return Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"}); }
function byId(id){ return document.getElementById(id); }

/* state */
let user = null;
let reportesCache = [];
let activeReport = null;
let editingExpenseId = null;

/* --------------------- AUTH helpers --------------------- */
async function signUp(email, password, name){
  const { data, error } = await supabase.auth.signUp({ email, password }, { data: { full_name: name } });
  if(error) throw error;
  if(data?.user?.id) await supabase.from("profiles").upsert({ id: data.user.id, full_name: name });
  return data;
}
async function signIn(email, password){
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) throw error;
  return data;
}
async function signOut(){
  await supabase.auth.signOut();
  location.href = "index.html";
}

/* --------------------- Auth listener --------------------- */
supabase.auth.onAuthStateChange((event, session) => {
  if(session?.user){
    user = session.user;
    const nameEl = byId("userName");
    if(nameEl){
      const nm = session.user.user_metadata?.full_name || (session.user.email||"").split("@")[0];
      nameEl.innerText = nm;
    }
    loadMyReports().then(()=> {
      if(location.pathname.endsWith("jdashboard.html")) renderDashboard();
    });
  } else {
    user = null;
  }
});

/* --------------------- DOM ready wiring --------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // login page
  if(byId("btnSignIn")){
    byId("tabSignIn").onclick = ()=> { byId("formSignIn").style.display="block"; byId("formSignUp").style.display="none"; byId("tabSignIn").classList.add("active"); byId("tabSignUp").classList.remove("active"); }
    byId("tabSignUp").onclick = ()=> { byId("formSignIn").style.display="none"; byId("formSignUp").style.display="block"; byId("tabSignUp").classList.add("active"); byId("tabSignIn").classList.remove("active"); }

    byId("btnSignIn").addEventListener("click", async ()=> {
      const email = byId("siEmail").value.trim(); const pass = byId("siPassword").value.trim();
      if(!email || !pass) return alert("Correo y contraseña requeridos.");
      try{ await signIn(email, pass); location.href="jdashboard.html"; } catch(e){ alert(e.message || JSON.stringify(e)); }
    });

    byId("btnSignUp").addEventListener("click", async ()=> {
      const name = byId("suName").value.trim(); const email = byId("suEmail").value.trim(); const pass = byId("suPassword").value.trim();
      if(!name||!email||!pass) return alert("Completa todos los datos.");
      try{ await signUp(email, pass, name); alert("Usuario creado. Revisa tu correo si aplica."); } catch(e){ alert(e.message || JSON.stringify(e)); }
    });
    return;
  }

  // common signout
  if(byId("btnSignOut")) byId("btnSignOut").addEventListener("click", signOut);
  if(byId("btnSignOut2")) byId("btnSignOut2").addEventListener("click", signOut);
  if(byId("btnSignOut3")) byId("btnSignOut3").addEventListener("click", signOut);

  // dashboard
  if(location.pathname.endsWith("jdashboard.html")){
    byId("btnExportDashboard")?.addEventListener("click", exportDashboardExcel);
    loadMyReports().then(()=> renderDashboard());
  }

  // reporte page wiring
  if(location.pathname.endsWith("reporte.html")){
    byId("btnCrearReporte")?.addEventListener("click", crearReporteHandler);
    byId("btnLoadMyReports")?.addEventListener("click", loadMyReports);
    document.querySelectorAll(".tab").forEach(t => t.addEventListener("click",(ev)=> {
      document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      const id = t.dataset.tab; document.getElementById(id).classList.add("active");
    }));
    byId("btnProcesarFactura")?.addEventListener("click", processFactura);
    byId("btnAgregarTicket")?.addEventListener("click", agregarTicketHandler);
    byId("btnAgregarManual")?.addEventListener("click", agregarManualHandler);
    byId("btnExportReporte")?.addEventListener("click", exportReporteExcel);
    byId("btnCerrarReporte")?.addEventListener("click", cerrarReporteHandler);
    byId("btnCancelEdit")?.addEventListener("click", ()=> byId("modalEdit").style.display="none");
    byId("btnSaveEdit")?.addEventListener("click", saveEditHandler);

    // multi-upload preview buttons are wired in the preview module included below
    const params = new URLSearchParams(location.search);
    const open = params.get("open");
    if(open) setTimeout(()=> openReport(open), 400);
    loadMyReports();
  }

  // historial
  if(location.pathname.endsWith("shistorial.html")){
    byId("btnFiltrar")?.addEventListener("click", aplicarFiltro);
    loadMyReports().then(()=> renderHistorial());
  }
});

/* --------------------- Reports CRUD --------------------- */
async function crearReporteHandler(){
  const nombre = byId("reporteNombre").value.trim();
  const monto = Number(byId("montoComprobar").value || 0);
  const fecha = byId("fechaReporte").value || new Date().toISOString().slice(0,10);
  const ejecutivo = byId("ejecutivoReporte").value.trim();
  if(!nombre || !monto) return alert("Nombre y monto obligatorios.");
  const session = await supabase.auth.getSession();
  if(!session.data?.session?.user) return alert("Inicia sesión.");
  const owner = session.data.session.user.id;
  const payload = { owner, name: nombre, monto_asignado: monto, fecha, ejecutivo };
  const { data, error } = await supabase.from("reports").insert(payload).select().single();
  if(error) return alert("Error crear reporte: "+ error.message);
  await loadMyReports();
  openReport(data.id);
  byId("reporteNombre").value=""; byId("montoComprobar").value=""; byId("fechaReporte").value=""; byId("ejecutivoReporte").value="";
}

async function loadMyReports(){
  const session = await supabase.auth.getSession();
  if(!session.data?.session?.user) { reportesCache = []; renderReportesList(); return; }
  const uid = session.data.session.user.id;
  const { data, error } = await supabase.from("reports").select("*").eq("owner", uid).order("created_at", { ascending:false });
  if(error) return console.error(error);
  reportesCache = data || [];
  renderReportesList();
  renderDashboard();
}

function renderReportesList(){
  const container = byId("reportesList") || byId("dashReportesList") || byId("histList");
  if(!container) return;
  container.innerHTML = "";
  if(!reportesCache.length) { container.innerHTML = `<div class="item">No hay reportes</div>`; return; }
  reportesCache.forEach(r=>{
    const el = document.createElement("div"); el.className="item";
    el.innerHTML = `<div><strong>${r.name}</strong><div style="font-size:13px;color:rgba(0,0,0,0.6)">${r.fecha} • Asignado: ${money(r.monto_asignado)}</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn-outline" data-id="${r.id}" data-action="open">Abrir</button>
        <button class="btn-outline" data-id="${r.id}" data-action="export">Exportar</button>
        <button class="btn-outline" data-id="${r.id}" data-action="delete">Eliminar</button>
      </div>`;
    container.appendChild(el);
  });
  container.querySelectorAll("button").forEach(b=> {
    const id = b.dataset.id, a = b.dataset.action;
    b.addEventListener("click", async ()=> {
      if(a==="open") openReport(id);
      if(a==="export") { await openReport(id); setTimeout(()=> exportReporteExcel(), 300); }
      if(a==="delete"){ if(!confirm("Eliminar reporte?")) return; await supabase.from("reports").delete().eq("id", id); await supabase.from("expenses").delete().eq("report_id", id); reportesCache = reportesCache.filter(x=>x.id!==id); renderReportesList(); renderDashboard(); alert("Eliminado."); }
    });
  });
}

/* --------------------- Open / show report --------------------- */
async function openReport(id){
  const { data: r, error: errr } = await supabase.from("reports").select("*").eq("id", id).single();
  if(errr) return alert("No encontrado.");
  const { data: expenses } = await supabase.from("expenses").select("*").eq("report_id", id).order("created_at", { ascending:true });
  r.gastos = expenses || [];
  activeReport = r;
  if(byId("reportePanel")) showReportPanel(r);
  return r;
}
function showReportPanel(r){
  byId("reportePanel").style.display = "block";
  byId("reporteTitulo").innerText = r.name;
  byId("reporteMeta").innerText = `${r.fecha} • Ejecutivo: ${r.ejecutivo || "—"}`;
  renderReportDetails(r);
}
function renderReportDetails(r){
  const totalGastado = (r.gastos || []).reduce((s,g)=> s + Number(g.total || 0), 0);
  const resultado = Number((r.monto_asignado - totalGastado).toFixed(2));
  if(byId("lblMontoAsignado")) byId("lblMontoAsignado").innerText = money(r.monto_asignado);
  if(byId("lblTotalGastado")) byId("lblTotalGastado").innerText = money(totalGastado);
  if(byId("lblResultado")) byId("lblResultado").innerText = resultado >= 0 ? `${money(resultado)} (Cantidad a devolver)` : `${money(Math.abs(resultado))} (Solicitar reembolso)`;
  const cats = ["Alimentos","Hospedaje","Transporte","Casetas","Varios"];
  const containerCats = byId("gastosPorCategoria");
  if(containerCats){
    containerCats.innerHTML = "";
    cats.forEach(cat=>{
      const items = (r.gastos || []).filter(g=>g.categoria===cat);
      const total = items.reduce((s,g)=> s + Number(g.total || 0), 0);
      const propinaTotal = items.reduce((s,g)=> s + Number(g.propina || 0), 0);
      const div = document.createElement("div"); div.className="cat-card";
      div.innerHTML = `<h4>${cat}</h4><div class="cat-total">${money(total)}</div><div style="margin-top:8px;font-size:13px;color:rgba(0,0,0,0.6)">${items.length} comprobantes</div><div style="font-size:13px;color:rgba(0,0,0,0.6);margin-top:6px">Propinas: ${money(propinaTotal)}</div>`;
      containerCats.appendChild(div);
    });
  }
  const list = byId("gastosList"); if(list){ list.innerHTML = ""; if(!(r.gastos||[]).length) list.innerHTML = `<div class="item">No hay gastos</div>`; (r.gastos||[]).slice().reverse().forEach(g=> {
    const el = document.createElement("div"); el.className="item";
    el.innerHTML = `<div><strong>${g.concepto}</strong><div style="font-size:13px;color:rgba(0,0,0,0.6)">${g.fecha} • ${g.categoria} • Tipo: ${g.tipo}${g.storage_path ? " • archivo" : ""}</div></div>
      <div style="display:flex;gap:8px;align-items:center">${g.propina ? `<span style="font-size:13px;color:rgba(0,0,0,0.6)">propina ${money(g.propina)}</span>` : ""}<strong>${money(g.total)}</strong><button class="btn-outline" data-id="${g.id}" data-action="edit">Editar</button><button class="btn-outline" data-id="${g.id}" data-action="del">Borrar</button></div>`;
    list.appendChild(el);
  });
    list.querySelectorAll("button").forEach(b=> {
      const id = b.dataset.id, a = b.dataset.action;
      b.addEventListener("click", ()=> {
        if(a==="edit") openEditModal(id);
        if(a==="del"){ if(!confirm("Eliminar comprobante?")) return; supabase.from("expenses").delete().eq("id", id).then(()=> { openReport(activeReport.id); renderReportesList(); renderDashboard(); }); }
      });
    });
  }
}

/* --------------------- Factura (XML) processing --------------------- */
async function processFactura(){
  const f = byId("inputFactura").files[0];
  if(!f) return alert("Selecciona archivo.");
  if(!activeReport) return alert("Abre un reporte.");
  if(f.name.toLowerCase().endsWith(".xml")){
    const text = await f.text();
    const parser = new DOMParser(); const xml = parser.parseFromString(text,"application/xml");
    const comprobante = xml.querySelector("Comprobante") || xml.querySelector("cfdi\\:Comprobante");
    const totalStr = comprobante ? (comprobante.getAttribute("Total") || comprobante.getAttribute("total")) : null;
    const fecha = comprobante ? (comprobante.getAttribute("Fecha") || new Date().toISOString().slice(0,10)) : new Date().toISOString().slice(0,10);
    const total = totalStr ? parseFloat(totalStr) : NaN;
    const path = `${activeReport.id}/${uid()}_${f.name}`;
    const { data:up, error:upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, f);
    const storagePath = up?.path || null;
    const payload = { report_id: activeReport.id, tipo: "factura", concepto: f.name, monto_base: isNaN(total)?0:total, iva:0, propina:0, total: isNaN(total)?0:total, fecha, categoria:"Varios", storage_path: storagePath };
    const { data, error } = await supabase.from("expenses").insert(payload).select().single();
    if(error) return alert("Error: "+error.message);
    await openReport(activeReport.id); renderReportesList(); renderDashboard(); byId("inputFactura").value=""; alert("Factura guardada.");
    return;
  }

  // attempt OCR for PDFs or ask for manual for other types
  if(f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")){
    // render first page to canvas using pdf.js if loaded
    try {
      const canvas = await (async function renderPdfToCanvas(file){
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          return canvas;
        } catch(e){
          console.error("PDF render", e);
          return null;
        }
      })(f);

      if(canvas){
        const res = await procesarImagenOCR(canvas, (m) => { if(byId("ocrStatus")) byId("ocrStatus").innerText = m.status + " " + (m.progress? Math.round(m.progress*100)+"%":""); });
        if(byId("ocrStatus")) byId("ocrStatus").innerText = "";
        const inferred = res?.monto;
        if(inferred && confirm(`OCR detectó ${money(inferred)}. ¿Usarlo?`)) {
          const path = `${activeReport.id}/${uid()}_${f.name}`;
          const { data:up } = await supabase.storage.from(STORAGE_BUCKET).upload(path, f);
          const storagePath = up?.path || null;
          const payload = { report_id: activeReport.id, tipo: "factura", concepto: f.name, monto_base: inferred, iva:0, propina:0, total: inferred, fecha: new Date().toISOString().slice(0,10), categoria:"Varios", storage_path: storagePath };
          const { data, error } = await supabase.from("expenses").insert(payload).select().single();
          if(error) return alert("Error: "+error.message);
          await openReport(activeReport.id); renderReportesList(); renderDashboard(); byId("inputFactura").value=""; alert("Factura (PDF) guardada.");
          return;
        }
      }

    } catch(e){
      console.error("PDF OCR", e);
    }
  }

  // fallback: manual prompt + upload
  const path = `${activeReport.id}/${uid()}_${f.name}`;
  const { data:up } = await supabase.storage.from(STORAGE_BUCKET).upload(path, f);
  const storagePath = up?.path || null;
  const monto = parseFloat(prompt("No se pudo extraer monto. Ingresa el total:") || 0);
  const payload = { report_id: activeReport.id, tipo:"factura", concepto: f.name, monto_base: monto, iva:0, propina:0, total: monto, fecha: new Date().toISOString().slice(0,10), categoria: "Varios", storage_path: storagePath };
  const { data, error } = await supabase.from("expenses").insert(payload).select().single();
  if(error) return alert("Error: "+error.message);
  await openReport(activeReport.id); renderReportesList(); renderDashboard(); byId("inputFactura").value=""; alert("Factura guardada.");
}

/* --------------------- OCR helpers (uses js/ocr.js) --------------------- */
async function ocrExtractAmountFromImageFile(file){
  try{
    if(!file) return null;
    const res = await procesarImagenOCR(file, (m) => { if(byId("ocrStatus")) byId("ocrStatus").innerText = m.status + " " + (m.progress? Math.round(m.progress*100)+"%":""); });
    if(byId("ocrStatus")) byId("ocrStatus").innerText = "";
    return res?.monto || null;
  }catch(e){ console.error("OCR error", e); if(byId("ocrStatus")) byId("ocrStatus").innerText=""; return null; }
}

/* --------------------- Ticket handler --------------------- */
async function agregarTicketHandler(){
  const f = byId("inputTicket").files[0];
  let monto = Number(byId("ticketMonto").value || 0);
  const categoria = byId("ticketCategoria").value || "Varios";
  if(!f) return alert("Selecciona archivo.");
  if(!activeReport) return alert("Abre un reporte.");
  if(!monto){
    if(confirm("No ingresaste monto. ¿Intentar OCR? (puede tardar)")){
      if(f.type && f.type.startsWith("image/")){
        if(byId("ocrStatus")) byId("ocrStatus").innerText = "Ejecutando OCR...";
        const inferred = await ocrExtractAmountFromImageFile(f);
        if(byId("ocrStatus")) byId("ocrStatus").innerText = "";
        if(inferred){
          if(confirm(`OCR detectó ${money(inferred)}. ¿Usar este monto?`)) monto = Number(inferred);
        } else {
          alert("OCR no encontró monto claro. Ingresa manualmente.");
        }
      } else if(f.type === "application/pdf"){
        // try PDF first page OCR
        const canvas = await (async function renderPdfToCanvas(file){
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            const ctx = canvas.getContext("2d");
            await page.render({ canvasContext: ctx, viewport }).promise;
            return canvas;
          } catch(e){
            console.error("PDF render", e);
            return null;
          }
        })(f);
        if(canvas){
          const res = await procesarImagenOCR(canvas, (m) => { if(byId("ocrStatus")) byId("ocrStatus").innerText = m.status + " " + (m.progress? Math.round(m.progress*100)+"%":""); });
          if(byId("ocrStatus")) byId("ocrStatus").innerText = "";
          const inferred = res?.monto;
          if(inferred && confirm(`OCR (PDF) detectó ${money(inferred)}. ¿Usarlo?`)) monto = inferred;
        }
      } else {
        alert("Archivo no es imagen o PDF. Ingresa monto manualmente.");
      }
    } else { if(!monto){ if(!confirm("Agregar ticket con monto 0?")) return; } }
  }
  const path = `${activeReport.id}/${uid()}_${f.name}`;
  const { data:up, error:upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, f);
  const storagePath = up?.path || null;
  const payload = { report_id: activeReport.id, tipo:"ticket", concepto: f.name, monto_base: monto, iva:0, propina:0, total: monto, fecha: new Date().toISOString().slice(0,10), categoria, storage_path: storagePath };
  const { data, error } = await supabase.from("expenses").insert(payload).select().single();
  if(error) return alert("Error guardar ticket: "+error.message);
  await openReport(activeReport.id); renderReportesList(); renderDashboard(); byId("inputTicket").value=""; byId("ticketMonto").value="";
}

/* --------------------- Manual add --------------------- */
async function agregarManualHandler(){
  const concepto = byId("manualConcepto").value || "Gasto manual";
  const monto = Number(byId("manualMonto").value || 0);
  const fecha = byId("manualFecha").value || new Date().toISOString().slice(0,10);
  const categoria = byId("manualCategoria").value || "Varios";
  if(!monto) return alert("Ingresa monto.");
  if(!activeReport) return alert("Abre un reporte.");
  const payload = { report_id: activeReport.id, tipo:"manual", concepto, monto_base: monto, iva:0, propina:0, total:monto, fecha, categoria, storage_path:null };
  const { data, error } = await supabase.from("expenses").insert(payload).select().single();
  if(error) return alert("Error: "+error.message);
  byId("manualConcepto").value=""; byId("manualMonto").value=""; byId("manualFecha").value="";
  await openReport(activeReport.id); renderReportesList(); renderDashboard();
}

/* --------------------- Edit modal --------------------- */
async function openEditModal(expenseId){
  const { data } = await supabase.from("expenses").select("*").eq("id", expenseId).single();
  if(!data) return alert("No encontrado.");
  editingExpenseId = expenseId;
  byId("editConcepto").value = data.concepto || "";
  byId("editMonto").value = data.monto_base || 0;
  byId("editFecha").value = data.fecha || new Date().toISOString().slice(0,10);
  byId("editCategoria").value = data.categoria || "Varios";
  byId("editPropina").value = data.propina || 0;
  byId("modalEdit").style.display = "flex";
}
async function saveEditHandler(){
  if(!editingExpenseId) return;
  const concepto = byId("editConcepto").value;
  const monto = Number(byId("editMonto").value || 0);
  const fecha = byId("editFecha").value || new Date().toISOString().slice(0,10);
  const categoria = byId("editCategoria").value;
  const propina = Number(byId("editPropina").value || 0);
  const total = Number((monto + propina).toFixed(2));
  const { error } = await supabase.from("expenses").update({ concepto, monto_base: monto, propina, total, fecha, categoria }).eq("id", editingExpenseId);
  if(error) return alert("Error guardar: "+error.message);
  byId("modalEdit").style.display = "none"; editingExpenseId = null; await openReport(activeReport.id); renderReportesList(); renderDashboard();
}

/* --------------------- Export reporte a Excel --------------------- */
async function exportReporteExcel(){
  if(!activeReport) return alert("Abre un reporte.");
  const { data: expenses } = await supabase.from("expenses").select("*").eq("report_id", activeReport.id).order("created_at", { ascending:true });
  const detalle = [["Fecha","Concepto","Categoría","Monto base","IVA","Propina","Total","Tipo","Archivo"]];
  expenses.forEach(g => detalle.push([g.fecha, g.concepto, g.categoria, Number(g.monto_base||0), Number(g.iva||0), Number(g.propina||0), Number(g.total||0), g.tipo, g.storage_path || ""]));
  const ws = XLSX.utils.aoa_to_sheet(detalle);
  const totalGastado = expenses.reduce((s,g)=> s + Number(g.total || 0), 0);
  const resultado = Number((activeReport.monto_asignado - totalGastado).toFixed(2));
  const resumen = [["Reporte", activeReport.name], ["Fecha", activeReport.fecha], ["Ejecutivo", activeReport.ejecutivo || ""], ["Monto asignado", activeReport.monto_asignado], ["Total gastado", totalGastado], ["Resultado", resultado]];
  const ws2 = XLSX.utils.aoa_to_sheet(resumen);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws2, "Resumen"); XLSX.utils.book_append_sheet(wb, ws, "Detalle");
  const filename = `${activeReport.name.replace(/\s+/g,"_")}_reporte.xlsx`;
  XLSX.writeFile(wb, filename);
}

/* --------------------- Cerrar reporte --------------------- */
async function cerrarReporteHandler(){
  if(!activeReport) return;
  await supabase.from("reports").update({ cerrado:true }).eq("id", activeReport.id);
  alert("Reporte cerrado.");
  await loadMyReports(); byId("reportePanel").style.display = "none";
}

/* --------------------- Dashboard render + export --------------------- */
async function renderDashboard(){
  const session = await supabase.auth.getSession();
  if(!session.data?.session?.user) return;
  const uid = session.data.session.user.id;
  const { data: reports } = await supabase.from("reports").select("*").eq("owner", uid).order("created_at", { ascending:true });
  if(!reports) return;
  const monthSums = {}; const totalsByCategory = {}; const byIdReports = [];
  for(const r of reports){
    const { data: ex } = await supabase.from("expenses").select("*").eq("report_id", r.id);
    const total = (ex || []).reduce((s,e)=> s + Number(e.total||0), 0);
    byIdReports.push({ ...r, total });
    const monthKey = (r.fecha || r.created_at || "").slice(0,7);
    monthSums[monthKey] = (monthSums[monthKey] || 0) + total;
    (ex || []).forEach(e => { totalsByCategory[e.categoria] = (totalsByCategory[e.categoria] || 0) + Number(e.total || 0); });
  }
  const dashList = byId("dashReportesList");
  if(dashList){ dashList.innerHTML = ""; if(!byIdReports.length) dashList.innerHTML = `<div class="item">No hay reportes</div>`; byIdReports.reverse().forEach(r=> { const el=document.createElement("div"); el.className="item"; el.innerHTML = `<div><strong>${r.name}</strong><div style="font-size:13px;color:rgba(0,0,0,0.6)">${r.fecha} • ${money(r.total)}</div></div><div style="display:flex;gap:8px"><button class="btn-outline" data-id="${r.id}" data-action="open">Abrir</button><button class="btn-outline" data-id="${r.id}" data-action="export">Export</button></div>`; dashList.appendChild(el); }); dashList.querySelectorAll("button").forEach(b=>{ const id=b.dataset.id, a=b.dataset.action; b.addEventListener("click", ()=> { if(a==="open") location.href = `reporte.html?open=${id}`; if(a==="export"){ openReport(id).then(()=> setTimeout(()=> exportReporteExcel(),200)); } }); }); }
  const canvas = byId("graficaGastos"); if(canvas){ const months=Object.keys(monthSums).sort(); const labels=months; const data = labels.map(m=> monthSums[m]||0); if(window._dashChart) window._dashChart.destroy(); window._dashChart = new Chart(canvas, { type:"line", data:{ labels, datasets:[{ label:"Gastos", data, borderWidth:2, fill:false }]}, options:{ plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} } }); }
  const catEl = byId("categoriaMayor"); if(catEl){ let best=null, val=0; Object.keys(totalsByCategory).forEach(k=>{ if(totalsByCategory[k]>val){ best=k; val=totalsByCategory[k]; } }); catEl.innerText = best ? `${best} — ${money(val)}` : "Sin datos suficientes"; }
}

/* --------------------- Export dashboard --------------------- */
async function exportDashboardExcel(){
  const session = await supabase.auth.getSession();
  if(!session.data?.session?.user) return alert("Inicia sesión.");
  const uid = session.data.session.user.id;
  const { data: reports } = await supabase.from("reports").select("*").eq("owner", uid).order("created_at", { ascending:true });
  const monthSums = {}; const totalsByCategory = {};
  for(const r of (reports||[])){
    const { data: ex } = await supabase.from("expenses").select("*").eq("report_id", r.id);
    const total = (ex||[]).reduce((s,e)=> s + Number(e.total||0), 0);
    const monthKey = (r.fecha || r.created_at || "").slice(0,7);
    monthSums[monthKey] = (monthSums[monthKey] || 0) + total;
    (ex||[]).forEach(e => totalsByCategory[e.categoria] = (totalsByCategory[e.categoria] || 0) + Number(e.total || 0));
  }
  const ws1 = XLSX.utils.aoa_to_sheet([["Mes","Total"], ...Object.entries(monthSums)]);
  const ws2 = XLSX.utils.aoa_to_sheet([["Categoría","Total"], ...Object.entries(totalsByCategory)]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws1, "Mensual"); XLSX.utils.book_append_sheet(wb, ws2, "PorCategoria"); XLSX.writeFile(wb, `dashboard_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* --------------------- Historial --------------------- */
function renderHistorial(){
  const list = byId("histList");
  if(!list) return;
  list.innerHTML = "";
  reportesCache.forEach(r => { const el=document.createElement("div"); el.className="item"; el.innerHTML = `<div><strong>${r.name}</strong><div style="font-size:13px;color:rgba(0,0,0,0.6)">${r.fecha} • Asignado: ${money(r.monto_asignado)}</div></div><div style="display:flex;gap:8px"><button class="btn-outline" data-id="${r.id}" data-action="open">Abrir</button><button class="btn-outline" data-id="${r.id}" data-action="export">Exportar</button></div>`; list.appendChild(el); });
  list.querySelectorAll("button").forEach(b=>{ const id=b.dataset.id, a=b.dataset.action; b.addEventListener("click", ()=> { if(a==="open") location.href = `reporte.html?open=${id}`; if(a==="export"){ openReport(id).then(()=> setTimeout(()=> exportReporteExcel(),200)); } }); });
}
function aplicarFiltro(){ alert("Filtro aplicado (por implementar)"); }

/* --------------------- PREVIEW + MULTI-UPLOAD + PDF OCR (reusable) ---------------- */

let previewItems = []; // { file, categoria, fecha, monto, propina, total }

function cerrarPreview(){
  previewItems = [];
  const modal = byId("previewModal");
  if(modal) modal.style.display = "none";
}

async function guardarPreview(){
  if(!activeReport) return alert("No hay reporte abierto.");
  if(previewItems.length === 0) return alert("No hay items para guardar.");

  for(const item of previewItems){
    try {
      const path = `${activeReport.id}/${uid()}_${item.file.name}`;
      const { data: up, error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, item.file);
      if(upErr){
        console.error("Upload error", upErr);
      }
      const storagePath = up?.path || null;

      const payload = {
        report_id: activeReport.id,
        tipo: "ticket",
        concepto: item.file.name,
        monto_base: Number(item.monto) || 0,
        propina: Number(item.propina) || 0,
        iva: 0,
        total: Number(item.total) || (Number(item.monto||0) + Number(item.propina||0)),
        fecha: item.fecha || new Date().toISOString().slice(0,10),
        categoria: item.categoria || "Varios",
        storage_path: storagePath
      };

      const { error } = await supabase.from("expenses").insert(payload);
      if(error) console.error("DB insert error", error);
    } catch(err){
      console.error("guardarPreview item error", err);
    }
  }

  cerrarPreview();
  await openReport(activeReport.id);
  renderReportesList();
  renderDashboard();
  alert("Archivos guardados correctamente.");
}

/* PDF render helper (pdf.js) */
async function renderPdfFirstPageToCanvas(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  } catch (e) {
    console.error("PDF render error", e);
    return null;
  }
}

function mostrarPreview(){
  const tbody = byId("previewTable").querySelector("tbody");
  tbody.innerHTML = "";

  previewItems.forEach((item, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis">
        ${item.file.name}
      </td>

      <td>
        <select onchange="previewItems[${i}].categoria = this.value">
          <option ${item.categoria==="Alimentos"?"selected":""}>Alimentos</option>
          <option ${item.categoria==="Transporte"?"selected":""}>Transporte</option>
          <option ${item.categoria==="Hospedaje"?"selected":""}>Hospedaje</option>
          <option ${item.categoria==="Casetas"?"selected":""}>Casetas</option>
          <option ${item.categoria==="Varios"?"selected":""}>Varios</option>
        </select>
      </td>

      <td>
        <input type="date" value="${item.fecha}"
          onchange="previewItems[${i}].fecha = this.value">
      </td>

      <td>
        <input type="number" step="0.01" value="${item.monto || 0}"
          onchange="previewItems[${i}].monto = Number(this.value); updateTotal(${i})">
      </td>

      <td>
        <input type="number" step="0.01" value="${item.propina || 0}" ${item.categoria!=="Alimentos" ? "disabled" : ""}
          onchange="previewItems[${i}].propina = Number(this.value); updateTotal(${i})">
      </td>

      <td>
        <input id="total-${i}" type="number" step="0.01" value="${(Number(item.monto||0) + Number(item.propina||0)).toFixed(2)}" disabled>
      </td>

      <td>
        <button class="btn-outline" onclick="previewRemoveRow(${i})">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  byId("previewModal").style.display = "flex";
}

function updateTotal(i){
  previewItems[i].total = Number(previewItems[i].monto || 0) + Number(previewItems[i].propina || 0);
  const el = byId(`total-${i}`);
  if(el) el.value = previewItems[i].total.toFixed(2);
}

function previewRemoveRow(index){
  if(!confirm("Eliminar este item de la previsualización?")) return;
  previewItems.splice(index, 1);
  mostrarPreview();
}

/* Procesamiento multi + preview mapping */
document.addEventListener("DOMContentLoaded", () => {
  const mapping = [
    { btn: "btnProcesarAlimentos",   input: "inputAlimentosMulti",   categoria: "Alimentos" },
    { btn: "btnProcesarTransporte",  input: "inputTransporteMulti",  categoria: "Transporte" },
    { btn: "btnProcesarHospedaje",   input: "inputHospedajeMulti",   categoria: "Hospedaje" },
    { btn: "btnProcesarCasetas",     input: "inputCasetasMulti",     categoria: "Casetas" },
    { btn: "btnProcesarVarios",      input: "inputVariosMulti",      categoria: "Varios" }
  ];

  mapping.forEach(cfg => {
    if(byId(cfg.btn)){
      byId(cfg.btn).addEventListener("click", () => procesarMultiPreview(cfg));
    }
  });
});

async function procesarMultiPreview(cfg){
  const files = byId(cfg.input).files;
  if(!files.length) return alert("Selecciona archivos.");
  if(!activeReport) return alert("Abre un reporte.");

  previewItems = [];

  for(const file of files){
    try {
      let monto = 0;
      let propina = 0;
      let fecha = new Date().toISOString().slice(0,10);

      /* XML */
      if(file.name.toLowerCase().endsWith(".xml")){
        try {
          const xmlText = await file.text();
          const xml = new DOMParser().parseFromString(xmlText, "application/xml");
          const comp = xml.querySelector("Comprobante") || xml.querySelector("cfdi\\:Comprobante");
          const totalStr = comp?.getAttribute("Total") || comp?.getAttribute("total");
          monto = totalStr ? parseFloat(totalStr) : 0;
          fecha = comp?.getAttribute("Fecha") || fecha;
        } catch(e){ console.error("XML parse", e); }
      }

      /* PDF */
      if(!monto && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))){
        const canvas = await renderPdfFirstPageToCanvas(file);
        if(canvas){
          const res = await procesarImagenOCR(canvas, (m) => {
            if(byId("ocrStatus")) byId("ocrStatus").innerText = m.status + " " + (m.progress? Math.round(m.progress*100)+"%":"");
          });
          if(byId("ocrStatus")) byId("ocrStatus").innerText = "";
          const inferred = res?.monto;
          if(inferred){
            if(confirm(`OCR (PDF) detectó ${money(inferred)} en ${file.name}. ¿Usarlo?`)) monto = inferred;
          }
        }
      }

      /* IMAGEN */
      if(!monto && file.type.startsWith("image/")){
        const inferred = await ocrExtractAmountFromImageFile(file);
        if(inferred){
          if(confirm(`OCR detectó ${money(inferred)} en ${file.name}. ¿Usarlo?`)){
            monto = inferred;
          }
        }
      }

      /* MANUAL */
      if(!monto){
        monto = Number(prompt(`Ingresa monto para ${file.name}:`) || 0);
      }

      /* PROPINA SOLO ALIMENTOS */
      if(cfg.categoria === "Alimentos"){
        propina = Number(prompt(`Propina para ${file.name} (0 si no aplica):`) || 0);
      }

      const totalFinal = Number((Number(monto) + Number(propina)).toFixed(2));

      previewItems.push({
        file,
        categoria: cfg.categoria,
        fecha,
        monto,
        propina,
        total: totalFinal
      });
    } catch(e){
      console.error("procesarMultiPreview error", e);
    }
  }

  mostrarPreview();
}

/* --------------------- final: query open handler --------------------- */
(function handleQueryOpen(){ const params = new URLSearchParams(location.search); const open = params.get("open"); if(open){ setTimeout(()=> openReport(open), 400); } })();
/* ================= MULTI UPLOAD INTEGRADO ================= */

let previewItems = [];

/* util */
function abrirPreview() {
  document.getElementById("previewModal").style.display = "flex";
}
function cerrarPreview() {
  previewItems = [];
  document.querySelector("#previewTable tbody").innerHTML = "";
  document.getElementById("previewModal").style.display = "none";
}

/* procesa archivos múltiples */
async function procesarArchivosMultiples(files, categoria) {
  if (!activeReport) return alert("Abre un reporte primero.");

  for (const file of files) {
    let monto = 0;
    let propina = 0;
    let fecha = new Date().toISOString().slice(0, 10);

    /* XML */
    if (file.name.toLowerCase().endsWith(".xml")) {
      const txt = await file.text();
      const xml = new DOMParser().parseFromString(txt, "application/xml");
      const comp = xml.querySelector("Comprobante, cfdi\\:Comprobante");
      monto = parseFloat(comp?.getAttribute("Total") || 0);
      fecha = comp?.getAttribute("Fecha")?.slice(0, 10) || fecha;
    }

    /* Imagen OCR */
    else if (file.type.startsWith("image/")) {
      const res = await ocrExtractAmountFromImageFile(file);
      monto = Number(res || 0);
    }

    /* PDF (manual por ahora) */
    else {
      monto = Number(prompt(`Monto para ${file.name}`) || 0);
    }

    if (categoria === "Alimentos") {
      propina = 0;
    }

    const total = monto + propina;

    previewItems.push({
      file,
      categoria,
      concepto: file.name,
      fecha,
      monto,
      propina,
      total
    });
  }

  renderPreview();
  abrirPreview();
}

/* render preview table */
function renderPreview() {
  const tbody = document.querySelector("#previewTable tbody");
  tbody.innerHTML = "";

  previewItems.forEach((it, idx) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${it.concepto}</td>
      <td>${it.categoria}</td>
      <td><input type="date" value="${it.fecha}" onchange="previewItems[${idx}].fecha=this.value"></td>
      <td><input type="number" value="${it.monto}" onchange="previewItems[${idx}].monto=Number(this.value); previewItems[${idx}].total=previewItems[${idx}].monto+previewItems[${idx}].propina; renderPreview();"></td>
      <td>
        ${it.categoria === "Alimentos"
          ? `<input type="number" value="${it.propina}" onchange="previewItems[${idx}].propina=Number(this.value); previewItems[${idx}].total=previewItems[${idx}].monto+previewItems[${idx}].propina; renderPreview();">`
          : "-"
        }
      </td>
      <td>${money(it.total)}</td>
      <td><button onclick="previewItems.splice(${idx},1); renderPreview();">❌</button></td>
    `;
    tbody.appendChild(tr);
  });
}

/* guardar todo */
async function guardarPreview() {
  for (const it of previewItems) {
    const path = `${activeReport.id}/${uid()}_${it.file.name}`;
    const { data: up } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, it.file);

    await supabase.from("expenses").insert({
      report_id: activeReport.id,
      tipo: "ticket",
      concepto: it.concepto,
      monto_base: it.monto,
      propina: it.propina,
      iva: 0,
      total: it.total,
      fecha: it.fecha,
      categoria: it.categoria,
      storage_path: up?.path || null
    });
  }

  cerrarPreview();
  await openReport(activeReport.id);
  renderReportesList();
  renderDashboard();
  alert("Archivos guardados correctamente.");
}

/* ================= EVENTOS ================= */
document.getElementById("btnProcesarAlimentos")?.addEventListener("click", () =>
  procesarArchivosMultiples(
    document.getElementById("inputAlimentosMulti").files,
    "Alimentos"
  )
);
document.getElementById("btnProcesarTransporte")?.addEventListener("click", () =>
  procesarArchivosMultiples(
    document.getElementById("inputTransporteMulti").files,
    "Transporte"
  )
);
document.getElementById("btnProcesarHospedaje")?.addEventListener("click", () =>
  procesarArchivosMultiples(
    document.getElementById("inputHospedajeMulti").files,
    "Hospedaje"
  )
);
document.getElementById("btnProcesarCasetas")?.addEventListener("click", () =>
  procesarArchivosMultiples(
    document.getElementById("inputCasetasMulti").files,
    "Casetas"
  )
);
document.getElementById("btnProcesarVarios")?.addEventListener("click", () =>
  procesarArchivosMultiples(
    document.getElementById("inputVariosMulti").files,
    "Varios"
  )
);
