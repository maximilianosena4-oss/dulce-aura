# PLAN DE EJECUCIÓN WEB — DETALLADO POR FASES

## Dulce Aura Style · Verano 2026/27

**Repo:** `maximilianosena4-oss/dulce-aura`
**Rama de trabajo:** `refactor/verano-2026-27`
**Gobernanza:** `AGENT_WEB_DulceAura.md` (leer antes de cada fase)

---

# REGLAS DE VERIFICACIÓN — APLICAN A TODAS LAS FASES

> Ninguna fase se cierra sin pasar su puerta de verificación.
> Estas reglas salen de 26 errores reales del proyecto del catálogo PDF.

## Las 5 reglas fijas

| # | Regla |
|---|---|
| **V1** | **Se verifica sobre el resultado final**, nunca sobre un componente aislado. Si es una web, se abre en el navegador |
| **V2** | **Nada se aprueba por muestreo.** Todas las vistas, todos los breakpoints |
| **V3** | **Cada caso condicional se prueba con un ejemplo real de cada caso.** No se asume que si el común anda, los demás también |
| **V4** | **Quien implementa no audita.** El QA corre en sesión separada |
| **V5** | **Toda corrección manual se blinda en la fuente**, no solo en el resultado |

## Breakpoints obligatorios en toda verificación visual
- **Mobile:** 375px (la mayoría de las clientas)
- **Tablet:** 768px
- **Desktop:** 1440px

## Casos límite obligatorios (los que rompieron el PDF)
- Producto con **1 foto** vs con **3 fotos**
- Producto **con grilla de colores** vs **sin grilla**
- Producto **con precio** vs **"Consultar"**
- Producto **con promo** vs sin promo
- Búsqueda **con resultados** vs **sin resultados**
- Carrito **vacío** vs **con items**

## Formato de cierre de cada fase
Al terminar, Claude Code debe entregar:
```
FASE X — CIERRE
✅ Objetivos cumplidos: [lista]
🔍 Verificación ejecutada: [qué se probó y con qué resultado]
⚠️  Hallazgos: [lo que encontró y no estaba previsto]
❌ Pendientes: [lo que no pudo hacer y por qué]
📁 Archivos tocados: [lista]
```

---

# BLOQUE 0 · REPOSITORIO

## FASE 0.1 · Auditoría del historial y del estado real

**Objetivo:** saber qué hay realmente antes de dividir nada.

**Acciones**
1. Auditar los 101 commits buscando: tokens, claves de API, credenciales de
   Netlify, precios de costo, datos personales de clientas
2. Inventariar la estructura completa de archivos
3. Revisar `.github/workflows/` — qué workflows hay, cuándo corrieron por
   última vez, si están activos
4. Revisar `catalogo/stock.json` — fecha de última modificación, si contiene
   costos
5. Revisar `netlify.toml` — headers actuales
6. Auditar `package.json` por dependencias vulnerables

**Las 3 preguntas que esta fase DEBE responder**
1. ¿El workflow de sincronización corre o está muerto?
2. ¿El stock que muestra la web es real o histórico?
3. ¿Hay precios de costo o credenciales en el repo o en su historial?

**Puerta de verificación**
- [ ] Las 3 preguntas están respondidas con evidencia (fecha, archivo, línea)
- [ ] El listado de hallazgos de seguridad está completo
- [ ] No se modificó ningún archivo (esta fase es solo lectura)

**Entregable:** `AUDITORIA_REPO.md`
**⏸️ CHECKPOINT — Maxi revisa antes de la 0.2**

---

## FASE 0.2 · División del repositorio

**Objetivo:** repo público limpio para portfolio, privado para lo sensible.

**Acciones**
1. Crear repo privado `dulce-aura-tools`
2. Mover ahí: `scripts/sync-stock.js`, su `package.json`, cualquier script que
   toque al proveedor
3. En el público: eliminar esos archivos y toda mención al proveedor en README
4. Reescribir el README público como pieza de portfolio: qué es el proyecto,
   stack, decisiones técnicas — **sin nombrar al proveedor ni al scraper**
5. Si la auditoría encontró secretos en el historial: purgar o recrear el repo

**Puerta de verificación**
- [ ] El repo público no menciona al proveedor en ningún archivo
- [ ] `grep` de términos sensibles en todo el repo público: cero resultados
- [ ] Netlify sigue deployando correctamente
- [ ] El sitio en producción sigue funcionando igual

**⏸️ CHECKPOINT**

---

## FASE 0.3 · Rama de trabajo y entorno

