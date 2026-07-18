# Auditoría Ronda 2 · Web (ATP cliente) · 2026-07-17

**Auditor:** Cowork (navegada en vivo, Chrome MCP)
**Entorno:** https://app.enriquezapata.com.mx (Vercel) · sesión de Enrique (perfil HOMBRE) · hard-refresh aplicado
**Alcance:** ATP cliente. Recorrido real como usuario: HOY, YO, Agenda, Nutrición (Suplementos + Hidratación), Mente (hub + Check-in), ARGOS, Salud Funcional (hub + Mi Diagnóstico + Mi Expediente + Guía de Labs + Mis Evaluaciones), Fitness. Ciclo no aplica (cuenta masculina, gated). Tests cubierto vía Mis Evaluaciones.

---

## RESUMEN EJECUTIVO

**La app dio un salto grande de calidad desde la ronda 1.** El design system ya es editorial (degradados, teal, imágenes B/N con concept-colors), la arquitectura de información Salud Funcional (navegación vs consulta) sostiene, y varios módulos que estaban "ilegibles/obra negra/chafón" ahora se sienten producto: Mi Diagnóstico, Guía de Labs y el hub de Mente están, francamente, bien.

**El bloqueador serio es de infra, no de UX:** cualquier refresh o deep-link a una ruta que no sea `/` devuelve un **404 crudo de Vercel** (falta SPA fallback). Para una PWA que se comparte por link y se refresca, esto es P0 y hay que taparlo antes del soft launch.

### Estado de los 6 checks prioritarios

| # | Check | Estado |
|---|-------|--------|
| 1 | Suplementos como HOMBRE — ¿ya no dice "estás embarazada"? | ✅ **PASS** — cero copy de embarazo. Header "Esto es tu registro. No es recomendación." + disclaimer genérico. |
| 2 | Routing granular cards HOY (hidratación / journal / meditación / respiración → pantalla específica) | ✅ **PASS** — AGUA→`/hydration`, Check-in→`/checkin`, Proteína→Nutrición, cards Mente con CTAs propios (Nueva entrada / Empezar sesión / Sesión guiada). Ningún hub-para-todo observado. |
| 3 | YO — ¿dice algo de ti? ¿Cronotipo con info? | ✅ **PASS** — Disciplina ATP (momentum 47%), Cronotipo Oso (con "qué significa y cómo aprovecharlo", no test directo), Progresión (Eres Longevo · faltan 291 E-). 3 destinos distintos, personalizados. |
| 4 | Design system — ¿bajó el lime brutalist? ¿editorial? | ✅ **PASS** — editorial con degradados, teal, imágenes B/N y concept-colors por card. Lime solo como acento. |
| 5 | Corazón Agenda↔HOY — marcar hecho → tachado + sin recordatorio | ✅ **PASS** — menú Editar/Completar/Posponer/Eliminar; "Completar" dejó el evento tachado + check verde, sin recordatorio. |
| 6 | Infra ronda 1 — 404 en refresh/deep-link · service worker | ❌ **FAIL (P0)** — refresh y navegación directa a cualquier ruta ≠ `/` = **404 crudo de Vercel**. Service worker: hard-refresh sí cargó versión nueva (no reprodujo UI vieja), pero el 404 domina. |

