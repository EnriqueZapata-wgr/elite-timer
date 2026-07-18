# 🚀 DELIVERY · AWAY RUN V2 (Fable, incremental)

**Inicio:** 2026-07-18 · **Branch:** `fix/mb0-cimiento` (continúa después de MB-0) · **Restricciones respetadas:** NO merge · NO OTA · NO db push (Enrique fuera 3 días).
**Orden pactado:** MB-1 (Corazón) → MB-2 (Suplementos) → MB-3 (Fitness). MB-4 ARGOS y build nativo NO se tocan.
**Gate por batch:** `tsc --noEmit` = 0 + vitest completo verde + CI verde en push. Los gates de DEVICE quedan pendientes para el regreso de Enrique (sin OTA no hay device test).

---

## ✅ MB-1 · CORAZÓN HOY / AGENDA / YO / EDAD-ATP + POLISH (COMPLETO — 6 commits)

### HOY-1 (P0) · cards meditación + journal de vuelta — `824bd4b`
**Causa raíz encontrada:** batch-1 (`ca8b305`) acopló la visibilidad de cards del HOY al protocolo del motor (`INTERVENTIONS_DRIVE_HOY`) con un `HOY_BASELINE_CARDS` que NO incluía `meditacion`/`journal` → solo aparecían si el protocolo las prescribía. Fix de una línea en `src/services/hoy/protocol-cards-core.ts` (entran al baseline universal) + test de regresión. El mecanismo de activación quedó intacto y es el correcto: son electrones VERIFICADOS — tap navega a `/meditation`·`/journal` y palomean con actividad real.

### EDAD-ATP (P1) + YO-1 · `1c9cf9d`
- **El signo estaba invertido en el diagnóstico**: la convención del motor V2 es `delta_anos = cron − integral` (POSITIVO = más joven, documentado en `types/motor-edad-atp-v2.ts:35`), pero `app/salud/diagnostico/index.tsx` lo leía al revés → le decía "7.2 años SOBRE tu edad real" a quien está 7.2 más joven. Corregido + caso "en línea con tu edad real". Verifiqué los demás consumidores: hero-recommendation y EdadAtpShareCard ya usaban bien la convención — solo diagnóstico estaba mal. **El cálculo NO estaba mal; era la lectura del signo en esa pantalla.**
- **YO-1**: card `EDAD ATP` como PRIMER dato del feed editorial de YO (`YoEditorialSection`), con edad biológica + delta correcto + imagen sex-aware (`pickEdadAtpImage`, ya existía). Con CE <30 → CTA de cálculo a `/edad-atp`. `edadResult` ya llegaba al componente desde `yo.tsx` (ignorado desde Mega-Sprint B) — solo se cableó.

### Agenda P3 · dedup residual + pasados · `43b8d63`
- Familias canónicas nuevas: `cardio` (Running ≡ Zona 2 aeróbica) y `desayuno` → `romper_ayuno` (los 2 solapes exactos del audit web P3-3). En el snapshot prod del test, la "Zona 2" de máquina ahora se retira frente al "Running" manual (dato del user sagrado) — snapshot actualizado 18→17 vivos.
- `day-compiler`: dedup del timeline de HOY por hora+familia canónica (antes solo nombre exacto).
- `AgendaMiniCard`: evento pendiente con hora ya pasada → atenuado (opacity 0.55) + label "Pasado" en vez de anunciar un recordatorio muerto (P3-4).

### Delfín (P1, doctrina #12) · `3569752`
**Hallazgo que corrige la premisa del brief:** Delfín NO fue borrado — sigue siendo 4º cronotipo en quiz/UI. Lo que faltaba: el MOTOR ya lo trata como estado transitorio (ancla Oso en `prescription-core`) pero la UI nunca lo decía. Ahora: resultado del quiz con aviso "estado temporal" + **cronotipo madre REAL** (mejor tendencia no-delfín de los scores en vivo) + ancla Oso del plan; Mi Cronotipo con bloque "MIENTRAS LO RESUELVES" (2-3 semanas → repetir test); card de YO "Estado temporal · ancla Oso". Sin migración (user_chronotype sigue guardando dolphin; CHECK 025 lo permite). **Deuda anotada:** el cronotipo madre real no se persiste (necesitaría columna → post-away-run con db push).

### HOY-2 (P1) · "Ajustar Mi Protocolo" · `11d17ee`
**Journey mapeado antes de tocar:** al entrar desde HOY la pregunta del usuario es "¿qué es MI protocolo?" — no administrar la máquina. Rediseño presentacional (motor y servicios intactos):
- MI PROTOCOLO (activas) sube a primera sección; propuestas del motor después.
- "TUS PRESCRITAS POR ATP" → "ATP TE PROPONE", **filtrando las ya activas** (cero cards duplicadas + nota "✓ N ya en tu protocolo").
- "Recalcular" → "Actualizar" / "Leyendo tus datos…".
- Copy sin regaño: "Cargas N · Menos, mejor" → "páusala sin culpa — sigue aquí para cuando toque"; cierre en positivo.

