# AUDITORÍA NAVEGADA FULL · ATP CLIENTE (WEB) · PRE-BETA

- **Fecha:** 2026-07-17
- **URL auditada:** https://app.enriquezapata.com.mx (versión ATP cliente, no FX)
- **Método:** navegación en vivo vía Chrome MCP, sesión de Enrique ya logueada. Solo lectura/observación, sin modificar datos.
- **Viewport:** ~668×1346 (layout tipo móvil, Expo web).
- **Acceso:** ✅ Logrado. Sesión activa, recorrido completo de todos los pilares.

---

## RESUMEN EJECUTIVO

La app está en muy buen estado visual y de producto. La mayoría de los mega-sprints recientes están correctamente desplegados y se ven **pulidos y editoriales**: HOY, ARGOS, Mi Diagnóstico, el rediseño del hub Salud Funcional (menú puro de 8 destinos), Guía de Labs, Cuestionario Maestro, y toda la economía H+. No se detectaron pantallas rotas, huecos negros de contenido faltante, botones muertos internos, ni errores de consola.

**El hallazgo más importante es de infraestructura web, no de UI:**

1. **P1 — Refresh / deep-link → 404 de Vercel** en toda ruta que no sea `/`. Recargar el navegador o compartir un link profundo (ej. `/kit`, `/health-hub`) muestra un `404: NOT_FOUND` crudo de Vercel sin forma de volver salvo editar la URL a raíz. Reproducible.
2. **P1 — Caché stale del service worker sirve la UI VIEJA en la primera carga.** En mi primer render, `/health-hub` mostró el hub **pre-rediseño** ("Historia Clínica" con datos sueltos: resumen "1 síntoma activo", acordeones de Sistemas Funcionales con síntomas inline, lista larga de módulos), y `/kit` mostró labels viejos ("Historia Clínica" / "Hábitos"). Tras navegar, apareció la versión correcta ("Salud Funcional" menú puro + "Hábitos Funcionales"). **El rediseño SÍ está desplegado; el riesgo es que un tester en su primera sesión vea el diseño viejo/más sucio hasta que la app se actualice.**

