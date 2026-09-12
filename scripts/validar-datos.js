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
const NOVEDADES_PATH = path.join(ROOT, "data", "novedades.json");
const NOVEDADES_DIR = path.join(ROOT, "assets", "novedades");
const DESTACADOS_PATH = path.join(ROOT, "data", "destacados.json");

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

  validarNovedades();
  validarDestacados(productos);

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

function validarNovedades() {
  console.log("\n--- Novedades (data/novedades.json) ---");

  // 1. Archivo existe y es JSON válido
  if (!fs.existsSync(NOVEDADES_PATH)) {
    fallar("novedades.json: el archivo no existe en data/");
    console.log("novedades.json: NO EXISTE");
    return;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(NOVEDADES_PATH, "utf8"));
  } catch (e) {
    fallar(`novedades.json: JSON inválido (${e.message})`);
    console.log("novedades.json: JSON INVÁLIDO");
    return;
  }
  const placas = Array.isArray(data.placas) ? data.placas : null;
  if (!placas) {
    fallar("novedades.json: falta el array \"placas\"");
    console.log("novedades.json: sin array \"placas\"");
    return;
  }
  console.log(`Total de placas: ${placas.length}`);

  // 2. Cada placa tiene id, imagen, alt y mensaje_wa no vacíos
  const camposFaltantes = [];
  placas.forEach((p, i) => {
    ["id", "imagen", "alt", "mensaje_wa"].forEach(campo => {
      if (!p[campo] || !String(p[campo]).trim()) {
        camposFaltantes.push(`placa #${i} (${p.id || "sin id"}): falta "${campo}"`);
      }
    });
  });
  if (camposFaltantes.length > 0) fallar(`Placas con campos vacíos: ${camposFaltantes.join(" | ")}`);
  console.log(`Placas con campos vacíos: ${camposFaltantes.length}`);

  // 4. Sin ids duplicados
  const ids = placas.map(p => p.id).filter(Boolean);
  const idsUnicos = new Set(ids);
  if (idsUnicos.size !== ids.length) {
    const idsCount = {};
    ids.forEach(id => { idsCount[id] = (idsCount[id] || 0) + 1; });
    const dup = Object.entries(idsCount).filter(([, n]) => n > 1).map(([id]) => id);
    fallar(`Ids duplicados en novedades.json: ${dup.join(", ")}`);
  }
  console.log(`Ids únicos: ${idsUnicos.size} de ${ids.length}`);

  // 3. Cada imagen referenciada existe en assets/novedades/
  const referenciadas = new Set();
  const faltantes = [];
  placas.forEach(p => {
    if (!p.imagen) return;
    referenciadas.add(p.imagen);
    if (!fs.existsSync(path.join(NOVEDADES_DIR, p.imagen))) {
      faltantes.push(`${p.id || "sin id"}: ${p.imagen}`);
    }
  });
  if (faltantes.length > 0) fallar(`Novedades — imágenes referenciadas que faltan en disco: ${faltantes.join(", ")}`);
  console.log(`Imágenes referenciadas que faltan en disco: ${faltantes.length}`);

  // 5. Imágenes en assets/novedades/ que ninguna placa usa
  let archivosEnDisco = [];
  if (fs.existsSync(NOVEDADES_DIR)) {
    archivosEnDisco = fs.readdirSync(NOVEDADES_DIR).filter(f => !f.startsWith("."));
  }
  const huerfanas = archivosEnDisco.filter(f => !referenciadas.has(f));
  if (huerfanas.length > 0) {
    console.log(`⚠️  Imágenes en assets/novedades/ sin usar en novedades.json (${huerfanas.length}): ${huerfanas.join(", ")}`);
  } else {
    console.log("Imágenes sin usar en assets/novedades/: 0");
  }
}

function validarDestacados(productos) {
  console.log("\n--- Destacados del carrusel (data/destacados.json) ---");

  // 1. Archivo existe y es JSON válido
  if (!fs.existsSync(DESTACADOS_PATH)) {
    fallar("destacados.json: el archivo no existe en data/");
    console.log("destacados.json: NO EXISTE");
    return;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DESTACADOS_PATH, "utf8"));
  } catch (e) {
    fallar(`destacados.json: JSON inválido (${e.message})`);
    console.log("destacados.json: JSON INVÁLIDO");
    return;
  }
  const codigos = Array.isArray(data.codigos) ? data.codigos : null;
  if (!codigos) {
    fallar("destacados.json: falta el array \"codigos\"");
    console.log("destacados.json: sin array \"codigos\"");
    return;
  }
  console.log(`Total de códigos: ${codigos.length}`);

  // 2. Entre 1 y 24 códigos
  if (codigos.length < 1 || codigos.length > 24) {
    fallar(`destacados.json: debe tener entre 1 y 24 códigos (tiene ${codigos.length})`);
  }

  // 4. Sin códigos repetidos
  const codigosUnicos = new Set(codigos);
  if (codigosUnicos.size !== codigos.length) {
    const conteo = {};
    codigos.forEach(c => { conteo[c] = (conteo[c] || 0) + 1; });
    const repetidos = Object.entries(conteo).filter(([, n]) => n > 1).map(([c]) => c);
    fallar(`destacados.json: códigos repetidos: ${repetidos.join(", ")}`);
  }
  console.log(`Códigos únicos: ${codigosUnicos.size} de ${codigos.length}`);

  // 3. Todos los códigos existen en productos.json
  const porCodigo = new Map(productos.map(p => [p.codigo, p]));
  const inexistentes = codigos.filter(c => !porCodigo.has(c));
  if (inexistentes.length > 0) {
    fallar(`destacados.json: códigos que no existen en productos.json: ${inexistentes.join(", ")}`);
  }
  console.log(`Códigos que no existen en productos.json: ${inexistentes.length}`);

  // 5. Todos los destacados tienen al menos 1 foto
  const sinFotos = codigos
    .filter(c => porCodigo.has(c))
    .filter(c => !porCodigo.get(c).fotos || porCodigo.get(c).fotos.length === 0);
  if (sinFotos.length > 0) {
    fallar(`destacados.json: códigos sin fotos: ${sinFotos.join(", ")}`);
  }
  console.log(`Destacados sin fotos: ${sinFotos.length}`);
}

main();
