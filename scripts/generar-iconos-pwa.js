// Genera assets/branding/icon-192.png e icon-512.png para el manifest de la
// PWA (Fase C5.2), partiendo siempre de assets/branding/emblem-dulceaura.png
// (el emblema oficial, no un PDF de catálogo — ver AGENT_WEB_DulceAura.md §3.1).
//
// El emblema tiene fondo transparente, que se ve mal como ícono de app (el
// sistema operativo le pone su propio fondo, inconsistente). Por eso este
// script compone el emblema sobre un cuadrado de fondo vino sólido (#8E1428)
// antes de exportar cada tamaño, con un margen del 12% para que no quede
// pegado al borde en launchers que recortan el ícono (maskable icons).
//
// Correr de nuevo si el emblema cambia: `node scripts/generar-iconos-pwa.js`
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets/branding/emblem-dulceaura.png');
const OUT_DIR = path.join(ROOT, 'assets/branding');
const VINO = '#8E1428';

// Empaqueta PNGs cuadrados en un .ico (formato "PNG-in-ICO", soportado por
// todos los navegadores modernos desde hace más de una década — no hace
// falta convertir a bitmap). Evita sumar una dependencia (se evaluó
// `to-ico` y trae una cadena de paquetes viejos con vulnerabilidades
// críticas/altas sin mantener — jimp/request/form-data/minimist — para
// resolver algo que son ~30 líneas de formato de archivo documentado).
function empaquetarIco(buffers) {
  const cantidad = buffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: 1 = ícono
  header.writeUInt16LE(cantidad, 4);

  let offset = 6 + cantidad * 16;
  const entradas = [];
  for (const { size, data } of buffers) {
    const entrada = Buffer.alloc(16);
    entrada.writeUInt8(size >= 256 ? 0 : size, 0); // 0 = 256px
    entrada.writeUInt8(size >= 256 ? 0 : size, 1);
    entrada.writeUInt8(0, 2); // paleta de color: 0 = sin paleta (PNG)
    entrada.writeUInt8(0, 3); // reservado
    entrada.writeUInt16LE(1, 4); // planes de color
    entrada.writeUInt16LE(32, 6); // bits por píxel
    entrada.writeUInt32LE(data.length, 8);
    entrada.writeUInt32LE(offset, 12);
    entradas.push(entrada);
    offset += data.length;
  }
  return Buffer.concat([header, ...entradas, ...buffers.map(b => b.data)]);
}

async function genIcon(page, fileUrl, size, outName) {
  await page.goto(fileUrl);
  const dataUrl = await page.evaluate(({ size, vino }) => {
    const img = document.images[0];
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = vino;
    ctx.fillRect(0, 0, size, size);
    const pad = size * 0.12;
    const box = size - pad * 2;
    const ratio = Math.min(box / img.naturalWidth, box / img.naturalHeight);
    const w = img.naturalWidth * ratio;
    const h = img.naturalHeight * ratio;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.drawImage(img, x, y, w, h);
    return c.toDataURL('image/png');
  }, { size, vino: VINO });
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(OUT_DIR, outName), Buffer.from(base64, 'base64'));
  console.log('Generado:', outName, size + 'x' + size);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Navegar directo al file:// (no usar <img src> en un documento about:blank:
  // Chromium bloquea cargar file:// como recurso de un documento que no es file://)
  const fileUrl = pathToFileURL(SRC).href;

  await genIcon(page, fileUrl, 192, 'icon-192.png');
  await genIcon(page, fileUrl, 512, 'icon-512.png');
  // Favicon del navegador (Fase G3): Google recomienda un ícono cuadrado de
  // al menos 48x48 enlazado con <link rel="icon">, e idealmente varias
  // resoluciones para que cada contexto (pestaña, barra de direcciones,
  // favoritos) pida la que mejor le calza.
  await genIcon(page, fileUrl, 16, 'icon-16.png');
  await genIcon(page, fileUrl, 32, 'icon-32.png');
  await genIcon(page, fileUrl, 48, 'icon-48.png');

  const ico = empaquetarIco(
    [16, 32, 48].map(size => ({ size, data: fs.readFileSync(path.join(OUT_DIR, `icon-${size}.png`)) }))
  );
  const icoPath = path.join(ROOT, 'favicon.ico');
  fs.writeFileSync(icoPath, ico);
  console.log('Generado: favicon.ico (16+32+48 empaquetados)');

  await browser.close();
})();
