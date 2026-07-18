# 🗺️ Plan de Trabajo V1.X — Cierre Beta ATP

**Fecha:** 2026-07-11
**Contexto:** DX+Intervenciones aprobado. Fable ejecutando Fase 1. Enrique dijo "TERMINAMOS lo que se tenga que mover". Timeline flexible pero enfocado.

**5 tracks paralelos.** A = Fable/backend DX · B = Enrique+Mariana curación · C = Pre-launch beta · D = Post-beta V1.X · **E = COMUNIDAD (Fable paralelo)**.

---

## 🎸 TRACK A — Fable ejecuta (ruta crítica ~32-40h)

Ya arrancó. Sin acción tuya salvo aprobar en cada gate.

| Fase | Qué hace | Estatus | Gate Enrique+Cowork |
|---|---|---|---|
| **F1** Fundaciones | Migraciones 170-176 · vocab · catálogo scaffold · RLS · seeds H+ · cores puros · tests vitest · `tsc --noEmit` · commit local | 🟡 ~70% — verde para continuar cores+tests | Review de commit antes de push |
| **F2** Motor DX | `dx-engine` · `dx-quality-core` · prompt ARGOS `dx_generation` · Card A "Mi Diagnóstico Funcional" · extensión levantamientos (integral + 9 sublevantamientos) · tests | ⏳ Pendiente F1 | Review pantalla + prompt |
| **F3** Motor Intervenciones | `intervention-engine-core` (determinístico) · `intervention-service` · Card B "Mi Protocolo" · lista/detalle intervenciones · `<PrioritySemaphore>` · tests | ⏳ Pendiente F2 | Review UI + motor |
| **F4** Swap HOY/AGENDA | `day-compiler` lee intervenciones · `agenda-service` puebla `agenda_events` · feature flag `INTERVENTIONS_DRIVE_HOY` · doble-lectura · demote protocolo · tests | ⏳ Pendiente F3 · 🔴 riesgo alto | Review muy cuidadoso + prueba en device |
| **F5** Cerrar sistema | Síntomas aislados (tabla nueva `clinical_symptoms_aislados`) · Padecimientos (2 tablas) · Suplementos copy + BHA scanner · pulido | ⏳ Paralelo con F2 posible | Review copy + flujo BHA |

**Tiempo estimado Fable:** 32-40h ruta crítica, dentro de <72h. Paralelización real depende de tests pasando.

**Bandera Cowork monitorea:**
- Que Fase 4 vaya SIEMPRE detrás del feature flag antes del merge
- Que el "regalo del 1er DX" para users existentes quede modelado en Fase 4
- Que universales P1 se ajusten en F2/F3 al catálogo real que curen contigo+Mariana

---

## 🌐 TRACK E — COMUNIDAD estilo Strava (Fable paralelo, 12-20h EXPANDIDO)

**⚠️ Actualizado 2026-07-11 tarde:** Enrique acota "NO chat privado nunca" y expande a modelo Strava (amigos + perfil público + settings + buscador + feed + kudos).

**Doctrina base:** modelo Strava. Amigos, perfil público con settings granulares, buscador de usuarios, feed de actividad con kudos (no comentarios), Skool como único canal de conversación humana.

**Docs:**
- Doctrina: `spaces/.../memory/project_comunidad_atp_estilo_strava.md`
- Brief técnico para Fable: `R and D/FABLE_BRIEF_MAPA_COMUNIDAD_ESTILO_STRAVA_2026-07-11.md`
- Sprint original (parcialmente vigente): `R and D/FABLE_SPRINT_COMUNIDAD_PRIMER_PASO_2026-07-10.md`

**Proceso:** mismo que DX. Fable devuelve mapa → Enrique+Cowork aprueban → Fable ejecuta.

**No depende del DX** — corre paralelo con F2/F3. Migraciones desde **177+**.

### 🆕 E0. Amigos + perfil público + settings + buscador (NUEVA — la gorda)

Modelo Strava. Cowork le pidió el mapa a Fable en el brief. Piezas:
- **Amigos:** buscador, "agregar amigo", request bidireccional, lista amigos
- **Perfil público:** foto, nombre/alias, streak, electrones, badges, país opcional, cronotipo opcional, contador amigos, feed reciente
- **Settings visibilidad granular:** toggle por campo (aparecer en buscador, mostrar streak, electrones, badges, país, cronotipo, actividad, permitir solicitudes, foto)
- **Feed actividad amigos:** badges/streaks/rangos/día 100% (NO intervenciones/síntomas/labs/mood — nada clínico)
- **Kudos:** 3 emojis fijos (🔥👏🙏 o similares). Cero comentarios de texto libre.
- **Anti-abuso:** reportar/bloquear user

