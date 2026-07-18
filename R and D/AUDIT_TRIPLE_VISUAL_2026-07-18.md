# AUDITORÍA VISUAL NAVEGADA EN VIVO — ATP Cliente

**Fecha:** 2026-07-18
**Entorno:** https://app.enriquezapata.com.mx (Vercel, post-deploy MB-0..MB-3)
**Método:** Navegación en vivo con Chrome MCP, sesión activa de Enrique (perfil real, cronotipo Oso), entrada por "Ir a mi entrenamiento".
**Rúbrica del fundador:** done = comprensible + editorial + invita a la acción + cada card se gana su lugar + probado como usuario real. Link válido al lugar inútil = roto.

---

## RESUMEN EJECUTIVO — ESTADO DE LOS 8 CHECKS MB-0..3

| # | Check | Estado | Nota corta |
|---|-------|--------|-----------|
| 1 | Edad ATP como celebración, 1er dato en YO | ✅ PASS | "28.3 años biológicos / 7.7 años más joven que tu edad real". Primer card en YO, retrato teal editorial. Enmarcado de celebración, no "sobre tu edad real". |
| 2 | HOY: cards meditación + journal, routing a pantalla propia | ✅ PASS | MEDITACIÓN (+2.5), JOURNAL (+1.5), CHECK-IN (+2) presentes. Meditación → `/meditation` (pantalla propia editorial). |
| 3 | Casita persistente arriba-izq, NO reinicia app | ✅ PASS | Ícono home verde en todo menos HOY; regresa a HOY por navegación SPA sin recargar la app. |
| 4 | Suplementos: editar ficha (✏️), scan→plan, menú no trabado | 🟡 PASS con salvedad | Editar ficha funciona (formulario "Editar suplemento" completo en DOM). Lista agrupada limpia, adherencia, disclaimer, scan + edit por fila. Selectores inline tipo chip (no trabados). **SALVEDAD (P1):** el sheet de edición NO se ve en viewport web. Scan (cámara) no testeable en desktop. |
| 5 | Fitness: "ATP Fitness", timer→estándar, cardio→registro, EditorialCard | ✅ PASS | Header "ATP FITNESS". EditorialCards (Mi Fitness / Entrenar / Explorar) limpios tras cargar. Timer rápido → timer estándar (30/60/90/Tabata/Personalizado). CARDIO de HOY → `/log-cardio` registro directo. |
| 6 | Ajustar Mi Protocolo: journey primero, sin regaños, sin duplicados | ✅ PASS | Journey primero (lidera con las 8 actuales), copy gentil ("la consistencia gana a la cantidad"), motor propone solo 1 ("4 de 5 ya en tu protocolo"). Saturación resuelta. Leak snake_case menor (P2). |
| 7 | Cronotipo: Delfín como estado temporal + cronotipo madre | ⚠️ NO VERIFICABLE + concern | Perfil activo es Oso → copy específico de Delfín no visible en vivo (requeriría mutar perfil real). Además el destino de Oso está flaco (P2). |
| 8 | Infra: refresh/deep-link ya NO da 404 (SPA fallback) | ✅ PASS | Carga directa/refresh de rutas profundas (`/kit`, `/salud/intervenciones`, `/supplements`, `/fitness-hub`…) sirve el SPA. Rutas desconocidas (`/mi-atp`, `/salud`) muestran el "Unmatched Route" interno de la app (graceful, no 404 de servidor). |

**Veredicto global:** MB-0..3 aterrizaron bien. La app se ve editorial, coherente y "se gana su lugar" en casi todas las pantallas. No hay P0 (ni crashes ni flujos core rotos). Los hallazgos son de pulido y de rendering web. El tema transversal más notorio es el **"hueco negro" de lazy-load** en cada hub, y un patrón de **modales/bottom-sheets que no se ven en el viewport web**.

---

## HALLAZGOS PRIORIZADOS

### P0 — Bloqueantes
Ninguno. No se observaron crashes, pantallas muertas permanentes ni flujos core rotos.

---

### P1 — Significativos

