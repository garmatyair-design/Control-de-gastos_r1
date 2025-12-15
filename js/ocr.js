// js/ocr.js
async function leerComprobante(file) {
  if (file.name.endsWith('.xml')) {
    return leerXML(file);
  }

  const worker = await Tesseract.createWorker('spa');
  const { data } = await worker.recognize(file);
  await worker.terminate();

  return extraerTexto(data.text);
}

function leerXML(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const xml = new DOMParser().parseFromString(reader.result, 'text/xml');
      const comprobante = xml.getElementsByTagName('cfdi:Comprobante')[0];
      const emisor = xml.getElementsByTagName('cfdi:Emisor')[0];

      resolve({
        fecha: comprobante?.getAttribute('Fecha') || '',
        proveedor: emisor?.getAttribute('Nombre') || '',
        total: comprobante?.getAttribute('Total') || '',
        categoria: detectarCategoria(
          (emisor?.getAttribute('Nombre') || '').toLowerCase()
        )
      });
    };
    reader.readAsText(file);
  });
}

function extraerTexto(texto) {
  texto = texto.toLowerCase();
  return {
    fecha: '',
    proveedor: '',
    total: 0,
    categoria: detectarCategoria(texto)
  };
}

function detectarCategoria(texto) {
  if (texto.includes('hotel')) return 'Hospedaje';
  if (texto.includes('restaurante')) return 'Alimentos';
  if (texto.includes('caseta')) return 'Casetas';
  if (texto.includes('uber') || texto.includes('taxi')) return 'Transporte';
  return 'Gastos varios';
}
