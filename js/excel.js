// js/excel.js

// Usa SheetJS desde CDN:
// <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>

function exportarReporteAExcel(nombreArchivo, datos, totales) {
    const filas = [];

    // Encabezados
    filas.push([
        "Categoría",
        "Descripción",
        "Fecha",
        "Monto",
        "Propina",
        "Total Final"
    ]);

    // Agregar datos
    datos.forEach(item => {
        filas.push([
            item.categoria,
            item.descripcion || "",
            item.fecha || "",
            item.monto || 0,
            item.propina || 0,
            (item.monto + (item.propina || 0))
        ]);
    });

    // Totales
    filas.push([]);
    filas.push(["TOTAL COMPROBADO", totales.totalComprobado]);
    filas.push(["MONTO ASIGNADO", totales.montoAsignado]);
    filas.push(["REMANENTE", totales.remanente]);
    filas.push(["REEMBOLSO", totales.reembolso]);

    const hoja = XLSX.utils.aoa_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Reporte");

    XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

function exportarDashboardExcel(nombreArchivo, resumen, categorias) {
    const filas = [];

    filas.push(["Dashboard de Gastos"]);
    filas.push([]);
    
    filas.push(["Total Mensual", resumen.totalMensual]);
    filas.push(["Categoría Más Alta", resumen.categoriaMayor]);
    filas.push(["Reportes del Mes", resumen.reportesMes]);
    filas.push([]);

    filas.push(["Categoría", "Total"]);
    categorias.forEach(c => {
        filas.push([c.nombre, c.total]);
    });

    const hoja = XLSX.utils.aoa_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Dashboard");

    XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}