**Regla no-negociable:** ningún dato clínico (DX, intervenciones, síntomas, padecimientos, labs, suplementos, ciclo, journal, mood, Braverman, quizzes) es visible públicamente **jamás**.

### E1. Social proof visible cross-app (~90 min)

Mini-badges "N personas activas" en pantallas clave:
- **HOY** debajo ATP Score: "*342 personas midiéndose contigo hoy*"
- **Nutrición** header: "*158 personas registrando comida esta hora*"
- **Mente** header: "*89 personas escuchándose ahora*"
- **Fitness** header: "*212 personas moviéndose hoy*"

Query SQL agregada nightly, cache 1h, componente `<CommunityPresence pilar="X" />`. **Regla honesta:** si N<10, mostrar "*En comunidad · verifica pronto*". Cero números inventados.

### E2. Ranking + tu posición (~90 min)

Nueva pantalla `/comunidad/ranking`:
- Top 20 users por electrones (semana/mes/all-time)
- Tu posición destacada aunque estés en 500
- Por categoría: Journal / Fitness / Nutrición / Meditación
- Copy: *"Comunidad, no competencia — así van los que caminan contigo"*

**Privacy:** toggle opt-out en Settings. Migración **177** con `leaderboard_display_name` + `show_in_leaderboard BOOLEAN DEFAULT true`. Accesible desde HOY footer + Card MI ATP.

### E3. Skool bridge (~60 min)

Botón "**Únete a la Tribu ATP**" en:
- Settings > Comunidad
- HOY (footer)
- Meet ARGOS pantalla 5 (final, después del Meet)

Copy botón: "*Comunidad de gente como tú*". Acción v1: abre browser con URL Skool (`WebBrowser` Expo). Auth bridge automático = V1.5.

**Sublínea a agregar en Meet ARGOS pantalla 4** (ya coherente con doctrina nutriólogo cabecera):
> *"Y cuando yo no pueda,*
> *hablas con tu nutriólogo clínico."*

### E4. Copy diferenciador "humano vs algoritmo" en 3 puntos

- **Settings > Comunidad (sección nueva):** *"Nuestra IA nunca finge saber lo que se siente sentir. Y no reemplaza a tu nutriólogo clínico. Por eso somos comunidad, no algoritmo. [Únete a Tribu ATP]"*
- **Check-in emocional:** si mood <4 por 3+ veces/semana → *"Escucharte importa. Cuando quieras, la Tribu está aquí."*
- **RateLimitCard (al tope ARGOS):** *"O si prefieres hablar con humanos ahora mismo, la Tribu está en Skool."*

### Fuera de scope V1 (van a V1.5 o nunca)

- ❌ **Chat entre users in-app (NUNCA — ni V1.5)**
- ❌ Comentarios largos en feed (solo kudos)
- ❌ Compartir información clínica de cualquier tipo
- ❌ Retos con inscripción (V2 quizás)
- ❌ Auth bridge automático Skool (V1.5)

---

## 👥 TRACK B — Enrique + Mariana curación (paralelo)

Estas van sin depender de Fable. Cada una tiene deadline suave pero real.

### B1. Curación catálogo intervenciones (💛 core clínico)

**Doc:** `Business development/Beta_Launch_Kit/09_CATALOGO_INTERVENCIONES_MARIANA_ENRIQUE.md`

- Estructura: 8 campos por intervención (nombre, cómo, beneficio, categorías múltiples, raíces múltiples, modalidades opcionales, cuándo asignar, prioridad)
- Sin cuota, sin orden fijo
- **Bloqueador soft para Fase 3** — el motor puede correr con placeholder pero la beta necesita catálogo real
- **Suggested:** apuntar a 30-50 intervenciones curadas antes del swap final. Post-beta se expande.

**Sesión sugerida:** 1-2 sesiones de 90 min contigo+Mariana. Enrique manda doc lleno → Cowork convierte a `interventions-catalog.ts`.

### B2. Universales P1 confirmar con Mariana (~30 min)

