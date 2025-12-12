// js/ocr.js
// Requiere Tesseract.js cargado en el HTML (CDN).
// Funciones públicas: procesarImagenOCR(fileOrCanvas, onProgress) -> {texto,monto,fecha}

async function procesarImagenOCR(source, onProgress) {
    // source: File | HTMLCanvasElement
    const { createWorker } = Tesseract;
    const worker = createWorker({
        logger: m => { if(onProgress) onProgress(m); }
    });
    await worker.load();
    await worker.loadLanguage('spa');
    await worker.initialize('spa');

    let result;
    if(source instanceof HTMLCanvasElement){
        result = await worker.recognize(source);
    } else {
        result = await worker.recognize(source);
    }

    await worker.terminate();
    const texto = result?.data?.text || "";
    const monto = detectarMonto(texto);
    const fecha = detectarFecha(texto);
    return { texto, monto, fecha };
}

function detectarMonto(texto) {
    if(!texto) return null;
    // busca patrones monetarios
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
    // escoge el mayor (suele ser el total)
    return Math.max(...nums);
}

function detectarFecha(texto) {
    if(!texto) return null;
    const regex = /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/;
    const m = texto.match(regex);
    return m ? m[1] : null;
}

// wrapper para usar en main.js
async function ocrExtractAmountFromImageFile(file){
    try{
        if(!file) return null;
        // si es canvas (ya procesado) o File
        const res = await procesarImagenOCR(file, (m) => {
            // simple progress log; main.js puede leer #ocrStatus
            // caller decide cómo mostrar
        });
        return res?.monto || null;
    } catch(e){
        console.error("OCR generic error", e);
        return null;
    }
}
