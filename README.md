# Dulce Aura Style — Catálogo Web

Catálogo web de una tienda de indumentaria femenina en producción en Zona Sur GBA (Argentina).

**Sitio en vivo:** https://dulceaura.netlify.app/

---

## Qué es

Un catálogo estático optimizado para conversión por WhatsApp. La clienta navega, se enamora de una prenda y llega al chat con el pedido armado: el CTA de cada producto genera un mensaje de WhatsApp prellenado con código, nombre y talle.

El cierre de venta no ocurre en la web — ocurre en el chat. Todo lo que se construyó acá está al servicio de ese objetivo.

---

## Stack técnico

- **HTML/CSS/JS puro** — sin framework, sin build, sin dependencias del lado del cliente
- **Netlify** para deploy continuo desde `main`
- **JSON estático** como capa de datos (`data/productos.json`)

### Por qué sin framework

El sitio tiene que cargar rápido en dispositivos de gama media con conexión móvil. Sin bundle, sin JS de framework, sin hidratación: el HTML llega listo. El catálogo de 81+ productos carga con una sola request de 120 KB de JSON.

---

## Decisiones de arquitectura

**Un solo JSON como fuente de datos**

`data/productos.json` contiene el catálogo completo. El JS del catálogo lo lee una vez y construye todas las cards, filtros y popups en memoria. No hay llamadas a APIs, no hay base de datos.

**Popup de producto sin librería**

El popup de ficha de producto (fotos, talles, descripción, CTA) está implementado en vanilla JS con scroll snap para el carrusel de fotos. Evita ~30 KB de dependencia por algo que se resuelve en ~60 líneas.

**Meta Pixel directo en el HTML**

El pixel de seguimiento está hardcodeado en el `<head>` en lugar de cargarse como dependencia. Carga sincrónicamente con la página y no bloquea el render.

**Reproducción de música con detección de interacción**

El reproductor de audio espera el primer `touchstart` o `click` del usuario antes de intentar reproducir, para evitar el bloqueo de autoplay de los browsers móviles.

---

## Estructura del repositorio

```
data/               → capa de datos (productos, destacados, novedades, copy)
assets/             → fotos de productos, hero, novedades y branding
img/                → imágenes del home (portada, carrusel de looks)
scripts/            → validador de datos (node scripts/validar-datos.js)
index.html          → home del sitio — catálogo, carrito y todo lo demás
netlify.toml        → configuración de deploy y headers de seguridad
```

---

## Deploy

Netlify detecta el push a `main` y publica automáticamente. No hay paso de build. El directorio de publicación es la raíz del repo (`publish = "."`).

Headers de seguridad configurados en `netlify.toml`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
