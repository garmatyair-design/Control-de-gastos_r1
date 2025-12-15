/* ======================================================
   CONFIG SUPABASE
====================================================== */
const SUPABASE_URL = "https://imhoqcsefymrnpqrhvis.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaG9xY3NlZnltcm5wcXJodmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTY5ODIsImV4cCI6MjA4MTA3Mjk4Mn0.jplAkiMPXl6V5KT4P9h3OXAJNOwSsF9ZVz6nVIo6a9A";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ======================================================
   HELPERS
====================================================== */
function $(id) {
  return document.getElementById(id);
}

function money(n) {
  return Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN"
  });
}

/* ======================================================
   AUTH: LOGIN Y REGISTRO (USA TUS IDs REALES)
====================================================== */
document.addEventListener("DOMContentLoaded", () => {

  /* ---------- LOGIN ---------- */
  const siEmail = $("siEmail");
  const siPassword = $("siPassword");
  const btnSignIn = $("btnSignIn");

  if (siEmail && siPassword && btnSignIn) {
    btnSignIn.addEventListener("click", async () => {
      const email = siEmail.value.trim();
      const password = siPassword.value.trim();

      if (!email || !password) {
        alert("Correo y contraseña requeridos");
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

  /* ---------- REGISTRO ---------- */
  const suName = $("suName");
  const suEmail = $("suEmail");
  const suPassword = $("suPassword");
  const btnSignUp = $("btnSignUp");

  if (suEmail && suPassword && btnSignUp) {
    btnSignUp.addEventListener("click", async () => {
      const email = suEmail.value.trim();
      const password = suPassword.value.trim();
      const name = suName ? suName.value.trim() : "";

      if (!email || !password) {
        alert("Completa todos los campos");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }
        }
      });

      if (error) {
        alert(error.message);
        return;
      }

      alert("Usuario registrado. Ahora inicia sesión.");
    });
  }
});

/* ======================================================
   PROTECCIÓN DE PÁGINAS (REQUIEREN SESIÓN)
====================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  const requiresAuth = document.body.dataset.auth === "true";
  if (!requiresAuth) return;

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    location.href = "index.html";
  }
});

/* ======================================================
   LOGOUT
====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const btnSignOut =
    $("btnSignOut") || $("btnSignOut2") || $("btnSignOut3");

  if (!btnSignOut) return;

  btnSignOut.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.href = "index.html";
  });
});

/* ======================================================
   DASHBOARD: KPIs Y LISTADO DE REPORTES
====================================================== */
document.addEventListener("DOMContentLoaded", async () => {

  const kpiReportes = $("kpiReportes");
  const kpiMonto = $("kpiMonto");
  const lista = $("dashReportesList");

  if (!kpiReportes && !kpiMonto && !lista) return;

  const { data: reports, error } = await supabase
    .from("reports")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  if (kpiReportes) {
    kpiReportes.innerText = reports.length;
  }

  if (kpiMonto) {
    const total = reports.reduce(
      (s, r) => s + Number(r.monto_asignado || 0),
      0
    );
    kpiMonto.innerText = money(total);
  }

  if (lista) {
    lista.innerHTML = "";
    if (!reports.length) {
      lista.innerHTML = `<div class="item">No hay reportes</div>`;
      return;
    }

    reports.forEach(r => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div>
          <strong>${r.name}</strong>
          <div class="muted">${r.fecha} • ${money(r.monto_asignado)}</div>
        </div>
        <button class="btn-outline" onclick="location.href='reporte.html?open=${r.id}'">
          Abrir
        </button>
      `;
      lista.appendChild(el);
    });
  }
});

/* ======================================================
   CREAR REPORTE
====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const btnCrearReporte = $("btnCrearReporte");
  if (!btnCrearReporte) return;

  btnCrearReporte.addEventListener("click", async () => {
    const nombre = $("reporteNombre")?.value.trim();
    const monto = Number($("montoComprobar")?.value || 0);
    const fecha = $("fechaReporte")?.value;
    const ejecutivo = $("ejecutivoReporte")?.value || "";

    if (!nombre || !monto || !fecha) {
      alert("Completa nombre, monto y fecha");
      return;
    }

    const { error } = await supabase.from("reports").insert([{
      name: nombre,
      monto_asignado: monto,
      fecha,
      ejecutivo
    }]);

    if (error) {
      alert(error.message);
      return;
    }

    location.reload();
  });
});

/* ======================================================
   CARGA SIMPLE DE ARCHIVOS (BASE FUNCIONAL)
====================================================== */
document.addEventListener("DOMContentLoaded", () => {

  const inputFactura = $("inputFactura");
  const btnProcesarFactura = $("btnProcesarFactura");

  if (!inputFactura || !btnProcesarFactura) return;

  btnProcesarFactura.addEventListener("click", () => {
    if (!inputFactura.files.length) {
      alert("Selecciona un archivo");
      return;
    }

    alert("Archivo detectado correctamente (base estable)");
    // Aquí se conecta XML / OCR (ya lo tenías funcionando)
  });
});