**Acciones**
1. `git checkout -b refactor/verano-2026-27`
2. Copiar a la raíz: `AGENT_WEB_DulceAura.md`, `DATOS_WEB/`
3. Verificar que Netlify genere deploy preview de la rama
4. Levantar el sitio local y confirmar que funciona

**Puerta de verificación**
- [ ] La rama existe y `main` está intacta
- [ ] Deploy preview genera URL temporal
- [ ] El sitio local levanta sin errores de consola

---

# BLOQUE A · INVENTARIO (sin modificar código)

## FASE A1 · Auditoría del código existente

**Objetivo:** el mapa completo de qué hace cada cosa, antes de tocar nada.

**Acciones**
1. `index.html` — mapear cada sección, su HTML y su propósito
2. **Reproductor de música** — implementación, eventos, manejo del touch,
   cómo hace play/pause, de dónde sale el stream
3. **Carrusel** — propio o librería, cómo se alimenta, controles
4. **CSS** — variables de color, breakpoints, y marcar **qué reglas no se usan**
5. **JS** — cada función, qué hace, quién la llama, y **qué está muerto**
6. Dependencias externas (CDN, fuentes, librerías)
7. Meta Pixel — dónde está y si funciona

**Puerta de verificación**
- [ ] Cada función JS del sitio está documentada
- [ ] El código muerto está identificado con archivo y línea
- [ ] La música y el carrusel están documentados a nivel de "puedo reescribirlo
      sin romperlo"
- [ ] Cero archivos modificados

**Entregable:** `INVENTARIO_WEB.md`
**⏸️ CHECKPOINT**

---

## FASE A2 · Registrar el patrón del catálogo Alma Mía

**Objetivo:** capturar la implementación **antes de borrarla**.

**Acciones — documentar con código de referencia**

| Feature | Qué capturar |
|---|---|
| Buscador | lógica de match por nombre y por código, manejo de acentos |
| Filtros de categoría | estructura de botones, lógica de filtrado, estado activo |
| Filtro de talle | botones, cómo combina con categoría |
| Ordenamiento | los 4 modos y su implementación |
| Paginación | "Ver más prendas", contador "X de Y", carga incremental |
| Card — hover | cómo cambia a la segunda foto, precarga |
| Card — badges | RECIÉN LLEGADO, PROMO, ¡Últimas X unidades! |
| Card — precio tachado | anterior + promo |
| Popup | apertura, cierre (botón/ESC/click afuera), galería, talles, CTA |
| Cross-sell | cómo elige los relacionados |
| Estado vacío | mensaje e invitación |
| Responsive | cómo se comporta la grilla en cada breakpoint |

**Puerta de verificación**
- [ ] Cada feature de la tabla está documentada con su código
- [ ] Se probó cada una en el sitio en vivo y se registró el comportamiento real
- [ ] Un desarrollador podría reimplementarlo solo con este documento

**Entregable:** `PATRON_CATALOGO.md`
**⏸️ CHECKPOINT**

---

## FASE A3 · Definir la batería de tests (antes de implementar)

**Objetivo:** que los criterios existan **antes** que el código.

**La batería completa**

| Grupo | Tests |
|---|---|
| **No regresión** | música (play, pause, touch), carrusel (avance, retroceso, autoplay), header, footer, WhatsApp flotante, Meta Pixel |
| **Datos** | los 81 cargan, códigos únicos, sin campos vacíos, precios coherentes |
| **Buscador** | por nombre, por código, sin resultados, con acentos, mayúsculas/minúsculas, string vacío |
| **Filtros** | cada una de las 13 categorías, cada talle, combinación categoría+talle, reset |
| **Orden** | los 4 modos, y que el orden sea estable |
| **Cards** | hover cambia foto, badges correctos, precio correcto, click abre popup |
| **Popup** | abre, cierra por botón/ESC/click afuera, galería navega, talles se ven, CTA correcto, cross-sell carga |
| **Carrito** | agregar, quitar, cambiar cantidad, persistir tras recarga, vaciar, mensaje final con códigos |
| **Casos límite** | los 6 de la sección de reglas |
| **Conversión** | cada CTA lleva al número correcto con el mensaje correcto |
| **Performance** | Lighthouse ≥90, lazy loading, peso de imágenes |
| **Accesibilidad** | navegación por teclado, foco visible, contraste, alt text |
| **Seguridad** | sin claves en cliente, headers presentes, sin dependencias vulnerables |

**Puerta de verificación**
- [ ] Cada test tiene criterio de éxito explícito (no "funciona bien")
- [ ] Los 6 casos límite están cubiertos
- [ ] Existe el checklist ejecutable para las fases D