**P1-1 · Sheet de edición de suplemento no se ve en viewport web**
- **Qué se ve:** Al tocar ✏️ en una ficha, el fondo se oscurece (overlay activo) y el formulario "Editar suplemento" existe completo en el DOM (Nombre, Dosis, Tomas al día, Frecuencia, ¿Cuándo tomarlo?, Forma, Marca, Razón, GUARDAR CAMBIOS + disclaimer), pero **no aparece ningún sheet visible** en pantalla. `Escape` no lo cierra y no hay botón de cancelar visible → en web el usuario queda atorado.
- **Pantalla:** `/supplements` (probablemente aplica a todos los bottom-sheets: mismo patrón que "Ajustar Mi Protocolo" cuando abre modal).
- **Por qué importa:** En el deploy web (el que se está auditando) la edición es inusable. En device nativo probablemente es un bottom-sheet que sí funciona.
- **Fix:** Verificar en device físico. Si es un `Modal`/bottom-sheet de RN que en web export renderiza fuera del viewport, ajustar el contenedor del modal para web (portal/centrado + backdrop cerrable + botón X visible).

---

### P2 — Pulido / calidad percibida

**P2-1 · "Hueco negro" de lazy-load en TODOS los hubs y listas**
- **Qué se ve:** Al entrar a cada hub/lista (Mi ATP `/kit`, `/habits-portal`, `/fitness-hub`, `/fitness-train`, `/supplements`, `/salud/mis-evaluaciones`) la pantalla queda **1-3 s en negro total** (solo header) antes de que pinten las imágenes de las cards. Recién con scroll o espera aparecen las EditorialCards.
- **Por qué importa:** El primer frame se lee como "obra negra"/roto justo en el momento WOW. Rompe la sensación de calidad editorial que sí tienen las pantallas una vez cargadas.
- **Fix:** Skeleton loaders o placeholders con gradiente de la card mientras carga la imagen; priorizar carga eager de imágenes above-the-fold; cachear.

**P2-2 · Leak de identificadores técnicos snake_case en copy user-facing (Mi Protocolo)**
- **Qué se ve:** En la card "Coherencia cardíaca 5-5", el racional dice: *"Modula HRV RMSSD + HRV SDNN 24h. Monitorear: presion_arterial_sistolica, PCR_hs."* También "gaba low", "Nivel 3 estres" (sin acento).
- **Pantalla:** `/salud/intervenciones` (Ajustar Mi Protocolo).
- **Por qué importa:** La tarea #137 (legibilizar snake_case) quedó marcada completa pero este racional se escapó. Rompe el tono premium.
- **Fix:** Legibilizar → "presión arterial sistólica, PCR-hs (ultrasensible)".

**P2-3 · Agenda: duplicación semántica + conteo alto**
- **Qué se ve:** AGENDA DE HOY muestra "24 próximos" y dos eventos a las **10:30**: "Desayuno proteico alto" y "Romper ayuno — comida limpia" — conceptualmente el mismo momento (romper ayuno = desayuno).
- **Pantalla:** HOY (agenda).
- **Por qué importa:** Relacionado con la tarea pendiente #87 (agenda con eventos duplicados/sin sentido). El dedup semántico del motor de agenda no fusionó estos dos.
- **Fix:** Dedup por familia semántica (desayuno/romper-ayuno) además del clamp temporal.

**P2-4 · Destino de Cronotipo flaco (link a lugar semi-inútil)**
- **Qué se ve:** La card CRONOTIPO OSO en YO promete "Qué significa y cómo aprovecharlo". El destino `/my-chronotype` muestra solo: hero del oso, "🐻 OSO / Ritmo solar", DESPIERTAS 7:00am / DUERMES 11:00pm, un **hueco negro grande**, y "Repetir el test". No hay contenido de "qué significa" ni "cómo aprovecharlo".
- **Pantalla:** `/my-chronotype`.
- **Por qué importa:** Por rúbrica, link válido a lugar casi vacío = roto. La card oversell vs el destino.
- **Nota check #7:** El copy específico de **Delfín** (estado temporal + cronotipo madre) NO se pudo verificar en vivo porque el perfil activo es Oso; retomar el test para volverse Delfín mutaría datos reales de Enrique. Dado que el destino de Oso ya está tan vacío, conviene confirmar que la rama Delfín sí tenga su mensaje.
- **Fix:** Poblar el destino con descripción del cronotipo + ventanas óptimas + cómo aprovecharlo; verificar rama Delfín aparte.