**Task #21**. Los 5 aterrizados hasta ahora:
1. Hidratación matutina (500ml al despertar)
2. Exposición solar 10 min 7-9am
3. Recordatorio de dormir (calculado cronotipo)
4. Recordatorio de comer (calculado cronotipo + ventana ayuno)
5. Apagar pantallas 30min antes de dormir (pending validar)

Mariana confirma #5 y agrega si algo más obvio se coló. Cowork los codea en el catálogo.

### B3. Revisión copy compact con Mariana (~45 min)

**Doc:** `Business development/Beta_Launch_Kit/06_COPY_MARIANA_REVIEW_COMPACTO.md`

- Meet ARGOS 5 pantallas
- Saludos por hora del día
- Reacciones (habits/caídas/hitos)
- RateLimitCard
- Errores ARGOS
- Prompts check-in emocional
- Contraindicaciones breathwork
- Disclaimers onboarding

Sesión ya planeada con Mariana. Copy vive en device después del review → aplicable vía OTA.

### B4. Merge ONBOARDING vs HARDENING (cabo suelto tuyo)

**Task #16.** Ya resuelto `meet.tsx`. Confirmar `notifications.tsx` OK y hacer push. ~15 min tú solo.

### B5. Decisión final sobre BHA copy marketing

BHA va en sprint SUPS con Fable. **Pero para marketing** (brief comercial + feature map), ¿lo comunicamos en V1 desde día 1 o esperamos que funcione end-to-end antes de ponerlo en pitch?

Recomendación Cowork: comunicarlo como "próximamente" en V1, feature killer en V1.1. Mariana lo aprueba clínicamente antes de anunciarlo público.

### B6. Confirmar URL definitiva Skool + espacio comunidad activo

Track E necesita URL real de Skool (`skool.com/tribu-atp` o el nombre final del grupo). Si el espacio Skool no está creado/activo → crearlo con branding ATP mínimo antes del launch beta (grupo cerrado 5-9 testers primero, luego abre público).

---

## 🚀 TRACK C — Pre-launch beta (post-F5)

Actividades técnicas + comms para arrancar beta real. Se pueden preparar en paralelo con Track A.

| # | Actividad | Owner | Deadline |
|---|---|---|---|
| **C1** | Sentry source maps upload (`npx sentry-expo-upload-sourcemaps dist`) | Enrique | Post-merge F4 |
| **C2** | Prueba end-to-end en device físico (iOS + Android) | Enrique + tú testeando en persona | Post-merge F4 |
| **C3** | SQL boost testers (`Business development/Beta_Launch_Kit/05_SQL_BOOST_TESTERS.md`) | Enrique | Día del launch |
| **C4** | Runbook launch day (`07_RUNBOOK_SABADO_LAUNCH_DAY.md`) actualizado con nueva ruta DX | Cowork actualiza | Antes del launch |
| **C5** | Comunicaciones testers (`08_COMMS_POSTBETA_TEMPLATES.md`) — refinar copy con doctrina nueva "Mi Diagnóstico Funcional" | Cowork actualiza | Antes del launch |
| **C6** | OTA push vía `eas update --branch preview` | Enrique | Momento del launch |
| **C7** | Native build si algo lo requiere (verificar `expo-print`/print-to-pdf) | Enrique | Pre-launch si aplica |
| **C8** | Grupo WhatsApp / Discord privado 5-9 testers | Enrique + tu red | Días previos |

---

## 🔧 TRACK D — Post-beta V1.X (2-4 semanas después)

Iteración según feedback + roll-out de features que no cupieron en beta cerrada.

### D1. Iteración según feedback beta
- Bug fixes urgentes reportados por testers
- Ajustes de copy/UX que salgan en test
- Ajustes al catálogo de intervenciones según lo que active la gente

### D2. Features que probablemente esperan V1.1

| Feature | Complejidad | Prioridad |
|---|---|---|
| ARGOS `intervention_rationale` (Pro opcional — narrativa "por qué estas intervenciones") | Media | 🟡 |
| Vigencia inteligente labs (post-docs Mariana research) | Alta | 🟢 futuro |
| Sintomas pattern detection (Argos detecta patrones en agregado) | Media | 🟡 |
| Cross-parameter analysis labs | Alta | 🟢 futuro |
| Protocolos expandidos (viajes, jet-lag, retiros) | Baja-Media | 🟡 |
| Coach proactivo módulo (dogfood Enrique) | Alta | 🟢 futuro |
| **Comunidad V1.5:** retos con inscripción + auth bridge Skool + sugerencias amigos avanzadas | Media | 🟡 |