### Polish del loop (ex-MB-8) · `318ec4b`
`AnimatedPressable` (spring scale 0.97 en `onPressIn` — la primitiva YA cumplía el spec del brief) sustituye a los `Pressable` planos restantes del loop: FAB de Agenda, 5 cards del hub Edad ATP, 4 CTAs de result-preview, CTA del sheet de voz en HOY. Micro-iconos (dismiss/info) quedan planos a propósito.

### Verificación MB-1
| Check | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores (antes de cada commit) |
| vitest | **1790/1790 verdes** (2 tests nuevos: baseline HOY-1, snapshot cardio) |
| CI | ver run del push de esta rama |

### Pendiente device (gate MB-1 al regreso)
- [ ] Cards meditación/journal visibles y palomean con actividad real.
- [ ] Edad ATP: signo correcto en diagnóstico + 1er dato en YO.
- [ ] "Ajustar protocolo" se siente ATP (sin duplicados, sin regaños).
- [ ] Delfín: quiz → aviso temporal + madre; Mi Cronotipo → bloque ancla.
- [ ] Agenda: sin dupes Running/Zona2 ni Desayuno/Romper ayuno; pasados atenuados.
- [ ] Tacto: scale 0.97 en pointer-down en todo el loop.
- [ ] Rolling smoke 10 min + planear BUILD NATIVO ÚNICO post-MB-1 (spike e).

---

## ✅ MB-2 · SUPLEMENTOS USABLE END-TO-END (COMPLETO — 4 commits)

### Hallazgo que redefine SUP-3 (raíz)
El brief pedía "reactivar Sprint SUPS_DOSIS_MULTIPLES". Realidad verificada:
- El sprint viejo (doc 2026-07-10, tabla `user_supplement_doses`) **nunca se construyó** — lo sustituyó el diseño ligero del Sprint SUPS+BHA: `user_supplements.dose_times TEXT[]` + `supplement_logs.dose_index` (migración 188).
- **Verifiqué el remoto por SQL:** 188 SÍ está aplicada (columnas presentes, índice único nuevo `(user,supp,date,dose_index)` creado, constraint viejo dropeado). El backend está sano.
- **La raíz UX real:** NO existía flujo de EDICIÓN — una ficha creada con 1 toma jamás podía ganar la 2ª (AM+PM); solo quedaba borrar y recrear. Eso es "2 tomas no jala".

### SUP-2 + SUP-3 · `73a21ba`
- Sheet "Agregar" era un View fijo con 8 secciones — timing/razón/botón AGREGAR quedaban bajo el fold sin scroll ("dropdown hasta abajo, trabado"). Ahora: KeyboardAvoidingView (iOS) + ScrollView con tope + `keyboardShouldPersistTaps`; Nombre/Dosis/Tomas en el primer pantallazo, Forma/Marca abajo.
- **Edición de ficha** (✏️ por fila): mismo sheet en modo edición prellenado → UPDATE de tomas, dosis, timing, forma, marca, razón. Hint de lista actualizado.

### SUP-1 · `0659bf5`
Scan de suplemento (food-scan modo supplement) era solo informativo y se descartaba. Ahora **"Agregar a mi plan"**: crea la ficha prellenada (nombre, dosis diaria, forma, `source='scan'`). **Sello BHA automático SOLO con scan claramente limpio** (calidad ≥80 y cero red flags); un scan sucio NO auto-rechaza — eso lo decide el escáner BHA real desde la ficha (decisión clínica conservadora, documentada en código). CTA "Ver mi plan".

### SUP-4 · `e1d1a49`
Driver `supplement` en `generateAgendaEvents`: un evento de agenda por (suplemento × toma) — `dose_times[]` o el timing legacy — con hora mapeada (mañana 08:00 · comida 14:00 · tarde 17:00 · noche 21:00), categoría `suplementos` (imagen/tint ya existían) y recordatorio 10 min antes. La etiqueta va en el NOMBRE del evento para que 2 tomas del mismo suplemento no colapsen como una familia canónica. Reconcile de huérfanos (ficha editada/borrada → evento se desactiva; evento tocado por el user muta a `manual_override` y es sagrado). Notifs locales gratis vía `syncAgendaLocalNotifications` (sin `cancelAll`). **Sin migración:** `agenda_events.source` no tiene CHECK (verificado por SQL).

### #35 perf · `64b01f1`
4-5 round-trips por focus → 2 queries en paralelo (adherencia semanal y logs de hoy derivados de la misma lectura con los cores puros) + `useMemo` en agrupado y contadores.

### Verificación MB-2
tsc 0 · vitest **1790/1790** · remoto verificado por SQL (188 aplicada, sin CHECK en agenda_events).

### Pendiente device (gate MB-2 al regreso)
- [ ] Crear suplemento con 2 tomas AM+PM · editar ficha existente para añadir 2ª toma (✏️).
- [ ] Scan → "Agregar a mi plan" → card con datos + sello BHA si limpio.
- [ ] Sheet fluido con teclado abierto (botón AGREGAR alcanzable).
- [ ] Tomas aparecen como cards de agenda y el recordatorio dispara en background.

---

*(MB-3 se anexa abajo conforme cierre.)*