**P2-5 · Acento morado legacy persiste (inconsistente con sistema de 3 colores)**
- **Qué se ve:** Morado sobreviviente en: minutos de sesión en Meditación (5/10/15/20 en morado), card "DISCIPLINA ATP", wordmark "ATP" en headers de HÁBITOS y ENTRENAR (morado), íconos de "Test de Braverman" y "Test cognitivo".
- **Por qué importa:** El sistema de diseño ATP es lime+teal principales + amarillo 2rio (memoria design_system). El morado es residuo ELITE/legacy.
- **Fix:** Barrer morado → paleta ATP. (Consistente con tarea #126 concept-colors.)

---

### P3 — Menores / nice-to-have

**P3-1 · Casita encima del eyebrow del header**
- El ícono home verde tapa la etiqueta small-caps del header en los hubs: se lee "OSISTEMA" (TU ECOSISTEMA), "…TOS PILARES" (HÁBITOS PILARES), y tapa el inicio del disclaimer en Suplementos. Ajustar padding/z-order para que no se encimen.

**P3-2 · Fila de suplemento: target "marcar tomado" vs ✏️ demasiado juntos**
- Al intentar tocar el ✏️ de edición terminé marcando el suplemento como tomado (toda la fila es "toca para marcar" y el lápiz es un target chico y adyacente). Riesgo de mis-tap. Considerar afordancia de edición más grande/separada. (Reversible: se revirtió en la auditoría.)

**P3-3 · Mensaje ARGOS truncado viejo en historial**
- En el chat de ARGOS persiste un mensaje viejo truncado ("Buena pregunta, justo toca la línea que ARG", 10 jul). Es artefacto histórico de antes del fix de streaming (#27); las respuestas nuevas llegan completas y bien formateadas. Cosmético.

**P3-4 · Typos en seed de suplementos (datos del usuario, no bug de app)**
- "Ciaceae", "Homosisteina", "Energía e hidrstscion", "Mucuna Puriencis", "Cordiceps", y "razónes" en card de intervención. Los de suplementos son datos que capturó Enrique (su registro), no bug de app; el de "razónes" sí es copy de la app.

**P3-5 · Posible asimetría en conteo de electrones (baja confianza)**
- El balance de rayo (arriba-izq) pasó de 219 → 222 durante la sesión, tras togglear/destogglear un suplemento y generar chat ARGOS. "E- ganados hoy" seguía en +0. Baja confianza; vale una mirada a que marcar y desmarcar no deje +E residual en el total.

---

## CONFIRMACIÓN BATCH 5-7 (conocidos)

- **Fitness rebuild profundo:** ✅ Confirmado sólido. Hub "ATP FITNESS" con 3 EditorialCards (Mi Fitness gold / Entrenar lime / Explorar blue), submenú de ENTRENAR limpio (ARGOS genera rutina, Mis rutinas, Construir rutina, Timer rápido, Registrar ejercicio), Timer estándar funcional, log-cardio directo.
- **Audio Mente:** Meditación ya editorial (hero B/N + categorías Silencio/Mindfulness/Body Scan, 14 sesiones). Deuda de grabaciones binaurales/NSDR (#46) sigue pendiente — conocida. Números de minutos aún en morado (ver P2-5).
- **ARGOS:** ✅ Excelente. Header "ARGOS · SALUD FUNCIONAL", chat funcional con streaming completo. Respuesta on-doctrina ("Yo no diagnostico. Nunca. Por diseño."), usa labs reales del usuario (LDL 183.7, colesterol 255, HDL 67, TG 58), da dirección no diagnóstico, incluye disclaimers de evidencia y "consulta con un experto". Input con mic + send.

## Pilar Salud Funcional (muestreo)
- `/salud/mis-evaluaciones` bien organizado como MENÚ (navegación, no datos, per doctrina #133): Cuestionario Maestro ATP, Braverman, Cronotipo, Tipo de piel (Fitzpatrick presente), Cuestionarios funcionales, Test cognitivo, Pruebas cinemáticas. Cronotipo lista "León · Oso · Lobo" (Delfín oculto → consistente con doctrina). Sufre el mismo hueco negro de lazy-load (P2-1).

---

## Rutas verificadas (todas cargan por SPA, sin 404 de servidor)
`/` (HOY) · `/yo` · `/kit` (Mi ATP) · `/meditation` · `/timer` · `/log-cardio` · `/supplements` · `/habits-portal` · `/fitness-hub` · `/fitness-train` · `/salud/intervenciones` · `/salud/mis-evaluaciones` · `/my-chronotype` · `/argos-chat`
Rutas inexistentes (`/mi-atp`, `/salud`) → "Unmatched Route" interno (graceful).
