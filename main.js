// main.js
const lista = document.getElementById('listaReportes');

async function cargarReportes() {
  const { data, error } = await supabase
    .from('reportes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return console.error(error);

  lista.innerHTML = '';
  data.forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="reporte.html?id=${r.id}">${r.nombre}</a>`;
    lista.appendChild(li);
  });
}

if (lista) {
  cargarReportes();

  document.getElementById('crearReporte').onclick = async () => {
    await supabase.from('reportes').insert({
      nombre: nombreReporte.value,
      monto_viaticos: montoViaticos.value
    });

    nombreReporte.value = '';
    montoViaticos.value = '';
    cargarReportes();
  };
}
