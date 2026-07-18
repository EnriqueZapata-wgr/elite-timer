# AUDIT TRIPLE — Código + Doctrina Clínica ATP
**Fecha:** 2026-07-18 · **Rama:** `main` (MB-0..MB-3 mergeados) · **Alcance:** solo lectura
**Lente:** doctrina clínica + cross-cutting + integridad técnica transversal.
No repite el audit de regresiones de CC (motores, migraciones puntuales, pantalla-por-pantalla).

> **Nota de método:** el repo vive en OneDrive y `git` no resuelve `HEAD` desde el mount
> (index/worktree stale). Auditoría hecha sobre el árbol de archivos, no sobre el diff de git.

---

## Resumen ejecutivo

La doctrina clínica **está sólidamente implementada** en las capas que importan:
el catálogo de intervenciones respeta fiebre-cauta, no mata placebo, no cita autoridades
en copy user-facing, y el ciclo femenino es bidireccional. Migraciones limpias con RLS.
Semántica Edad ATP correcta post-MB-1. Multiselect con helper doctrinal. Sin rutas muertas
reales ni assets faltantes. Sin doble-conteo de electrones (el "+4.5" era atribución de
display, ya resuelto con tests).

**Los hallazgos son de consistencia, no de seguridad clínica.** El más relevante es de
**identidad de marca/ARGOS**, no de motor: (1) el copy de Meet ARGOS lo presenta como
"asistente humano" genérico —choca con la doctrina "ingeniero de la creencia" y roza un
tema de honestidad IA—, y (2) el pilar Mente (breathing/meditation) sigue anclado al morado
legacy `#7F77DD` como color de acción pese a que #138 se marcó cerrado.

**El purple prohibido `#7c3aed` NO existe en el código (0 ocurrencias).** El morado presente
es `#7F77DD`, color de categoría *sancionado* en `brand.ts` (Mente + cronotipo Lobo) — es una
tensión de doctrina de "3 colores", no una violación de la paleta prohibida.

### Conteo por prioridad
| Prioridad | Cantidad |
|-----------|----------|
| P0 (bloqueante nuevo) | 0 |
| P1 | 1 |
| P2 | 2 |
| P3 | 4 |
| Verificado limpio (sin acción) | 11 áreas |

---