**Entregable:** `TESTS.md`
**⏸️ CHECKPOINT — Maxi aprueba antes de que se escriba código nuevo**

---

# BLOQUE B · DISEÑO Y DATOS

## FASE B1 · Dirección de arte

**Acciones**
1. Definir paleta extendida: vino y dorado base + acentos de temporada sacados
   de la ropa real
2. Sistema de espaciado y radios consistente
3. Tipografía coherente con el catálogo PDF
4. Aplicarlo a **una sola vista de muestra** (no a todo el sitio)

**Puerta de verificación**
- [ ] El vino y el dorado siguen siendo la base
- [ ] Contraste verificado con herramienta, no a ojo
- [ ] La muestra se ve bien en los 3 breakpoints

**⏸️ CHECKPOINT — Maxi aprueba la dirección antes de aplicarla a todo**

---

## FASE B2 · Frases con humor y CTA

**Ubicaciones:** hero, entre secciones, buscador vacío, carrito vacío,
confirmación de pedido.

**Puerta de verificación**
- [ ] Cada frase tiene humor **y** empuja a la acción
- [ ] Tono consistente con el catálogo PDF
- [ ] Ninguna promete algo que el negocio no cumple

**⏸️ CHECKPOINT**

---

## FASE B3 · Integrar el paquete de datos

**Acciones**
1. Copiar `DATOS_WEB/productos.json` y `fotos/` al repo
2. Escribir el validador de esquema
3. Correrlo

**Puerta de verificación**
- [ ] 81 productos cargan
- [ ] Códigos únicos
- [ ] Ningún producto sin fotos ni sin descripción
- [ ] Todas las fotos referenciadas existen en disco
- [ ] Descripciones únicas (cero repetidas)
- [ ] Precios: aplicar la política de pricing interna del negocio (ver
      documentación privada) y redondear a múltiplos de $500

---

# BLOQUE C · IMPLEMENTACIÓN

## FASE C1 · Migrar el patrón al sitio principal

**Acciones:** implementar todo lo de `PATRON_CATALOGO.md` en el sitio
principal, con los 81 productos.

⚠️ **Alma Mía sigue en pie** — sirve de referencia para comparar.

**Puerta de verificación**
- [ ] Buscador, filtros, orden, paginación funcionan
- [ ] Hover, badges, popup, cross-sell funcionan
- [ ] Los 6 casos límite verificados **uno por uno**
- [ ] Los 3 breakpoints verificados
- [ ] Cero errores en consola

**⏸️ CHECKPOINT**

---

## FASE C2 · Carrito

**Acciones**
1. Estado en `localStorage`
2. Talle y color **obligatorios** antes de agregar
3. Contador en el header
4. Panel: prendas, talle, color, precio unitario, total estimado
5. Editar cantidades, quitar, vaciar
6. **Botón final: un solo mensaje de WhatsApp con el pedido completo**,
   incluyendo código de artículo de cada prenda
7. Aclarar que el total es estimado (envío y disponibilidad se confirman por chat)

**Puerta de verificación**
- [ ] No se puede agregar sin elegir talle y color
- [ ] Persiste tras cerrar y reabrir el navegador
- [ ] El mensaje de WhatsApp sale bien formateado y con todos los códigos
- [ ] Carrito vacío muestra su estado con CTA
- [ ] Funciona en los 3 breakpoints

**⏸️ CHECKPOINT**

---

## FASE C3 · Refactorización visual

**Acciones:** aplicar la dirección de arte a todo el sitio.

⚠️ **Preservar:** música (touch + play/pause), carrusel, header, footer,
Meta Pixel.

**Puerta de verificación**
- [ ] **Test de no regresión completo** — música y carrusel funcionan igual
- [ ] Los 3 breakpoints
- [ ] Cero errores en consola
- [ ] Textos de temporada actualizados (ya no dice "Invierno 2026")

**⏸️ CHECKPOINT**

---

## FASE C4 · Baja total de Alma Mía

⚠️ **Solo cuando C1, C2 y C3 estén aprobadas.**

**Acciones**
1. Quitar el botón "Ver colección de Jeans" del index
2. Eliminar la carpeta `/catalogo/` completa
3. Eliminar el PDF de jeans
4. Eliminar reglas CSS y funciones JS que solo servían a esa sección
5. Eliminar imágenes huérfanas
6. Buscar y eliminar toda referencia restante

**Puerta de verificación**
- [ ] `grep` de "alma", "AM10", "catalogo/", "jeans": cero resultados no
      intencionales
- [ ] Cero enlaces rotos (crawler sobre el sitio)
- [ ] Cero archivos huérfanos
- [ ] El sitio sigue funcionando completo

