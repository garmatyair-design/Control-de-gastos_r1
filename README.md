# Gastos App — Comprobación de Gastos (Supabase + OCR)
Proyecto estático + integración cliente con Supabase (Auth, Postgres, Storage) y OCR (Tesseract.js).
## Contenido
- index.html (login)
- dashboard.html
- reporte.html (crear/editar reporte)
- historial.html
- styles.css
- main.js
## Instrucciones rápidas
1. Crear proyecto en Supabase y ejecutar SQL (ver conversacion).
2. Crear bucket 'comprobantes' en Storage.
3. Configurar variables de entorno en Vercel:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
4. Subir estos archivos a GitHub y desplegar en Vercel.
5. Nota: Tesseract.js se carga por CDN.
