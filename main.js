/* ================= CONFIG SUPABASE ================= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("Supabase inicializado:", supabase);

/* ================= HELPERS ================= */
const $ = (id) => document.getElementById(id);

/* ================= AUTH LISTENER (CORREGIDO) ================= */
/*
  ESTE LISTENER:
  - NO redirige durante el login
  - NO bloquea index.html
  - SOLO protege páginas internas
*/
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Auth event:", event);

  const isLoginPage =
    location.pathname.endsWith("index.html") ||
    location.pathname.endsWith("/");

  if (!session && !isLoginPage) {
    location.href = "index.html";
  }
});

/* ================= LOGIN ================= */
document.addEventListener("DOMContentLoaded", () => {
  /* -------- SIGN IN -------- */
  if ($("btnSignIn")) {
    $("btnSignIn").addEventListener("click", async () => {
      const email = $("siEmail").value.trim();
      const password = $("siPassword").value.trim();

      if (!email || !password) {
        alert("Correo y contraseña requeridos");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      location.href = "reporte.html";
    });
  }

  /* -------- SIGN UP -------- */
  if ($("btnSignUp")) {
    $("btnSignUp").addEventListener("click", async () => {
      const name = $("suName").value.trim();
      const email = $("suEmail").value.trim();
      const password = $("suPassword").value.trim();

      if (!name || !email || !password) {
        alert("Completa todos los campos");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        alert(error.message);
        return;
      }

      alert("Usuario creado. Ahora puedes iniciar sesión.");
    });
  }

  /* -------- SIGN OUT -------- */
  if ($("btnSignOut") || $("btnSignOut2") || $("btnSignOut3")) {
    const btn =
      $("btnSignOut") || $("btnSignOut2") || $("btnSignOut3");

    btn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      location.href = "index.html";
    });
  }
});

