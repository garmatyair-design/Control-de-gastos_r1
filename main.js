/* ================= CONFIG SUPABASE ================= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "TU_ANON_KEY_AQUI";

/* ================= INIT SUPABASE (CORRECTO) ================= */
const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
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
