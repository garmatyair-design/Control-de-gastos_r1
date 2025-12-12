// js/ocr.js
// Requiere Tesseract.js (CDN en HTML).
// Función pública: procesarImagenOCR(file, onProgress) -> {texto,monto,fecha}

async function procesarImagenOCR(file, onProgress) {
    if (!file) throw new Error("No se recibió archivo");
    const { createWorker } = Tesseract;
    const worker = createWorker({
        logger: m => { if(onProgress) onProgress(m); }
    });
    await worker.load();
    await worker.loadLanguage('spa');
    await worker.initialize('spa');
    const result = await worker.recognize(file);
    await worker.terminate();
    const texto = result?.data?.text || "";
    const monto = detectarMonto(texto);
    const fecha = detectarFecha(texto);
    return { texto, monto, fecha };
}

function detectarMonto(texto) {
    if(!texto) return null;
    const regex = /(?:\$|\b)(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g;
    let m; const matches = [];
    while((m = regex.exec(texto)) !== null) matches.push(m[1]);
    if(matches.length === 0) return null;
    const nums = matches.map(s => {
        const lastComma = s.lastIndexOf(',');
        const lastDot = s.lastIndexOf('.');
        let norm = s;
        if(lastComma > lastDot) norm = s.replace(/\./g,'').replace(/,/g,'.');
        else if(lastDot > lastComma) norm = s.replace(/,/g,'');
        else norm = s.replace(/,/g,'.');
        const val = parseFloat(norm);
        return isNaN(val) ? null : val;
    }).filter(x => x != null);
    if(nums.length === 0) return null;
    return Math.max(...nums);
}

function detectarFecha(texto) {
    if(!texto) return null;
    const regex = /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/;
    const m = texto.match(regex);
    return m ? m[1] : null;
}
