// Genera variantes WebP/AVIF en varios anchos para el hero y las placas de
// Novedades (C7.1 — reduce el sobre-servicio de resolución detectado por
// Lighthouse: "Improve image delivery"). No modifica los .jpg originales
// del hero (siguen siendo el fallback más grande). Para Novedades sí
// reemplaza el .jpg original por una versión redimensionada al tamaño
// máximo realmente renderizado, porque ese .jpg es el único fallback y
// hoy se sirve a resolución completa del proveedor sin necesidad.
"use strict";

const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const RAIZ = path.join(__dirname, "..");

const HERO = [
  {
    origen: path.join(RAIZ, "assets/hero/hero-desktop.jpg"),
    base: "hero-desktop",
    dir: path.join(RAIZ, "assets/hero"),
    anchos: [1280, 1920], // 2560 ya existe (hero-desktop.jpg/.webp)
  },
  {
    origen: path.join(RAIZ, "assets/hero/hero-mobile.jpg"),
    base: "hero-mobile",
    dir: path.join(RAIZ, "assets/hero"),
    anchos: [640, 960], // 1290 ya existe (hero-mobile.jpg/.webp)
  },
];

const NOVEDADES_DIR = path.join(RAIZ, "assets/novedades");
const NOVEDADES_ALTURAS = [480, 780, 1040]; // alto objetivo en px, ancho se calcula por aspect ratio

async function generarHero() {
  for (const item of HERO) {
    for (const ancho of item.anchos) {
      const destWebp = path.join(item.dir, `${item.base}-${ancho}w.webp`);
      const destAvif = path.join(item.dir, `${item.base}-${ancho}w.avif`);
      await sharp(item.origen).resize({ width: ancho }).webp({ quality: 75 }).toFile(destWebp);
      await sharp(item.origen).resize({ width: ancho }).avif({ quality: 50 }).toFile(destAvif);
      console.log(`hero: ${path.basename(destWebp)}, ${path.basename(destAvif)}`);
    }
  }
  // AVIF del tamaño más grande existente, que hoy solo tiene JPG/WebP
  for (const item of HERO) {
    const destAvif = path.join(item.dir, `${item.base}.avif`);
    await sharp(item.origen).avif({ quality: 50 }).toFile(destAvif);
    console.log(`hero: ${path.basename(destAvif)} (tamaño completo)`);
  }
}

async function generarNovedades() {
  const archivos = fs.readdirSync(NOVEDADES_DIR).filter((f) => f.endsWith(".jpg"));
  for (const archivo of archivos) {
    const base = archivo.replace(/\.jpg$/, "");
    const origen = path.join(NOVEDADES_DIR, archivo);
    const metadata = await sharp(origen).metadata();
    const alturaMaxima = Math.max(...NOVEDADES_ALTURAS);

    for (const altura of NOVEDADES_ALTURAS) {
      const destWebp = path.join(NOVEDADES_DIR, `${base}-${altura}h.webp`);
      const destAvif = path.join(NOVEDADES_DIR, `${base}-${altura}h.avif`);
      await sharp(origen).resize({ height: altura }).webp({ quality: 78 }).toFile(destWebp);
      await sharp(origen).resize({ height: altura }).avif({ quality: 52 }).toFile(destAvif);
    }

    // Fallback JPG: si el original ya es más chico que el tamaño máximo
    // necesario, se deja igual; si es más grande, se reduce in situ.
    if (metadata.height > alturaMaxima) {
      const tmp = origen + ".tmp";
      await sharp(origen).resize({ height: alturaMaxima }).jpeg({ quality: 82, mozjpeg: true }).toFile(tmp);
      fs.renameSync(tmp, origen);
      console.log(`novedades: ${archivo} → fallback JPG reducido a ${alturaMaxima}h`);
    } else {
      console.log(`novedades: ${archivo} → fallback JPG sin cambios (ya es ≤ ${alturaMaxima}h)`);
    }
  }
}

(async () => {
  await generarHero();
  await generarNovedades();
  console.log("Listo.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