### Batches 5–7 (issues conocidos) — confirmación breve
- **Fitness "obra negra":** persiste como P2. Hub estructuralmente limpio (Mi Fitness / Entrenar / Explorar) pero SIN imágenes editoriales, filas utilitarias + gran vacío negro abajo. No roto, pero se siente borrador.
- **Mente "sin audio / borrador / botones feos":** hub **muy mejorado** (hero editorial, Journal con racha, Respiración, Meditación, Check-in, "Últimas sesiones"). Botones ya son pills, no feos. No apareció el copy "En comunidad verifica pronto". Deuda de audio (binaurales/NSDR) sigue pendiente adentro de las sesiones (conocido, roadmap).
- **ARGOS "chafón":** **notablemente mejor**. Respuesta on-doctrine ("Yo no diagnostico. Nunca. Por diseño."), usa los labs propios del usuario (LDL 183.7, HDL 67…), deriva a profesional, disclaimer de evidencia. Nota: un mensaje viejo (10 jul) quedó truncado en el historial ("…toca la línea que ARG"), pero las respuestas nuevas salen completas — el bug de truncado parece corregido hacia adelante.
- **Mi Diagnóstico "ilegible":** **RESUELTO** — narrativa funcional excelente, nivel de DX, raíces con barras de confianza, Edad ATP. Legible y editorial.
- **Mi Expediente "ilegible":** layout **RESUELTO** (timeline por mes con íconos), pero **nombres de labs en snake_case crudo** (P2, ver abajo).
- **Guía de Labs "incompleta":** **RESUELTA** — 5 paquetes (Base→Longevidad Deep/PhenoAge), labs MX (Chopo, Salud Digna…), preparación, timing de ciclo, export PDF, doctrina "rangos funcionales".

---

## HALLAZGOS PRIORIZADOS

### 🔴 P0

**P0-1 · 404 crudo de Vercel en refresh / deep-link (SPA fallback ausente)**
- **Qué se ve:** estando en `/hydration` (o cualquier ruta interna), Ctrl+Shift+R → página blanca de Vercel "404: NOT_FOUND / Code: NOT_FOUND / ID: sfo1::…". Navegación directa a `/supplements` idéntico. Solo `/` levanta la app; toda ruta interna hay que alcanzarla haciendo clic desde dentro.
- **Ruta:** cualquier ruta ≠ `/` con carga directa o refresh.
- **Por qué importa:** es una PWA que se comparte por link y la gente refresca. Un tester que recargue en cualquier pantalla ve un 404 de sistema y asume que la app se cayó. Rompe deep-links de push/comms. Bloqueador para soft launch.
- **Fix:** agregar SPA fallback en Vercel — `rewrites` catch-all a `/index.html` en `vercel.json` (o `cleanUrls`/404 rewrite para el export web de expo-router). Es config de deploy, no de código de pantalla.

### 🟠 P1

**P1-1 · Edad ATP: dirección/sentido de la comparación se ve invertida o confusa**
- **Qué se ve:** en Mi Diagnóstico → "**27.8 años biológicos · 7.2 años sobre tu edad real · CE 97%**". 27.8 biológicos siendo "7.2 años SOBRE tu edad real" implica edad real ≈ 20.6 — improbable para el perfil (biohacker 3× GWR). Para este perfil lo esperado es biológico POR DEBAJO del cronológico.
- **Ruta:** `/salud/diagnostico` (bloque EDAD ATP).
- **Por qué importa:** es EL número estrella de ATP ("¿cuántos años tendrías?"). Si el signo/copy está invertido o la edad real input está mal, el ancla de valor miente. Verificar cálculo y palabra ("sobre" vs "debajo") — puede ser dato de prueba, pero hay que confirmarlo antes de mostrarlo a testers.

### 🟡 P2

