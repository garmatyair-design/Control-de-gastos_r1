/* ================= SUPABASE CONFIG ================= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";

if (!window.supabase) {
  alert("Supabase no cargó. Revisa index.html");
  throw new Error("Supabase no definido");
}

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

);

console.log("Supabase cargado correctamente", supabase);

}
;

const STORAGE_BUCKET = "comprobantes";

/* ================= UTILS ================= */
function byId(id){ return document.getElementById(id); }
function money(n){ return Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"}); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

/* ================= STATE ================= */
let user = null;
let reportesCache = [];
let activeReport = null;

/* ================= AUTH ================= */
async function signUp(email, password, name){
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options:{
      data:{ full_name:name }
    }
  });
  if(error) throw error;
  return data;
}

async function signIn(email, password){
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if(error) throw error;
  return data;
}

async function signOut(){
  await supabase.auth.signOut();
  location.href = "index.html";
}

/* ================= AUTH LISTENER ================= */
supabase.auth.onAuthStateChange((event, session)=>{
  user = session?.user || null;
});

/* ================= DOM READY ================= */
document.addEventListener("DOMContentLoaded", ()=>{

  /* ===== LOGIN ===== */
  if(byId("btnSignIn")){
    byId("btnSignIn").onclick = async ()=>{
      const email = byId("siEmail").value.trim();
      const pass  = byId("siPassword").value.trim();
      if(!email || !pass) return alert("Datos incompletos");
      try{
        await signIn(email, pass);
        location.href="jdashboard.html";
      }catch(e){ alert(e.message); }
    };

    byId("btnSignUp").onclick = async ()=>{
      const name  = byId("suName").value.trim();
      const email = byId("suEmail").value.trim();
      const pass  = byId("suPassword").value.trim();
      if(!name||!email||!pass) return alert("Datos incompletos");
      try{
        await signUp(email, pass, name);
        alert("Usuario creado. Revisa tu correo.");
      }catch(e){ alert(e.message); }
    };
  }

  /* ===== LOGOUT ===== */
  byId("btnSignOut")?.addEventListener("click", signOut);
  byId("btnSignOut2")?.addEventListener("click", signOut);
  byId("btnSignOut3")?.addEventListener("click", signOut);

});
