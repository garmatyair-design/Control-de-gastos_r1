// js/excel.js
// Requiere SheetJS (XLSX) cargado en el HTML (CDN).

function exportarReporteAExcel(nombreArchivo, datos, totales) {
    const filas = [];
    filas.push(["Fecha","Concepto","Categoría","Monto base","Propina","Total","Tipo","Archivo"]);
    (datos||[]).forEach(item => {
        filas.push([ item.fecha || "", item.descripcion || item.concepto || "", item.categoria || "", item.monto || 0, item.propina || 0, (item.total || item.monto || 0), item.tipo || "", item.storage_path || "" ]);
    });
    filas.push([]);
    filas.push(["Reporte", totales.reporte || ""]);
    filas.push(["Monto asignado", totales.montoAsignado || 0]);
    filas.push(["Total gastado", totales.totalComprobado || 0]);
    filas.push(["Resultado", totales.resultado || 0]);
    const ws = XLSX.utils.aoa_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

function exportarDashboardExcel(nombreArchivo, resumen, categorias) {
    const filas = [];
    filas.push(["Dashboard de Gastos"]);
    filas.push([]);
    filas.push(["Total Mensual", resumen.totalMensual || 0]);
    filas.push(["Categoría Más Alta", resumen.categoriaMayor || ""]);
    filas.push([]);
    filas.push(["Categoría","Total"]);
    (categorias || []).forEach(c => filas.push([c.nombre, c.total]));
    const ws = XLSX.utils.aoa_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard");
    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}