**⏸️ CHECKPOINT**

---

## FASE C5 · Mejoras sin costo

**Acciones:** Open Graph + imagen de preview, enlaces directos a producto
(`?producto=ART.1147`), PWA (`manifest.json` + service worker), Schema.org,
lazy loading, skeleton loaders.

**Puerta de verificación**
- [ ] Compartir el link muestra foto y título
- [ ] `?producto=ART.1147` abre ese producto directo
- [ ] La web se puede instalar en el celular
- [ ] Lighthouse ≥90 en las 4 métricas

---

## FASE C7 · Rendimiento crítico: fonts, CSS/JS render-blocking, responsive images

> **Sin arrancar.** Documentada como contexto de partida a raíz de lo que se
> midió al cerrar C5.4 (lazy loading), el 2026-09-12. No se tocó código de
> esta fase en esa sesión — es diagnóstico, no implementación.

**Contexto de arranque (hallazgo de la sesión de C5.4)**

Al auditar lazy loading se corrió Lighthouse sobre el sitio local y el
resultado expuso que el score de Performance (57→60, mejora marginal) no
lo explica el peso de imágenes de producto — esas ya cargan diferidas
correctamente. La causa real, medida con el desglose de fases del LCP de
Lighthouse:

- **LCP: 6.6s**, con **91% del tiempo en "Render Delay"** (el elemento del
  LCP — la imagen del hero — ya está descargada hacia el 9% del tiempo;
  el resto es esperar a que el navegador pueda pintarla)
- **`render-blocking-resources`**: ~2.220ms de ahorro estimado — la hoja de
  Google Fonts (`fonts.googleapis.com/css2?...`) y el CSS/JS inline del
  `<head>` bloquean el primer render
- **`uses-responsive-images`**: ~3.073 KiB de ahorro estimado — las
  imágenes (hero incluido) no tienen variantes de tamaño por breakpoint,
  se sirve la misma resolución completa sin importar el viewport
- **`uses-text-compression`**: ~165 KiB de ahorro estimado

**Acciones (a definir en detalle cuando arranque la fase)**
1. Resolver el render-blocking de Google Fonts: `font-display: swap` ya
   evaluado o preconectar/precargar de forma más agresiva, o autohospedar
   las tipografías si el peso lo justifica
2. Separar o diferir el CSS/JS inline que no sea crítico para el primer
   pintado (el sitio no tiene build — evaluar qué es viable sin uno)
3. Servir el hero (y candidatos a LCP) en tamaños responsive reales por
   breakpoint, no una sola resolución para todos los dispositivos
4. Habilitar compresión de texto si Netlify no la está aplicando ya por
   default en `netlify.toml`

**Puerta de verificación**
- [ ] Lighthouse Performance ≥90 (el mismo umbral que ya exige el cierre
      de C5, todavía pendiente)
- [ ] LCP con "Render Delay" por debajo del 50% del tiempo total de LCP
- [ ] Verificado en los 3 breakpoints (V2 — nada por muestreo)
- [ ] Música, carrusel, header y footer sin regresión

---

# BLOQUE D · VERIFICACIÓN FINAL

## FASE D1 · Ejecutar la batería completa
Todos los tests de `TESTS.md`. Reporte con resultado de cada uno.

## FASE D2 · QA con autoridad de bloqueo
⚠️ **Sesión separada de quien implementó** (regla V4).

- Todas las vistas, los 3 breakpoints, sin muestreo
- Los 6 casos límite, uno por uno
- Reporte de hallazgos **antes** de mergear

**⏸️ CHECKPOINT — Maxi revisa los hallazgos**

## FASE D3 · Seguridad y performance
Dependencias, headers, Lighthouse, accesibilidad, cero datos sensibles.

## FASE D4 · Merge y deploy
1. Revisar el deploy preview completo
2. Merge a `main`
3. Verificar producción
4. Actualizar `AGENT_WEB.md` con los errores nuevos aprendidos

---

# RESUMEN DE CHECKPOINTS

| Checkpoint | Qué aprobás |
|---|---|
| Fin 0.1 | Hallazgos de la auditoría del repo |
| Fin 0.2 | La división quedó limpia |
| Fin A1 | El inventario del código |
| Fin A2 | El patrón registrado |
| Fin A3 | **La batería de tests, antes de que exista código** |
| Fin B1 | La dirección de arte |
| Fin B2 | Las frases |
| Fin C1 | El catálogo migrado |
| Fin C2 | El carrito |
| Fin C3 | La refactorización visual |
| Fin C4 | Alma Mía dada de baja sin residuos |
| Fin D2 | Los hallazgos del QA, antes del merge |
