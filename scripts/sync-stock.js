/**
 * sync-stock.js
 * Scrapea África Mía y actualiza catalogo/stock.json
 * con el stock real de cada producto AM.
 *
 * Uso:
 *   node scripts/sync-stock.js
 *
 * Requiere:
 *   npm install node-fetch@2 cheerio
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ── dependencias ──────────────────────────────────────────────────────────────
let fetch, cheerio;
try {
  fetch   = require("node-fetch");
  cheerio = require("cheerio");
} catch {
  console.error("Faltan dependencias. Ejecutá: npm install node-fetch@2 cheerio");
  process.exit(1);
}

// ── constantes ────────────────────────────────────────────────────────────────
const BASE_URL      = "https://africamiajeans-mayorista.com/productos";
const PRODUCTOS_JSON = path.join(__dirname, "../catalogo/productos.json");
const STOCK_JSON     = path.join(__dirname, "../catalogo/stock.json");
const PAUSA_MS       = 600;   // ms entre requests (no saturar el servidor)
const TIMEOUT_MS     = 20000;
const REINTENTOS     = 3;

// AM1141/1142/1143 (SIWA) no existen en África Mía → stock null siempre
const SIN_PROVEEDOR = new Set(["AM1141", "AM1142", "AM1143"]);

// ── helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchHtml(url) {
  for (let intento = 1; intento <= REINTENTOS; intento++) {
    try {
      const res = await fetch(url, {
        timeout: TIMEOUT_MS,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DulceAuraSyncBot/1.0)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (intento === REINTENTOS) throw err;
      console.warn(`  ↺ intento ${intento}/${REINTENTOS} para ${url}: ${err.message}`);
      await sleep(2000);
    }
  }
}

/**
 * Extrae el stock de una ficha de producto de África Mía.
 * Fuente primaria: JSON-LD inventoryLevel.value
 * Fuente secundaria: texto visible ("Sin stock" → 0)
 * Devuelve number | null (null = no se pudo determinar)
 */
function extraerStock(html) {
  const $ = cheerio.load(html);

  // ── JSON-LD ──────────────────────────────────────────────────────────────
  let stockLd = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      const nivel = data?.offers?.inventoryLevel?.value;
      if (nivel !== undefined) stockLd = parseInt(nivel, 10);
    } catch { /* ignorar JSON malformado */ }
  });
  if (stockLd !== null && !isNaN(stockLd)) return stockLd;

  // ── texto visible ("Sin stock" / "X en stock") ────────────────────────────
  const texto = $("body").text();
  if (/sin stock/i.test(texto)) return 0;
  const m = texto.match(/Solo quedan (\d+) en stock/i)
         || texto.match(/(\d+) en stock/i);
  if (m) return parseInt(m[1], 10);

  return null; // sin dato
}

// ── lógica principal ──────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  sync-stock.js — Dulce Aura Style");
  console.log("  " + new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }));
  console.log("═══════════════════════════════════════════════\n");

  // ── Cargar productos.json ────────────────────────────────────────────────
  const productos = JSON.parse(fs.readFileSync(PRODUCTOS_JSON, "utf8").replace(/^﻿/, "")).productos;
  console.log(`Productos en catálogo: ${productos.length}\n`);

  // ── Cargar stock.json anterior (para no pisar en caso de error de red) ───
  let stockAnterior = {};
  if (fs.existsSync(STOCK_JSON)) {
    try { stockAnterior = JSON.parse(fs.readFileSync(STOCK_JSON, "utf8")); }
    catch { console.warn("Advertencia: stock.json anterior no se pudo leer, se ignora."); }
  }

  const resultado = {};
  const ahora = new Date().toISOString();
  let ok = 0, errores = 0, sinProveedor = 0;

  for (let i = 0; i < productos.length; i++) {
    const p = productos[i];
    const { codigo, ref } = p;

    // ── Productos sin slug en África Mía ────────────────────────────────────
    if (SIN_PROVEEDOR.has(codigo)) {
      resultado[codigo] = { stock: null, proveedor: "africa-mia", actualizado: ahora, nota: "sin-url-proveedor" };
      sinProveedor++;
      process.stdout.write(`[${i+1}/${productos.length}] ${codigo} — sin proveedor (null)\n`);
      continue;
    }

    const url = `${BASE_URL}/${ref}/`;
    process.stdout.write(`[${i+1}/${productos.length}] ${codigo} (${ref}) ... `);

    try {
      const html  = await fetchHtml(url);
      const stock = extraerStock(html);
      resultado[codigo] = { stock, proveedor: "africa-mia", actualizado: ahora };
      process.stdout.write(`stock=${stock !== null ? stock : "null"}\n`);
      ok++;
    } catch (err) {
      const es404 = err.message.includes("404");
      if (es404) {
        // Producto eliminado del proveedor → agotado permanente hasta que reaparezca
        process.stdout.write(`AGOTADO (404)\n`);
        resultado[codigo] = { stock: 0, proveedor: "africa-mia", actualizado: ahora, nota: "url-404" };
        ok++; // no cuenta como error de red
      } else {
        process.stdout.write(`ERROR: ${err.message}\n`);
        // Error de red/servidor → conservar stock anterior para no poner todo en 0
        if (stockAnterior[codigo]) {
          resultado[codigo] = { ...stockAnterior[codigo], error_ultimo: err.message };
          console.warn(`  ↪ Usando stock anterior: ${stockAnterior[codigo].stock}`);
        } else {
          resultado[codigo] = { stock: null, proveedor: "africa-mia", actualizado: ahora, error_ultimo: err.message };
        }
        errores++;
      }
    }

    await sleep(PAUSA_MS);
  }

  // ── Escribir stock.json ──────────────────────────────────────────────────
  const salida = {
    _meta: {
      actualizado: ahora,
      total: productos.length,
      ok,
      errores,
      sin_proveedor: sinProveedor,
    },
    ...resultado,
  };
  fs.writeFileSync(STOCK_JSON, JSON.stringify(salida, null, 2), "utf8");

  // ── Resumen ──────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log(`  OK:           ${ok}`);
  console.log(`  Errores:      ${errores}`);
  console.log(`  Sin proveedor:${sinProveedor} (SIWA, stock null)`);
  console.log(`  Archivo:      catalogo/stock.json`);
  console.log("═══════════════════════════════════════════════\n");

  if (errores > 0) {
    console.warn(`⚠ ${errores} producto(s) con error — se conservó stock anterior donde existía.`);
    process.exit(1); // señal para GitHub Actions de que hubo fallos
  }
}

main().catch(err => {
  console.error("Error fatal:", err);
  process.exit(1);
});
