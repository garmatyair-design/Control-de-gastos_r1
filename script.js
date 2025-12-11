// LOGIN
document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");

    if (loginBtn) {
        loginBtn.onclick = () => {
            window.location.href = "jdashboard.html";
        };
    }

    const procesarBtn = document.getElementById("procesarTicket");
    if (procesarBtn) procesarBtn.onclick = procesarOCR;
});


// ---- OCR con Tesseract.js ----

async function procesarOCR() {
    const fileInput = document.getElementById("ticketInput");
    const output = document.getElementById("ocrResultado");

    if (!fileInput.files.length) {
        output.textContent = "Selecciona una imagen.";
        return;
    }

    output.textContent = "Procesando OCR...";

    const file = fileInput.files[0];

    try {
        const { data } = await Tesseract.recognize(file, 'spa', {
            logger: m => console.log(m)
        });

        output.textContent = data.text;

    } catch (err) {
        output.textContent = "Error en OCR: " + err;
    }
}
