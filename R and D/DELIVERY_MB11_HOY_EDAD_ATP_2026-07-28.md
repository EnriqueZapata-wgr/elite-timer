# 📦 DELIVERY · MB-11 — HOY sólido + Edad ATP al molde editorial

**Rama:** `feat/mb11-hoy-edad` (worktree `../ATP-MB11`, desde `main` @ 66a5805)
**Fecha:** 2026-07-28 · **Estado:** los 6 tracks completos, un commit por track.
**Sin merge, sin tocar versión, sin `db push`.** Cowork audita.

| Track | Commit | Qué |
|---|---|---|
| A · Fantasmas de HOY (P0) | `6f7d7f9` | 14 queries chequean `{ error }` |
| D.1 · Componentes compartidos | `b2acfef` | Cascada a 11 pantallas |
| B · HOY al molde | `de93423` | −1,785 líneas, GradientCTA, wearable único |
| C · Bloque Zero | `fbcd3f2` | Calendario+barras+prefs+identidad+Año en /reports |
| D.2-D.4 · Clúster Edad ATP | `40cf131` | Cero neonGreen + hero editorial |
| E · Cierre | `b7a50ad` | day-compiler + huérfanos |

Verificación en cada commit: `npx tsc --noEmit` = 0 · eslint 0 errores (solo
warnings preexistentes; HOY pasó de 39 → 4) · **2,321 tests verdes** (21 nuevos).

---

## 1 · Las 14 queries de HOY — y cuáles fallaban DE VERDAD contra el remoto

**Las 14 quedaron con chequeo de `{ error }` + log** (patrón MB-6). El cruce
contra el esquema remoto (information_schema + índices únicos) dio la buena
noticia: **ninguna está fallando estructuralmente hoy**.

- Todas las columnas de las 16 queries existen en el remoto (`edad_atp_calculations.motor_version`, `supplement_logs.dose_index`, `journal_entries.journal_type`, `daily_plans.actions`, etc.).
- Los 4 targets de `onConflict` tienen su índice único: `daily_electrons(user_id,date)` · `argos_daily_insights(user_id,date)` · `user_day_preferences(user_id)` · `supplement_logs(user_id,supplement_id,date,dose_index)`.

Es decir: no había columna fantasma activa tipo MB-6 — el riesgo real era el
silenciamiento de 4xx de RLS/auth/red, que ahora deja rastro. Matices:

- Fallbacks corregidos para no confundir "sin datos" con "cero": en error se **conserva el estado previo** (lista de suplementos, `hasJournalToday`, `userSex`) en vez de pisar con vacíos falsos.
- Las escrituras primarias de `supplement_logs` (delete/upsert) ahora **lanzan al catch de rollback** (mismo patrón que `deErr` en toggleBoolean); los upserts de sync de `daily_electrons` solo loguean (el dato primario ya persistió; lanzar revertiría UI verdadera).
- **Plot twist del Track B:** 9 de esas 14 queries vivían en handlers/efectos de secciones ya amputadas del render (v13d-v13e) y murieron completas en `de93423`. El fix de A quedó en la historia y aplica a las 5 vivas: `edad_atp_calculations`, `argos_daily_insights` (select+upsert) y las 2 que ya chequeaban. La 6ª (client_profiles) también sigue viva y chequeada.

## 2 · HoyDayCard.tsx — confirmación de cero importadores

Verificado antes de retirar: `grep -r "HoyDayCard"` → solo su propia definición,
comentarios, y `HoyDayCardEditorial` (otro archivo). **Cero importadores.**
Retirado en `de93423`. Bonus del mismo linaje: **EditDayModal.tsx** — su único
importador era HOY y `editModalVisible` jamás se ponía en `true` (modal
inalcanzable) → retirado también. **daily-review-service.ts** — cero
importadores tras retirar su efecto muerto → retirado en `b7a50ad`.

## 3 · Edad ATP — pantallas migradas vs. pendientes

**Migradas: las 30 del clúster (100%). Quedan 0 pantallas con `neonGreen`.**

- D.1: `StopwatchTestScreen` + `QuestionnaireScreen` + `QuestionnaireQuestion` → cascada a 11 envoltorios (2 cronómetro + 9 cuestionarios).
- D.2: las 18 pantallas restantes (`index` 10 usos, `biomarkers` 9, `lab-confirmation` 7, `test-recovery-hr` 5, `test-old-man`/`cognitive` 4, `sub-edad/[key]` 3, `result-preview`/`composition` 3, `vitals`/`labs`/`cinematic-tests-index`/`questionnaires-index` 2, tests/balance·cooper·push-ups·reaction-time) + los 11 componentes restantes.
- D.3: `EDAD_STATUS.good` ahora deriva de `SEMANTIC.success` (el ancla raíz, cortada).
- D.4: el hub estrena hero editorial (ImageBackground `edad-atp-el/ella.jpg` sex-aware + overlay + número protagonista + CE stars; vacío que informa si no hay cálculo).
- Criterio de migración por rol: CTA principal → `GradientCTA` · CTA compacto → `ATP_BRAND.lime`+`onAccent` · estado hecho/seleccionado → `SEMANTIC.success`/`ATP_BRAND.lime` · dato heroico → `ATP_BRAND.lime` · acento sin rol → neutro.

## 4 · Track B — HOY al molde (lo que encontró el bisturí)

