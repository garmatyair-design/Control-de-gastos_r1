// js/ocr.js

// Inicializar OCR con Tesseract.js por CDN
// Asegúrate de tener en el HTML:
// <script src="https://cdn.jsdelivr.net/npm/tesseract.js@2/dist/tesseract.min.js"></script>

async function procesarImagenOCR(file, onProgress) {
    return new Promise((resolve, reject) => {
        if (!file) return reject("No se recibió archivo");

        Tesseract.recognize(
            file,
            'spa',
            {
                logger: m => {
                    if (onProgress) onProgress(m);
                }
            }
        ).then(result => {
            const texto = result.data.text;
            const monto = detectarMonto(texto);
            const fecha = detectarFecha(texto);
            resolve({ texto, monto, fecha });
        }).catch(err => reject(err));
    });
}

// Detecta montos dentro del texto OCR
function detectarMonto(texto) {
    const regexMonto = /(?:\$|\b)(\d{1,5}[.,]\d{2})/g;
    let coincidencias = [...texto.matchAll(regexMonto)];

    if (coincidencias.length === 0) return null;

    // Elegir el monto más alto (normalmente el total)
    let montos = coincidencias.map(m => parseFloat(m[1].replace(",", ".")));
    let max = Math.max(...montos);

    return max;
}

// Detecta una fecha (muy común en tickets)
function detectarFecha(texto) {
    const regexFecha = /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/;
    const match = texto.match(regexFecha);
    return match ? match[1] : null;
}

// Función para leer un archivo como DataURL
function fileToDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}