El resto son inconsistencias de datos/nomenclatura (P2) y pulido menor (P3). Varios pendientes conocidos se verificaron **ya resueltos en vivo**: Guía de Labs está completa (contradice #93), Mi Diagnóstico tiene imagen editorial (contradice #71), la card de Comunidad tiene foto editorial (contradice #56), la agenda muestra 19 eventos limpios (no los 56 duplicados de #87), y Mente ya no usa `/mind-hub`.

Veredicto: **apto para beta** una vez resueltos los dos P1 (sobre todo el 404-on-refresh, que es el que más rompe la experiencia de un beta compartido por link web).

---

## P1 — ALTO (resolver antes de compartir el link de beta)

### P1-1 · Refresh / deep-link devuelve 404 de Vercel en toda ruta no-root
- **Qué se ve:** navegar/recargar directamente a `https://app.enriquezapata.com.mx/kit` o `/health-hub` devuelve una página blanca de Vercel: `404: NOT_FOUND · Code: NOT_FOUND · ID: sfo1::...`. Reproducible (IDs distintos por request). Solo `/` (raíz) carga en hard-load.
- **Dónde:** global. Confirmado en `/kit` y `/health-hub`. La navegación cliente (clicks dentro de la app) sí funciona; el problema es cualquier entrada directa a una ruta.
- **Por qué importa:** en un beta web compartido por link, cualquier tester que recargue el navegador, use "atrás/adelante" del navegador, o abra un bookmark de una pantalla interna cae en un 404 crudo sin marca ni salida. Es la peor primera impresión posible y parece "app caída".
- **Fix sugerido:** agregar rewrite catch-all en `vercel.json` que enrute todas las paths a la SPA (o al fallback SSR de expo-router), y/o asegurar que el static export genere `+not-found` y todas las rutas. Verificar la config de `output` del export web de Expo.

### P1-2 · Caché stale del service worker sirve la UI pre-rediseño en primera carga
- **Qué se ve:** primer render de `/health-hub` = hub VIEJO titulado "HISTORIA CLÍNICA / Tu expediente vivo de salud funcional" con **datos sueltos dentro del hub** (card "RESUMEN DEL EXPEDIENTE: 1 síntoma activo · mayor carga en Energía" + botones, acordeones "Sistemas Funcionales" que expanden síntomas inline como "Tuve gripa de sabado a martes · Leve", y lista larga de ~11 módulos). Igual en `/kit`: labels "HISTORIA CLÍNICA" / "HÁBITOS". Tras navegar por la app, ambos se actualizaron a la versión correcta: "SALUD FUNCIONAL" (menú puro de 8 destinos, cero datos sueltos) y "HÁBITOS FUNCIONALES".
- **Dónde:** `/health-hub`, `/kit` en la primera carga de la sesión.
- **Por qué importa:** el rediseño de arquitectura de info (#133, separar navegación de datos) es correcto y está vivo, pero un tester nuevo puede ver primero la versión que mezcla datos en el hub — exactamente lo que la doctrina "menú vs consulta" quiere evitar. Rompe la primera impresión y contradice el trabajo hecho.
- **Fix sugerido:** en el update del service worker usar `skipWaiting()` + `clients.claim()`, versionar el nombre del cache para invalidar bundles viejos en cada deploy, y/o mostrar un prompt "nueva versión disponible → recargar". Confirmar estrategia de cache del PWA generado.

---

## P2 — MEDIO (inconsistencias de datos/nomenclatura, no bloquean pero confunden)

### P2-1 · Meta de proteína inconsistente entre HOY y Nutrición
- HOY (card PROTEÍNA): **"0g / 160g · Te faltan 160g"**.
- Nutrición (`/nutrition`, Score del día): **"0/126g proteína"**.
- Dos metas diarias distintas (160 vs 126) para el mismo dato el mismo día. Definir fuente única de verdad.

### P2-2 · Nombre de rango inconsistente entre pantallas
- Mi Progreso (`/economy/admin`): **"Rank 6 · LONGEVO"**.
- Comunidad Ranking (`/comunidad/ranking`): **"Nivel 6 · Iniciado"** para el mismo usuario/nivel.
- El mismo rango se etiqueta distinto ("Longevo" vs "Iniciado"). Unificar el naming del ladder de gamificación.

### P2-3 · Edad ATP con cifra implausible
- Mi Diagnóstico: **"27.8 años biológicos · 7.2 años sobre tu edad real · CE 97%"**. Si 27.8 es 7.2 por encima de la edad real, la edad real saldría ≈20.6, inconsistente con el usuario. Verificar el cálculo o si es dato seed/prueba. (No es alarmista ni mal presentado; es un posible bug de datos/fórmula.)

### P2-4 · Deriva de vocabulario en Salud
- "Cuestionarios funcionales" (lista Mis Evaluaciones) vs **"Quizzes funcionales"** (chip de fuentes en Mi Diagnóstico).
- "Mis Síntomas" (destino) vs **"Síntomas clínicos"** (chip de fuentes en Mi Diagnóstico).
- Unificar términos canónicos cross-pantalla (aplica la doctrina de dedup semántico).

---

## P3 — BAJO (pulido / copy / detalles)

### P3-1 · Hubs internos se sienten más "borrador" que el resto
- `/mente`, `/nutrition`, `/fitness-hub` usan filas oscuras/planas + mucho vacío negro debajo del contenido en viewport web alto (en móvil se nota menos). Respecto a las pantallas editoriales (HOY, hubs de Salud/Hábitos) se ven utilitarios. Ata al pendiente #94 (Mente borrador). Considerar centrar/rellenar contenido para web. Nota: las pantallas de ejecución de Mente SÍ están editorializadas (Respiración `/breathing` tiene header con imagen y copy limpio, sin citas de autoridad — doctrina #140 aplicada).

### P3-2 · Imágenes de agenda que no matchean el concepto
- En AGENDA DE HOY (19 eventos, por lo demás limpia y con buenas imágenes B/N): "Eliminar aceites vegetales industriales 07:30" muestra imagen de diario/pluma; "Ventana de alimentación 08:15" muestra imagen de laptop/escritorio; "Suplementos AM" genérica. Algunas imágenes no corresponden al concepto de la intervención.
- Nota de lógica: "Eliminar aceites vegetales industriales" y "Sin procesados" son evitaciones de todo el día, agendarlas a una hora puntual (07:30) es un poco raro.

### P3-3 · Copy nits
- Nutrición: "0/126g **proteina**" sin acento (debe ser "proteína").
- Siglas sin expandir en algunos lados: **HRV** (Coherencia 5-5 en Respiración), **HIIT** (Fitness). La Guía de Labs sí explica siglas muy bien (HbA1c, HOMA-IR, TSH/T3/T4, VCM/MCV, RDW, PCR-us, SHBG, WBC) — replicar ese estándar.
- Cronotipo: subtítulo lista solo "León · Oso · Lobo" (omite el 4º, Delfín). Confirmar si es intencional.

### P3-4 · Toast persistente
- "5 notificaciones sin leer · Ver" sigue visible/pegado a través de muchas pantallas sin auto-descartarse. Nag menor.

### P3-5 · Residuo de mensaje truncado en historial de ARGOS
- En el chat de ARGOS aparece un mensaje viejo cortado: "...justo toca la línea que ARG". Es residuo del bug de streaming ya arreglado (#27), no un bug vivo — la respuesta nueva salió completa y bien formateada. Cosmético en el historial.

### P3-6 · Naming de ruta interna
- Pantalla de progreso de usuario vive en `/economy/admin` — "admin" es raro para una pantalla user-facing (el usuario no ve URLs; puramente cosmético).

---

## LO QUE ESTÁ MUY BIEN (para no re-trabajar)

- **HOY:** feed editorial excelente. Cards con imágenes distintas por intervención (Proteína, Agua con acciones rápidas, Suplementos, Sin procesados, Pasos, Grounding, Baño frío, Breathwork, Off-pantallas, No alcohol, Sueño), badges de electrones, icono (i) del "por qué", hero rotativo (Vía Láctea / luna). Card AHORA de racha + "Ajustar Mi Protocolo".
- **ARGOS:** funciona, respuesta bien formateada con datos reales del usuario (labs), disclaimers presentes ("Yo no diagnostico", "Consulta con un experto", warning de evidencia). Botón flotante persistente en todas las pantallas.
- **Salud Funcional (hub rediseñado):** menú PURO de 8 destinos editoriales (Mi Diagnóstico, Mi Protocolo, Mis Datos, Mis Evaluaciones, Mis Síntomas, Mis Padecimientos, Guía de Labs, Mi Expediente). Cero datos sueltos. Cumple la doctrina navegación-vs-consulta (#133).
- **Mi Diagnóstico:** punto fuerte. Nivel 4 "Con laboratorios", narrativa de medicina funcional cuidadosa y responsable (maneja LDL/apoB elevado como "merece seguimiento, consulta", no alarmista), 8 raíces con % de confianza y barras, Edad ATP, versionado v1→v3, chips de fuentes, botón "Actualizar · 1,000 H+" con "se cobra sólo si hay datos nuevos", PDF. Excelente integración de economía H+.
- **Guía de Labs:** completa (contradice #93). Por qué, inversión ($800–5,500 MXN), 5 paquetes itemizados, dónde en México (Chopo, Salud Digna, Polanco/Ruiz, Licy), cómo prepararte, disclaimer, PDF.
- **Cuestionario Maestro ATP:** bien construido. 14 secciones, escala Likert 1-5 con extremos etiquetados, helper que explica el "por qué", Guardar y salir / Saltar / Continuar.
- **Economía H+:** Tienda (Boosts Pro, Reporte Braverman, recargas MXN) y Mi Progreso (rank ladder, convertir E-→H+, retos, referidos) pulidos y con balances consistentes (3,785 H+ / 3.8K).
- **Comunidad Ranking:** funcional, "no competencia, celebramos la constancia", top 20, filtros, privacidad ("perfiles privados con datos ocultos").
- **Sin errores de consola** en las pantallas revisadas.
- **CICLO:** no visible en nav (usuario masculino) — comportamiento esperado.

---

## COBERTURA / LIMITACIONES

- **Recorrido:** HOY, ARGOS, Agenda, Mi ATP (kit), Salud Funcional (hub + Mi Diagnóstico + Guía de Labs + Mis Evaluaciones + Cuestionario Maestro), Hábitos (Nutrición, Fitness, Mente, Respiración), Economía (Tienda H+, Mi Progreso), Comunidad (Ranking).
- **No abierto en profundidad:** resultado de Test de Braverman, Mis Datos (labs/glucosa/cetonas) a nivel pantalla interna, Mi Protocolo interno, y flujos que disparan LLM/timers (para no generar costo/efectos). Se verificó su existencia y entry points.
- El comportamiento de 404-on-hard-load impidió navegar por URL directa; toda la navegación se hizo por clicks (routing cliente).
