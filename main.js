const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let user = null;
let activeReport = null;

/* AUTH */
supabase.auth.onAuthStateChange((_, session)=>{
  user = session?.user || null;
  if(!user && !location.pathname.endsWith("index.html")){
    location.href="index.html";
  }
});

document.getElementById("btnSignIn")?.addEventListener("click", async()=>{
  const email = siEmail.value;
  const password = siPassword.value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) alert(error.message);
  else location.href="jdashboard.html";
});

document.querySelectorAll("#btnSignOut").forEach(b=>{
  b.onclick=()=>supabase.auth.signOut();
});

/* DASHBOARD */
async function loadDashboard(){
  const { data: reports } = await supabase.from("reports").select("*");
  const list = document.getElementById("dashReportesList");
  if(!list) return;

  list.innerHTML="";
  let total = 0;

  for(const r of reports){
    const { data: ex } = await supabase.from("expenses").select("total").eq("report_id", r.id);
    const sum = ex.reduce((s,e)=>s+Number(e.total||0),0);
    total += sum;

    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`<strong>${r.name}</strong> - $${sum}`;
    list.appendChild(div);
  }

  document.getElementById("kpiTotal").innerText = "$"+total;
  document.getElementById("kpiReportes").innerText = reports.length;
}
loadDashboard();

/* REPORTES */
btnCrearReporte?.addEventListener("click", async()=>{
  const { data } = await supabase.from("reports")
    .insert({ name: reporteNombre.value, monto_asignado: montoComprobar.value })
    .select().single();
  activeReport = data;
  reportePanel.style.display="block";
  reporteTitulo.innerText = data.name;
});

/* CARGA MULTIPLE */
btnProcesarFactura?.addEventListener("click", async()=>{
  const files = [...inputFactura.files];
  const categoria = facturaCategoria.value;

  for(const f of files){
    let total = 0;

    if(f.name.endsWith(".xml")){
      const text = await f.text();
      const xml = new DOMParser().parseFromString(text,"text/xml");
      const c = xml.querySelector("Comprobante");
      total = Number(c?.getAttribute("Total")||0);
    }

    await supabase.from("expenses").insert({
      report_id: activeReport.id,
      concepto: f.name,
      categoria,
      total
    });
  }
  alert("Archivos procesados");
});

