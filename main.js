/* ================= CONFIG SUPABASE ================= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const STORAGE_BUCKET = "comprobantes";

/* ================= HELPERS ================= */
const $ = id => document.getElementById(id);
const money = n => Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});

/* ================= AUTH ================= */
supabase.auth.onAuthStateChange((e,s)=>{
  if(!s?.user && !location.pathname.endsWith("index.html")){
    location.href="index.html";
  }
});

/* ================= LOGIN ================= */
if($("btnSignIn")){
  $("btnSignIn").onclick = async ()=>{
    const email=$("siEmail").value;
    const pass=$("siPassword").value;
    const {error}=await supabase.auth.signInWithPassword({email,password:pass});
    if(error) return alert(error.message);
    location.href="reporte.html";
  };
}

/* ================= MULTI UPLOAD ================= */
if($("btnProcesarDocs")){
  $("btnProcesarDocs").onclick = async ()=>{
    const files = $("inputDocs").files;
    const categoria = $("docCategoria").value;

    if(!files.length) return alert("Selecciona archivos");

    for(const file of files){
      let monto = 0;

      /* XML */
      if(file.name.endsWith(".xml")){
        const txt = await file.text();
        const xml = new DOMParser().parseFromString(txt,"application/xml");
        const c = xml.querySelector("Comprobante, cfdi\\:Comprobante");
        monto = parseFloat(c?.getAttribute("Total")||0);
      }

      /* IMAGEN OCR */
      if(file.type.startsWith("image/") && !monto){
        $("ocrStatus").innerText="OCR "+file.name;
        const r = await Tesseract.recognize(file,"spa");
        const m = r.data.text.match(/\$?\s?(\d+[.,]\d{2})/);
        monto = m ? Number(m[1].replace(",","")) : 0;
      }

      /* PROPINA */
      let propina = 0;
      if(categoria==="Alimentos"){
        propina = Number(prompt(`Propina para ${file.name}`,0)||0);
      }

      const total = monto + propina;

      await supabase.from("expenses").insert({
        concepto:file.name,
        categoria,
        monto_base:monto,
        propina,
        total,
        fecha:new Date().toISOString().slice(0,10)
      });
    }

    $("ocrStatus").innerText="";
    alert("Archivos procesados");
    location.reload();
  };
}