`app/(tabs)/index.tsx`: **2,123 → 1,021 líneas.** Lo enumerado por el
inventario se quedó corto: los CTA `#a8e02a` (`nextElectronBtn`, `retryBtn`)
eran **estilos muertos** — el barrido real retiró 105 estilos huérfanos (de 139),
7 handlers muertos (incluidos `toggleBoolean`/`onElectronTap`: los toggles viven
en las cards editoriales), 9 queries muertas, ~14 estados/refs y 15 imports.
- B.1: "Ajustar Mi Protocolo" → `GradientCTA` quiet (el único CTA vivo hardcodeado).
- B.3: `useWearableToday`/`fetchWearableToday` — una promesa por fecha compartida; YO y Sueño la consumen; el fetch de HOY alimentaba estado muerto y se fue.
- B.4: doc-comment reescrito a la estructura real (6 secciones editoriales + overlays).
- B.5: los datos duros duplicados estaban precisamente en las secciones muertas (suplementos/journal/agenda/daily review) — fuera; lo que queda son hábitos accionables gateados por visibilidad. Cumple doctrina.

## 5 · Track C — bloque Zero en /reports (sin ruta nueva)

Aterrizó en el hub que ya es la puerta del perfil (respeta la doctrina de YO de
no crear cards-link sin dato): calendario mensual de adherencia con puntos por
métrica (3 estados: color=meta · tenue=registrado sin meta · ausente=sin datos;
sueño lo dice la leyenda), `SimpleBarChart.colorByTarget` (hidratación/ayuno/
compliance), secciones personalizables (reordenar+ocultar, `@atp/reports_sections`),
card IDENTIDAD (racha actual + racha récord con regla de gracia, ayunos, ayuno
récord, entrenos; `null` → '—', nunca 0 falso) y toggle **Semana/Mes/Año/Todo**.
NO se adoptó upsell ni medidor de un solo macro. Cores puros con 21 tests.

## 6 · ⚠️ Flags para Enrique / Cowork

1. **Sin puerta para `active_*_electrons`:** con EditDayModal retirado no queda
   pantalla que escriba `user_day_preferences.active_boolean_electrons` /
   `active_quantitative_electrons`. `compileDay` sigue leyendo las persistidas,
   pero el **opt-in de nback** y la selección de electrones no tienen UI hasta
   cablear una nueva (¿en /salud/intervenciones?). Documentado en `day-booleans.ts`.
2. Deep links `/reports?period=3month` ahora caen a **Mes** (la pill "3 Meses"
   cedió su lugar a "Año" per SPEC).
3. Targets de barras en /reports siguen hardcodeados (2500ml/16h/75%) como ya
   estaban — unificarlos con las metas del usuario es un siguiente paso natural.
4. `mente/nback-core.ts` sigue siendo código muerto conocido (memoria V1.5.2) — no lo toqué, es de otro pilar.

## 7 · Checklist de device test por track

**A (fantasmas):**
- [ ] HOY carga con red normal: score, card AHORA, agenda preview, cards editoriales.
- [ ] En Sentry/logs no aparecen `[HOY] ... query failed` en operación normal.
- [ ] Toggle de suplemento en /supplements y verificar que HOY refleja el electrón.

**B (HOY):**
- [ ] Scroll completo de HOY: hero → TU DÍA → agenda → economía → cards → lectura semanal (domingo ≥19h) → "Ajustar Mi Protocolo" (nuevo look quiet con ícono) → navega a intervenciones.
- [ ] Toggle de un electrón desde su card editorial: check + score se mueven, sin regresión.
- [ ] YO y Sueño muestran su estado de wearable igual que antes (stub → vacío honesto).
- [ ] Domingo ≥19h: lectura de la semana renderiza (sus estilos sobrevivieron el barrido).

**C (/reports):**
- [ ] Pills Semana/Mes/Año/Todo cambian las gráficas; Año no truena con 365 puntos.
- [ ] Calendario: mes actual con puntos, ←/→ navega, → deshabilitado en el mes actual, hoy resaltado.
- [ ] Botón personalizar: subir/bajar/ocultar secciones persiste tras cerrar y reabrir la app.
- [ ] Barras de hidratación: día que cumplió meta a color, día que no en gris.
- [ ] Card IDENTIDAD con datos reales; usuario nuevo ve '—' y el copy de inicio.

**D (Edad ATP):**
- [ ] Hub: hero con imagen (el/ella según sexo), número si hay cálculo, CE stars; tap → result-preview.
- [ ] Un cuestionario (p.ej. Sueño): opciones con spring al tocar, GUARDAR RESPUESTAS degradado, respuestas previas precargadas.
- [ ] Plank o BOLT: cronómetro lima, Empezar/Detener/Reiniciar, GUARDAR RESULTADO degradado, modal "¿Cómo se hace?" con Entendido degradado.
- [ ] Biomarcadores / Composición / Vitales: GUARDAR degradado, badges "✓" en verde semántico.
- [ ] Reaction time: target verde al aparecer, resultado, Listo.
- [ ] Result-preview: COMPARTIR MI EDAD ATP degradado; share card se ve igual (lima por token).

**E (servicios):**
- [ ] Día nuevo: compileDay genera plan sin duplicar si ya existía (revisar logs).
- [ ] Item de agenda hecho en AGENDA aparece tachado en HOY.

## 8 · Dónde paré

**No paré — los 6 tracks quedaron completos.** La única pieza deliberadamente
NO hecha es la nueva UI de selección de electrones (flag #1 arriba): retirar el
modal muerto era Track B; diseñar su reemplazo es una decisión de producto que
no estaba en el brief.
