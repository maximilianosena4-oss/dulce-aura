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

  await browser.close();
})();
