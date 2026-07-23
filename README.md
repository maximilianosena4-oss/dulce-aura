# Dulce Aura Style — Catálogo web con sincronización de stock automática

Catálogo web para una tienda de ropa por mayor/menor, con un script que
mantiene el stock actualizado sin carga manual.

## Qué hace

- Sitio estático (`index.html`) con el catálogo de productos.
- `scripts/sync-stock.js`: scrapea el sitio del proveedor mayorista y actualiza
  `catalogo/stock.json` con la disponibilidad real de cada producto, con
  reintentos y pausa entre requests para no saturar el servidor del proveedor.
- Deploy en Netlify (`netlify.toml`), con headers de seguridad básicos
  (`X-Frame-Options`, `X-Content-Type-Options`).

## Stack

HTML/CSS/JS estático + Node.js (script de sincronización, con `cheerio` y
`node-fetch`).

## Cómo correrlo

```bash
npm install
node scripts/sync-stock.js
```

El sitio en sí no requiere build: es HTML estático servido directo.

## Estado del proyecto

Sitio en producción para un cliente real. El script de sincronización de stock
se corre manualmente (no hay automatización programada verificada en el
repositorio).