**P2-1 · Mi Expediente: nombres de labs en snake_case crudo**
- **Qué se ve:** timeline con "Lab: colesterol_ldl", "t3_libre", "saturacion_de_hierro", "rdw_cv", "proteina_c_reactiva_cuantitativa_pcr", "fsh"/"lh" en minúsculas.
- **Ruta:** `/salud/mi-expediente`.
- **Por qué importa:** el barrido de legibilización (task #137) no cubrió esta vista. Rompe la sensación editorial en una pantalla que se ve mucho. Fix: mapear keys → labels legibles ("Colesterol LDL", "T3 libre", "Saturación de hierro", "RDW-CV", "PCR", "FSH", "LH").

**P2-2 · Fitness hub sin capa editorial**
- **Qué se ve:** `/fitness-hub` con filas planas (Mi Fitness / Entrenar / Explorar), íconos chicos, sin imágenes, gran vacío negro abajo. Contrasta con Agenda/YO/Mi ATP que sí tienen imágenes B/N.
- **Fix:** aplicar el mismo molde editorial (imagen B/N + degradado + concept-color) a las 3 cards.

**P2-3 · Pantalla Hidratación demasiado pelona**
- **Qué se ve:** `/hydration` = una card (0.0L/3.5L + botones) flotando sobre un mar negro. Funciona pero no invita ni contextualiza (sin "por qué", sin historial, sin imagen).
- **Por qué importa (rúbrica):** "un módulo que existe pero no invita a usarse no está hecho". Fix: contexto epigenético + historial del día + imagen editorial.

**P2-4 · Vacíos negros al fondo de varias sub-pantallas**
- **Qué se ve:** Fitness, Mis Evaluaciones, Hidratación terminan su contenido a media pantalla y dejan un bloque negro grande. Patrón repetido → se siente inacabado.

### 🟢 P3

**P3-1 · Copy: "@" de lenguaje inclusivo se renderiza literal**
- **Qué se ve:** en Check-in emocional: "Content@", "Relajad@", "Cómod@", "Pensativ@" — el @ sale literal. Pervasivo en el vocabulario de emociones.
- **Fix:** elegir forma ("Contento/a") o neutralizar ("En calma", "A gusto") por doctrina de copy MX amigable.

**P3-2 · Toast "N notificaciones sin leer" pegado y tapando header**
- **Qué se ve:** un toast flotante persiste arriba en todas las pantallas, tapa texto del header (p.ej. "¿Qué son los H+?") y no se auto-descarta; el contador creció 8→9 durante la sesión. Sigue el scroll.
- **Fix:** auto-dismiss + no solapar contenido, o moverlo a la campana.

**P3-3 · Agenda: posibles duplicados semánticos**
- **Qué se ve:** en `/agenda`, "Desayuno proteico alto" 10:30 y "Romper ayuno — comida limpia" 10:30 (misma acción); "Running" 08:30 y "Zona 2 aeróbica" 08:30 (misma sesión). El motor ya dedup-eó el desastre de 56 eventos (ahora 19 coherentes), pero quedan solapes semánticos.
- **Nota positiva:** el bug #87 (56 eventos duplicados) parece RESUELTO — agenda ahora limpia, agrupada MAÑANA/TARDE/NOCHE, editorial.

**P3-4 · Eventos pasados de la agenda sin estado**
- **Qué se ve:** a media tarde, los eventos de la mañana (Despertar 07:00, Running 08:30) siguen mostrando recordatorios activos "10 min antes" sin marcarse como pasados/hechos.
- **Fix (menor):** atenuar/colapsar pasados o distinguir estado.

---

## NO VERIFICADO / FUERA DE ALCANCE
- **Fitzpatrick "Tipo 5 vs Tipo 4" placeholder duplicado (#86):** no se abrió el test; sin confirmar. La UV card de HOY dice "tipo 5" consistentemente.
- **Ciclo:** cuenta masculina (Enrique) → pilar gated/no presente en nav. No auditable en esta sesión.
- **Service worker sirviendo UI vieja:** no reproducido; hard-refresh cargó versión nueva correctamente.
- **N-Back / audios Mente:** deuda conocida de roadmap, no se probó a fondo.

---

## LO QUE SÍ ESTÁ GANANDO SU LUGAR (para no endulzar lo normal, pero sí reconocer los brincos)
- HOY: editorial, concept-colors, "por qué" epigenético en los modales de card (LUZ SOLAR), Universales visibles.
- Agenda: cada evento con imagen B/N temática + menú de acción (Completar/Posponer). De 56 basura → 19 coherentes.
- Mi Diagnóstico: narrativa clínica funcional de alta calidad, on-doctrine.
- Guía de Labs: contenido completo, MX-localizado, con PDF export.
- ARGOS: respeta doctrina, personaliza con labs reales del usuario.