### D3. Marketing arranque (soft launch 1 agosto)

- Landing somosatp.com con Founders Pro
- Founders escalera $4,990-9,990
- Contenido IA fábrica arranca (4 líneas × 3 canales)

---

## 📊 Vista sinóptica

```
    HOY (2026-07-11 viernes)
       │
       ├── Track A: Fable DX F1 → F5 (32-40h) ──────────────────────┐
       │                                                              │
       ├── Track E: Fable COMUNIDAD Sprint (4-6h) ────────paralelo──▶│
       │     ├── E1 Social proof cross-app                           │
       │     ├── E2 Ranking + tu posición (mig 177)                  │
       │     ├── E3 Skool bridge                                     │
       │     └── E4 Copy "humano vs algoritmo"                       │
       │                                                              │
       ├── Track B: Enrique + Mariana curan (paralelo)              │
       │     ├── B1 Catálogo intervenciones (bloqueante soft F3)     │
       │     ├── B2 Universales P1 (30 min)                          │
       │     ├── B3 Copy review con Mariana (45 min)                 │
       │     ├── B4 Merge cabo suelto (15 min Enrique)               │
       │     ├── B5 Decisión BHA marketing                           │
       │     └── B6 URL Skool + grupo Tribu ATP activo               │
       │                                                              ▼
    TRACK C: Pre-launch beta (post F5+E) ────────────────────  BETA CERRADA
       │     ├── Sentry sourcemaps                                    │
       │     ├── Test device                                          │
       │     ├── Boost testers                                        │
       │     ├── Comms + invite a Skool                               │
       │     └── OTA push                                             │
       │                                                              ▼
                                                             FEEDBACK 5-9 testers
                                                                      │
    TRACK D: V1.X iteración (2-4 semanas) ────────────────────  SOFT LAUNCH 1 AGO
```

---

## 🎯 Tu semana ideal

### Lunes-Martes
- Fable trabaja F2-F3 en background
- Tú: sesión con Mariana curación catálogo (B1) — 90 min
- Tú: merge cabo suelto (B4) — 15 min

### Miércoles-Jueves
- Fable trabaja F4-F5 en background
- Tú+Mariana: universales P1 + copy review (B2+B3) — 90 min
- Tú: primer pass test device con F2-F3 mergeado a preview

### Viernes-Sábado
- Fable termina F5
- Tú: end-to-end test en device (C2)
- Tú: sourcemaps + boost testers (C1+C3)
- Tú: OTA push (C6)
- **Launch beta cerrada**

### Semana siguiente
- Iteración según feedback
- Preparación soft launch 1 agosto

---

## ⚡ Cosas que Cowork monitorea sin que preguntes

- Que Fable no salte fases sin gate
- Que el catálogo se ingrese en el orden que Mariana lo cure
- Que las decisiones docs en memoria queden actualizadas si algo cambia
- Que la doctrina no se contradiga en copy/UI (nutriólogo cabecera, suplementos no recomendación, cero fármacos)
- Alertas si Fable propone algo que rompe la doctrina — pausa y peloteo

---

## 📋 Tasks vivas al día de hoy

| # | Task | Estatus | Owner |
|---|---|---|---|
| #11 | UI Historia Clínica v2 | En Fable F2/F3 | Fable |
| #12 | Levantamientos (choncho + 9 áreas) | En Fable F2 | Fable |
| #13 | Vigencia inteligente labs | Post-beta | Mariana research |
| #14 | Síntomas aislados | En Fable F5 | Fable |
| #16 | Merge conflict ONBOARDING vs HARDENING | Cabo suelto | Enrique |
| #17 | Padecimientos 2 tablas | En Fable F5 | Fable |
| #21 | Universales P1 confirmación | Pendiente | Mariana + Enrique |
| #22 | Sprint COMUNIDAD Primer Paso (T1-T4) | Pendiente | Fable paralelo F2/F3 |

Tareas nuevas que pueden emerger — Cowork las crea sobre la marcha.

---

*Documento vivo. Se actualiza cuando Fable reporte cada gate.*

— Cowork