## P0 — Bloqueantes nuevos
**Ninguno.** Los P0 conocidos (#86 placeholder Tipo Piel, #87 agenda 56 eventos) son
territorio del audit de regresiones de CC y ya están en la lista de tareas; no los reclamo
como hallazgo propio. Ver "Cross-referencia a CC" abajo.

---

## P1 — Alta

### P1-1 · ARGOS se presenta como "asistente humano" genérico (doctrina + honestidad IA)
**Archivo:** `src/constants/argos-meet-copy.ts` (pantalla `key: 'asistente'`)
**Texto actual:** `"No soy una app.\nSoy tu asistente humano."`

**Por qué importa:**
- **Doctrina** (`project_argos_como_jarvis`, `project_argos_personalidad_creer`): ARGOS debe
  sonar a *ingeniero de la creencia* / Jarvis-espejo-de-tus-evidencias, no a "asistente".
  "Asistente humano" es exactamente el tono genérico que la doctrina quiere matar. Es el
  ancla de venta Pro; el primer contacto (Meet ARGOS) es donde más pesa.
- **Honestidad/compliance:** llamar "humano" a una IA es un claim que puede leerse como
  engañoso (Apple/Google guidelines sobre representar IA como persona). Riesgo bajo pero real.

**Fix:** ya trackeado como **tarea #43 (Meet ARGOS · reescritura WOW)**. Al reescribir,
cerrar ambos frentes: cambiar "asistente humano" por lenguaje de creencia/copiloto y evitar
afirmar humanidad. El resto del guion (`promesa`, `empezamos: "Ingeniería humana"`) ya va en
la dirección correcta — solo la pantalla `asistente` desentona.

---

## P2 — Media

### P2-1 · Pilar Mente sigue anclado al morado legacy como color de acción (design system)
**Archivos:** `app/breathing.tsx` (30+ usos de `PURPLE = CATEGORY_COLORS.mind` -> `#7F77DD`
en timers, botones, anillos, badges, CTA), `app/meditation.tsx` (15 usos).

**Por qué importa:** la doctrina de design system (`project_design_system_atp_no_lime_brutalist`)
pide 3 colores (lime+teal principales, amarillo 2rio) y matar el look legacy. La tarea **#138
("Pilar Mente · morado viejo -> editorial")** está marcada **completed**, pero solo se aplicó
al *hero editorial* (hay un comentario `#138` en `breathing.tsx:36` sobre el hero). Toda la
**ejecución** (el corazón interactivo de la pantalla) sigue morada. Es la brecha exacta que la
tarea pendiente **#94 ("Pilar Mente sigue borrador · botones feos")** describe: #138 no cerró
completo.

**Fix:** migrar los acentos de acción de breathing/meditation al lenguaje editorial (teal/gradiente
molecule + neutrales), o decidir explícitamente que `CATEGORY_COLORS.mind` sobrevive como
identidad de pilar. Requiere decisión de Enrique: ¿el morado de Mente vive o muere? Hoy el código
dice "vive" y la doctrina dice "3 colores".

### P2-2 · Pantalla de NUTRICIÓN usa el morado de Mente como acento (mismatch de identidad)
**Archivo:** `app/food-scan.tsx:49` -> `const PURPLE = CATEGORY_COLORS.mind;`
**Por qué importa:** food-scan es un flujo del pilar Nutrición (color de categoría = azul
`#5B9BD5`), pero pinta su acento con el morado del pilar Mente. Rompe la asociación
color->pilar. Confuso si el usuario navega entre pilares.
**Fix:** usar `CATEGORY_COLORS.nutrition` (o el token editorial de Nutrición) en food-scan.

---

## P3 — Baja / deuda técnica

### P3-1 · Hardcodes de color fuera de `brand.ts` (viola la regla "única fuente de verdad")
`brand.ts` declara: *"Ningún archivo debe hardcodear un color; debe importar de aquí."*
Ocurrencias de `#7F77DD` / `#fb7185` (ROSE) literales:
- `app/journal.tsx:33` `const PURPLE = '#7F77DD'` (debería ser `CATEGORY_COLORS.mind`)
- `app/(tabs)/index.tsx:119`, `app/(tabs)/kit.tsx:52`, `app/(tabs)/yo.tsx:56`
- `app/my-chronotype.tsx:63`, `app/quiz/chronotype.tsx:28`, `app/salud/mis-evaluaciones/index.tsx:36`
- `ROSE = '#fb7185'` redefinido local en `cycle-charts.tsx:25`, `cycle-history.tsx:19`,
  `cycle-settings.tsx:25` (= `SEMANTIC.error`, debería importarse).
**Fix:** reemplazar por tokens de `brand.ts`. Cosmético pero acumula deuda de theming (bloquea
el eventual modo LIGHT que la doctrina menciona como faltante).

### P3-2 · `as any` residuales (63 en `app/`) — casi todos benignos, no navegación
MB-0 removió los 196 casts de navegación. Los 63 restantes son:
- **~50** `Ionicons name={x as any}` (tipado de iconos dinámicos, inofensivo).
- **~10** casts de datos Supabase (`(data as any)?.field`) por tipos no generados.
- **Solo 3 tocan routing:** `app/index.tsx:75-76` (`href={... as any}`) y
  `app/programs.tsx:74` (`pathname: target as any`) — deuda de tipos expo-router, ya
  trackeada en **#64 ("regenerar tipos expo-router · quitar 8 casts")**.
**Conclusión:** el patrón que MB-0 atacó (navegación) está limpio; lo que queda no es esa
clase. No requiere acción urgente.

### P3-3 · Comentario con ruta engañosa en tool de dev
`app/dev/goal-tree-smoke.tsx:6` dice `router.push('/goal-tree-smoke')` en el comentario, pero
la ruta real (y la usada en `app/dev/index.tsx:16`) es `/dev/goal-tree-smoke`. Solo comentario;
sin efecto en runtime. Corregir el comentario para no confundir.

### P3-4 · Cita "warm shower 90 min antes" en data-layer podría confundir si algún día se surfacea
`src/constants/interventions-catalog.ts:1601` (fuente Huberman dentro de `temperatura_cuarto_frio`)
menciona "warm shower 90 min antes". Es la preocupación de la **tarea #117** (ducha tibia larga
+ flora piel), pero **vive solo en `sources[].citation`, que NO se renderiza** (ver "Verificado
limpio"). No hay intervención user-facing de ducha tibia de 90 min. Riesgo nulo hoy; queda la
nota por si #117 pretende crear esa intervención — al hacerlo, aclarar "90 min ANTES de dormir",
no "ducha de 90 min".

---

## Verificado limpio (sin acción requerida)

1. **`#7c3aed` prohibido:** 0 ocurrencias en todo el código.
2. **Lime plano como fondo:** no encontrado. `ATP_BRAND.lime` se usa solo como micro-acento
   (tint de refresh, bordes, badges), consistente con `ACCENT_ROLES`.
3. **Autoridades en copy user-facing:** 0. Nombres de autores (Huberman, Attia, Kresser,
   Sinclair, etc.) viven **solo** en `citation`/`sources` del catálogo. **Ese campo NO se
   renderiza** — `app/salud/intervenciones/[key].tsx:222-223` muestra únicamente el badge
   `Nivel de evidencia {evidenceLevel}`. Grep de `.citation` fuera del catálogo = 0. Doctrina
   de no-nombres respetada en UI. (Excepciones legítimas: "Wim Hof Method", "Fitzpatrick" son
   epónimos del método/escala, no atribuciones — estilo Braverman.)
4. **No matar placebo:** 0 frases que rompan la creencia ("no hay evidencia", "efecto placebo",
   "puede no funcionar", "no garantiza") en copy user-facing.
5. **Fiebre cauta:** TODAS las intervenciones de frío llevan `fiebre_viral_activa_37_8_o_mas`
   en `contraindications` — `wim_hof_basico` (3661), `wim_hof_extendido` (3801),
   `ducha_fria_nivel1/2/3` (4286/4411/4530), `temperatura_cuarto_frio` (1503). WHM además
   flaggea `antecedente_familiar_muerte_subita_cardiaca_no_estudiada`. Motor no recomienda frío
   en fiebre. (Tareas #123/#130 efectivamente aplicadas en catálogo.)
6. **Ciclo femenino bidireccional:** fase ovulatoria = *"Máxima energía, libido... Mejor momento
   para entrenamientos de fuerza máxima"* (`cycle-info.ts:18`). Sin copy paternalista
   (frágil/delicada/reposo). Doctrina respetada.
7. **Semántica Edad ATP:** consistente post-MB-1. `diagnostico/index.tsx:261-264` y
   `YoEditorialSection.tsx:83-86`: `delta>0 -> "más joven"`, convención cron-integral. Ninguna
   pantalla dice "sobre tu edad real" a quien es más joven. `EdadAtpShareCard.tsx` usa el signo
   interno opuesto (integral-cron) pero resuelve correcto — nota de mantenibilidad, no bug.
8. **Multiselect doctrinal:** los 15 items `type:'multi'` del `master-quiz-bank.ts` tienen
   `multiHelper:true`, y `QuestionInput.tsx:98` + `TestQuestionScreen.tsx:109` renderizan
   "(selecciona todas las que apliquen)".
9. **Migraciones:** 194-203 revisadas. Cada `CREATE TABLE` tiene su `ENABLE ROW LEVEL SECURITY`
   + policies (190/191/192/193/196/197/201/202/203 con counts pareados). Idempotentes
   (`IF NOT EXISTS` / `on conflict` / `drop policy if exists`). **198/199 ya están renombradas
   sin sufijo de letra** — la tarea #85 (rename 198a/198b) está de hecho resuelta en archivos
   aunque siga "pending" en la lista.
10. **Rutas muertas:** ninguna real. `/historia-clinica/fitzpatrick` resuelve al dinámico
    `[category].tsx` vía `HC_BY_ID['fitzpatrick']` (id existe y se hace `push` a HC_QUESTIONNAIRES);
    `/edad-atp/cognitive` existe; `/goal-tree-smoke` es solo comentario (ruta real `/dev/...`).
    130 `require()` de assets -> 0 faltantes.
11. **Doble-conteo de electrones:** el "+4.5 misterioso" de cardio era **atribución de display**
    (dos awards 2.5+2.0 colapsados en un toast), resuelto en `reaction-toast-core.ts` con
    suite de tests (`reaction-toast-core.test.ts`). No hay doble-award en el motor de electrones.

---

## Cross-referencia a CC (no son mis hallazgos — evitar duplicar)
Tareas pendientes que caen en el audit de regresiones de CC / pantalla-por-pantalla:
- **#86** Placeholder duplicado Tipo Piel (Tipo 5 vs Tipo 4) — el cuestionario Fitzpatrick en sí
  está limpio; el bug está en el *render del resultado*, revisar `solar.tsx` / display de fototipo.
- **#87** Agenda 56 eventos duplicados.
- **#91** Swap `imageBn` no aplicó (imágenes Fable no se ven).
- **#92 / #94** Historia Clínica widgets fuera de cards / Mente borrador (se solapa con P2-1).
- **#130** Calibración scoring motor de frío x10->x5 (parte de #130 sigue abierta; el tag de
  fiebre ya está aplicado, ver punto 5).

---

*Fin del reporte. Auditor: agente doctrina/clínico + técnico transversal.*
