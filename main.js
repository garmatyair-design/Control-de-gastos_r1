/* ================= CONFIG SUPABASE ================= */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ================= HELPERS ================= */
function $(id) {
  return document.getElementById(id);
}

/* ================= AUTH (LOGIN / REGISTER) ================= */
document.addEventListener("DOMContentLoaded", () => {

  const emailInput = $("emailInput");
  const passwordInput = $("passwordInput");
  const nameInput = $("nameInput");
  const btnLogin = $("btnLogin");
  const btnRegister = $("btnRegister");

  // Si no es página de login/registro → no ejecutar nada
  if (!emailInput || !passwordInput || (!btnLogin && !btnRegister)) {
    return;
  }

  if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
        alert("Completa correo y contraseña");
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

  if (btnRegister) {
    btnRegister.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      const name = nameInput ? nameInput.value.trim() : "";

      if (!email || !password) {
        alert("Completa correo y contraseña");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (error) {
        alert(error.message);
        return;
      }

      alert("Cuenta creada, ahora inicia sesión");
    });
  }
});

/* ================= SESIÓN ACTIVA ================= */
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabase.auth.getSession();

  const requiresAuth = document.body.dataset.auth === "true";
  if (requiresAuth && !data.session) {
    location.href = "index.html";
  }
});

/* ================= LOGOUT ================= */
document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = $("btnLogout");
  if (!btnLogout) return;

  btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "index.html";
  });
});

/* ================= CREAR REPORTE ================= */
document.addEventListener("DOMContentLoaded", () => {

  const btnCrearReporte = $("btnCrearReporte");
  if (!btnCrearReporte) return;

  btnCrearReporte.addEventListener("click", async () => {
    const nombre = $("reporteNombre")?.value.trim();
    const monto = parseFloat($("reporteMonto")?.value || 0);
    const fecha = $("reporteFecha")?.value;

    if (!nombre || !monto || !fecha) {
      alert("Completa todos los campos del reporte");
      return;
    }

    const { error } = await supabase.from("reports").insert([{
      nombre,
      monto_asignado: monto,
      fecha
    }]);

    if (error) {
      alert(error.message);
      return;
    }

    location.reload();
  });
});

/* ================= LISTAR REPORTES ================= */
document.addEventListener("DOMContentLoaded", async () => {

  const contenedor = $("listaReportes");
  if (!contenedor) return;

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  contenedor.innerHTML = "";
  data.forEach(r => {
    contenedor.innerHTML += `
      <div class="reporte-item">
        <strong>${r.nombre}</strong><br>
        Monto: $${r.monto_asignado}
      </div>
    `;
  });
});

/* ================= KPIs ================= */
document.addEventListener("DOMContentLoaded", async () => {

  const kpiReportes = $("kpiReportes");
  const kpiMonto = $("kpiMonto");

  if (!kpiReportes && !kpiMonto) return;

  const { data, error } = await supabase.from("reports").select("monto_asignado");

  if (error) return;

  if (kpiReportes) {
    kpiReportes.textContent = data.length;
  }

  if (kpiMonto) {
    const total = data.reduce((s, r) => s + r.monto_asignado, 0);
    kpiMonto.textContent = `$${total.toFixed(2)}`;
  }
});

/* ================= CARGA DE ARCHIVOS (SIMPLE) ================= */
document.addEventListener("DOMContentLoaded", () => {

  const inputFiles = $("inputFiles");
  const btnProcesar = $("btnProcesar");

  if (!inputFiles || !btnProcesar) return;

  btnProcesar.addEventListener("click", () => {
    if (!inputFiles.files.length) {
      alert("Selecciona al menos un archivo");
      return;
    }

    alert(`Archivos seleccionados: ${inputFiles.files.length}`);
    // Aquí va tu lógica de XML / OCR / Excel
  });
});
