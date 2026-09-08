#!/usr/bin/env node
/**
 * Validador de data/productos.json — Dulce Aura Style.
 * Ejecutable por CI: exit 0 si todo pasa, exit 1 si algo falla.
 * Fotos referenciadas en el campo "fotos" son nombres de archivo pelados
 * (sin ruta) que se resuelven contra assets/productos/.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PRODUCTOS_PATH = path.join(ROOT, "data", "productos.json");
const FOTOS_DIR = path.join(ROOT, "assets", "productos");

let ok = true;
const fallos = [];

function fallar(msg) {
  ok = false;
  fallos.push(msg);
}

function main() {
  if (!fs.existsSync(PRODUCTOS_PATH)) {
    console.error(`ERROR: no existe ${PRODUCTOS_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(PRODUCTOS_PATH, "utf8");
  const data = JSON.parse(raw);
  const productos = data.productos || [];
  const categoriasValidas = new Set((data.categorias || []).map(c => c.id));

  console.log(`Total de productos: ${productos.length}`);

  // 2. Códigos únicos
  const codigos = productos.map(p => p.codigo);
  const codigosUnicos = new Set(codigos);
  const duplicados = codigos.filter((c, i) => codigos.indexOf(c) !== i);
  if (codigosUnicos.size !== codigos.length) {
    fallar(`Códigos duplicados: ${[...new Set(duplicados)].join(", ")}`);
  }
  console.log(`Códigos únicos: ${codigosUnicos.size} de ${codigos.length}${codigosUnicos.size === codigos.length ? " (sin duplicados)" : ""}`);

  // 3. Ningún producto sin fotos
  const sinFotos = productos.filter(p => !p.fotos || p.fotos.length === 0);
  if (sinFotos.length > 0) fallar(`Productos sin fotos: ${sinFotos.map(p => p.codigo).join(", ")}`);
  console.log(`Productos sin fotos: ${sinFotos.length}`);

  // 4. Ningún producto sin descripción
  const sinDescripcion = productos.filter(p => !p.descripcion || !p.descripcion.trim());
  if (sinDescripcion.length > 0) fallar(`Productos sin descripción: ${sinDescripcion.map(p => p.codigo).join(", ")}`);
  console.log(`Productos sin descripción: ${sinDescripcion.length}`);

  // 5. Cero descripciones repetidas
  const descripciones = productos.map(p => p.descripcion);
  const descripcionesCount = {};
  descripciones.forEach(d => { descripcionesCount[d] = (descripcionesCount[d] || 0) + 1; });
  const descripcionesRepetidas = Object.entries(descripcionesCount).filter(([, n]) => n > 1);
  if (descripcionesRepetidas.length > 0) {
    fallar(`Descripciones repetidas: ${descripcionesRepetidas.map(([d, n]) => `"${d}" (x${n})`).join(", ")}`);
  }
  console.log(`Descripciones repetidas: ${descripcionesRepetidas.length}`);

  // 6. Precios múltiplos de 500
  const preciosInvalidos = [];
  productos.forEach(p => {
    [p.precio_1, p.precio_2].forEach(precio => {
      if (precio != null && precio % 500 !== 0) {
        preciosInvalidos.push(`${p.codigo}: ${precio}`);
      }
    });
  });
  if (preciosInvalidos.length > 0) fallar(`Precios no múltiplos de 500: ${preciosInvalidos.join(", ")}`);
  console.log(`Precios no múltiplos de 500: ${preciosInvalidos.length}`);

  // 7. Todas las fotos referenciadas existen en disco
  const fotosReferenciadas = [];
  const fotosFaltantes = [];
  productos.forEach(p => {
    (p.fotos || []).forEach(foto => {
      fotosReferenciadas.push(foto);
      const fotoPath = path.join(FOTOS_DIR, foto);
      if (!fs.existsSync(fotoPath)) fotosFaltantes.push(`${p.codigo}: ${foto}`);
    });
  });
  if (fotosFaltantes.length > 0) fallar(`Fotos referenciadas que faltan en disco: ${fotosFaltantes.join(", ")}`);
  console.log(`Fotos referenciadas: ${fotosReferenciadas.length}`);
  console.log(`Fotos faltantes en disco: ${fotosFaltantes.length}`);

  // 8. Cero fotos huérfanas
  let archivosEnDisco = [];
  if (fs.existsSync(FOTOS_DIR)) {
    archivosEnDisco = fs.readdirSync(FOTOS_DIR).filter(f => !f.startsWith("."));
  }
  const setReferenciadas = new Set(fotosReferenciadas);
  const huerfanas = archivosEnDisco.filter(f => !setReferenciadas.has(f));
  if (huerfanas.length > 0) fallar(`Fotos huérfanas en assets/productos/: ${huerfanas.join(", ")}`);
  console.log(`Fotos huérfanas: ${huerfanas.length}`);

  // 9. Todas las categorías existen en meta.categorias
  const categoriasInvalidas = productos.filter(p => !categoriasValidas.has(p.categoria));
  if (categoriasInvalidas.length > 0) {
    fallar(`Productos con categoría inválida: ${categoriasInvalidas.map(p => `${p.codigo}:${p.categoria}`).join(", ")}`);
  }
  console.log(`Productos con categoría inválida: ${categoriasInvalidas.length}`);

  // Distribución de fotos por producto (informativo)
  const distribucion = {};
  productos.forEach(p => {
    const n = (p.fotos || []).length;
    distribucion[n] = (distribucion[n] || 0) + 1;
  });
  console.log("Distribución de fotos por producto:");
  Object.keys(distribucion).sort((a, b) => b - a).forEach(n => {
    console.log(`  ${n} foto${n === "1" ? "" : "s"} → ${distribucion[n]} productos`);
  });

  // Casos límite (informativo)
  const consultarCount = productos.filter(p => p.consultar === true).length;
  const promoCount = productos.filter(p => p.promo === true).length;
  const sinPlanillaCount = productos.filter(p => p.sin_planilla_colores === true).length;
  console.log("Casos límite en los datos:");
  console.log(`  consultar: true .............. ${consultarCount} productos`);
  console.log(`  promo: true .................. ${promoCount} productos`);
  console.log(`  sin_planilla_colores: true ... ${sinPlanillaCount} productos`);

  console.log("");
  if (ok) {
    console.log("✅ Validación OK — todos los checks pasaron.");
    process.exit(0);
  } else {
    console.error("❌ Validación FALLIDA:");
    fallos.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  }
}

main();
