# FABLE 5 CC — MEGA-SPRINT UX BLOCKERS V1.3

**Kickoff:** 2026-07-06
**Autor:** Cowork (Sonnet Cowork mode, tú eres Fable 5 CC)
**Working directory:** `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable` (worktree separado — no compartir con Cowork main)
**Branch base:** `main` (recién mergeada AGENDA-COMPLETE)
**Objetivo:** cerrar los 4 BLOQUEANTES de UX para submit stores V1.3

---

## 🚨 REGLAS DE ORO ESTE SPRINT

1. **NO OTA / NO BUILD** — solo merge + push. Enrique testeará en batch cuando avises que ya está TODO listo. Verificar con `npx tsc --noEmit` + tests. Si necesitas OTA para verificar algo, avisa explícito y espera decisión.

2. **Verifica cwd antes de cualquier commit:**
   ```powershell
   pwd  # debe ser EliteTimer-Fable
   git branch --show-current
   ```

3. **git worktree activo** — Cowork trabaja en `EliteTimer` main branch, tú en `EliteTimer-Fable`. Sin colisiones si cada uno respeta su directorio.

4. **Migraciones idempotentes** (IF NOT EXISTS / ON CONFLICT DO NOTHING).

5. **Range de migraciones Fable:** 150-199. Cowork usa 100-149.

6. **Doctrina Mariana ya capturada** — si tocas algo del backend clínico, respeta [[project_hub_fx_consulta]] y [[project_mariana_vision_backend]].

---

## 📋 SCOPE — 4 FEATURES EN UNA BRANCH

Crear branch: `feat/v13-ux-blockers`

### F1 — 🐛 Braverman CRÍTICO (task #89 en TodoList Cowork)

Bugs bloqueantes de UX en test Braverman:

**Bug F1.1: Flicker al cambiar pregunta**
- Síntoma: al avanzar/retroceder, pantalla parpadea (frame vacío antes de renderizar nueva pregunta)
- Causa raíz probable: re-mount del componente en lugar de re-render con nueva state
- Verifica: `src/screens/tests/BravermanScreen.tsx` (o donde viva)
- Fix: usar key estable + animación fade sutil entre preguntas (Reanimated shared value)

**Bug F1.2: No hay botón atrás dentro del quiz**
- Usuario no puede volver a pregunta anterior si se equivocó
- Fix: agregar botón "Atrás" en header O gesto swipe right
- Persistir respuestas parciales para no perder progreso al volver

**Bug F1.3: Rediseño editorial**
- Actualmente diseño es "quiz genérico"
- Debe alinear con doctrina editorial ATP:
  - Fondo B/N cinematic (imagen ambient sutil de Braverman categoría)
  - Tipografía editorial (misma familia HOY)
  - Card de pregunta como pieza aislada con espacio generoso
  - Botones respuesta grandes con hover/press states
  - Progress bar minimal (no gamer chunky)
  - Al terminar: reveal editorial de reporte (fade + escalado sutil)

**Deliverable F1:**
- Sin flicker verificable en simulator + test unitario
- Botón atrás funcional + persistencia
- Diseño editorial validated contra `docs/DESIGN_SYSTEM.md`
- Migración si necesita persistir progreso parcial (idempotente)

---

### F2 — 🎨 Onboarding v2 completo (task #110)

Reemplaza el onboarding v1 actual con 7 pantallas + tour post-pago. Ver memoria [[project_app_welcome_tour]] y task #110 completa.

**Estructura (7 pantallas + tour):**

1. Bienvenida (nombre + foto opcional)
2. Perfil base (sexo biológico, fecha nac, altura, peso — obligatorio Edad ATP)
3. Objetivo principal (longevidad/composición/energía/deporte/preparación)
4. **Modalidad Ciclo** (task #111 — ver spec ahí)
5. Cronotipo rápido (test 4-5 preguntas)
6. Consent médico + disclaimers firma
7. Notifs permission (con explicación clara)
8. Tour por la app (3-5 pantallas overlay: HOY, pillars, ARGOS, agenda, wallet)

**Setup diferido (opcional posponible):**
- Braverman completo, quizzes funcionales, labs, biometrías detalladas, historia clínica, suplementos, dispositivos

**Requiere:**
- **MATAR** motor v1 + `edad-atp.tsx` + `chronotype.tsx` de onboarding (memoria [[project_app_welcome_tour]])
- Nueva ruta `/onboarding/v2/...` estructura
- Persistir progreso (poder salir y volver)
- Migración `152_onboarding_v2_step.sql` idempotente para trackear step actual

**F2.1 — Settings > Modalidad de Ciclo** (task #111 dentro del sprint):

Configurable en onboarding paso 4 + accesible desde Settings post-onboarding:

- Si sexo=mujer:
  - Ciclo regular (default)
  - Embarazo (activa máscara global — task #85)
  - Perimenopausia/Menopausia
  - Sin ciclo (SOP, histerectomía)
- Si sexo=hombre:
  - Vincular con pareja (companion insights)
  - Desactivar módulo Ciclo (default)

Migración: agregar `user_profiles.cycle_modality` ENUM.

**Deliverable F2:**
- 7 pantallas + tour funcionando
- v1 muerto (grep confirma sin referencias)
- Ciclo modality con migración + Settings UI
- Verificable en simulator + tests

---

### F3 — 🩺 Historia Clínica output claro (task #77)

Actualmente Historia Clínica es "captura pero output confuso" — Enrique dijo *"no genera output claro"*.

**Objetivo:** convertir Historia Clínica en **expediente vivo con output legible** para el paciente + el clínico.

**Fixes:**

1. **Rediseño pantalla Historia Clínica:**
   - Header: resumen ejecutivo generado por ARGOS (task #92 memoria persistente si aplica)
   - Secciones colapsables por sistema funcional (7 sistemas de Mariana — memoria [[reference_7_sistemas_funcionales]])
   - Cada sección: síntomas registrados + severidad + timeline
   - Botón "Añadir síntoma" con quick input
   - Botón "Ver reporte ARGOS" que abre análisis cross-sistema

2. **Output claro:**
   - Al hacer tap sobre un sistema → drill-down con:
     - Síntomas registrados
     - Correlación con otras cosas (labs, hábitos, ciclo si aplica)
     - Recomendaciones ARGOS (si Pro)
     - Historial de cambios

3. **Nice-to-have (si alcanza tiempo):**
   - Editar histórico (marcar síntoma resuelto)
   - Exportar PDF resumen historia clínica (para llevar a médico externo)

**Verifica:**
- Que output se renderice sin errores (previamente reportado)
- Sin loops de renders
- Sin datos vacíos causando crashes

**Deliverable F3:**
- Pantalla Historia Clínica con output claro y editorial
- Al menos las 7 secciones funcionales visibles
- Drill-down básico funcional
- Sin bugs de render/loops

---

### F4 — 🧪 Labs pulido (task #78)

Bugs conocidos en módulo Labs:

**F4.1: Dominios/rangos:**
- Rangos funcionales no siempre visibles
- Comparación con rangos poblacionales vs. funcionales confusa
- Fix: card por lab con:
  - Valor actual
  - Rango funcional (verde) vs. rango poblacional (gris)
  - Tendencia (última 3 mediciones)
  - Interpretación ARGOS 1-línea

**F4.2: Gráficas:**
- Actualmente gráficas se cortan o no muestran bien
- Fix: usar Recharts o Victory (verificar si ya está) con contenedor responsivo
- Time-series por parámetro (memoria [[project_labs_corazon_atp]])
- Toggle "solo funcional" vs "todos los rangos"

**F4.3: Idiomas:**
- Algunos labels en inglés, otros español (mixed)
- Fix: unificar en español (i18n infra Fase 1 aún no, hardcode español)

**F4.4: Valores NULL forward-fill:**
- Cuando un lab no se midió una fecha, la gráfica hace bajada a 0 en vez de mantener último valor
- Fix: forward-fill del último valor conocido O mostrar gaps como área punteada
- Preferencia: forward-fill visualmente conectado

**F4.5: Motor de lectura de labs (memoria [[project_labs_corazon_atp]]):**
- Bug previo: leía solo último panel (`.limit 1`), descartaba data
- VERIFICAR que fix ya está aplicado con arquitectura time-series canónica
- Si no está: refactorear a "último por parámetro, viejos flaguean no se borran"

**Deliverable F4:**
- Cards labs editoriales con rangos funcionales destacados
- Gráficas time-series funcionales con forward-fill
- Todos labels en español
- Motor lectura verificado no descarta data

---

## ⚙️ REQUISITOS TÉCNICOS TRANSVERSALES

1. **No romper HOY / Agenda / TU DÍA** — cambios visuales, no tocar lógica core que no pertenezca al scope
2. **Respetar helper `generateUUID`** (regla CLAUDE.md #2) — no `crypto.randomUUID`
3. **Respetar `getLocalToday()` / `parseLocalDate()`** para fechas (regla #3)
4. **RLS obligatoria** en cualquier tabla nueva (regla #4)
5. **DeviceEventEmitter emissions** apropiadas post-cambio (reglas #5, #6):
   - Cambios de estado onboarding → emitir `onboarding_step_changed`
   - Cambios en historia clínica → emitir `clinical_history_changed`
6. **`Constants.expoConfig.extra`** para env vars (regla #7)
7. **`npx tsc --noEmit`** antes de cada commit
8. **Tests unitarios** para nuevas funciones críticas (mínimo happy path)
9. **Migraciones idempotentes** obligatorias con IF NOT EXISTS

---

## 📦 ENTREGABLES ESPERADOS

Al terminar, en la branch `feat/v13-ux-blockers`:

1. Commits limpios agrupados por feature (F1, F2, F3, F4)
2. Tabla de features × commits × migraciones × verificaciones (como AGENDA-COMPLETE)
3. Migraciones 152-155 (o rango que uses) aplicadas al remoto
4. `npx tsc --noEmit` = 0 errores
5. `vitest run` = todos passing
6. Push a origin, listo para audit Cowork
7. Reporte de decisiones de criterio con razones
8. Scope no cerrado listado (con por qué)

---

## 🎯 ESTIMACIÓN

- F1 Braverman: 4-6 horas
- F2 Onboarding v2 + Modalidad Ciclo: 8-12 horas
- F3 Historia Clínica output: 4-6 horas
- F4 Labs pulido: 4-6 horas
- **Total: 20-30 horas de trabajo intenso, ~3-4 días**

Fable, si detectas que alguna feature es más chica/grande que estimado, ajusta y avisa en el reporte final. Si algo bloquea (dep circular, requerimiento que necesita decisión de Enrique), pausa esa feature y sigue con las otras — no bloquees todo el sprint.

---

## 🚫 FUERA DE SCOPE (NO TOCAR)

- ARGOS backend / argos-proxy (Cowork lo lleva por separado)
- HUB Fx Consulta / backend clínico v1.5 (no aplica hasta V1.5)
- Sistema Afiliados wallet (Cowork lo hará)
- Business Dashboard (Cowork lo hará)
- Push notifications infra (ya cerrado en AGENDA-COMPLETE)
- Widgets nativos (V1.4)
- Siri Shortcuts (V1.4)

Si algo del scope requiere tocar estas áreas, párate y consulta con Enrique/Cowork antes.

---

## 🔗 REFERENCIAS

- `CLAUDE.md` — reglas técnicas del repo
- `docs/DESIGN_SYSTEM.md` — criterio UI/UX obligatorio
- `R and D/MARIANA_VISION_BACKEND_CLINICO_2026-07-06.md` — contexto sprint clínico (no tocas ahora, pero contexto)
- `R and D/PLAN_MAESTRO_LANZAMIENTO_JUL2026.md` — plan maestro donde encaja este sprint

Memorias relevantes (accesibles vía Cowork memory system):
- [[project_app_welcome_tour]] — onboarding post-pago
- [[project_atp_embarazo_modulo]] — máscara global embarazo
- [[reference_7_sistemas_funcionales]] — framework Mariana
- [[project_labs_corazon_atp]] — motor labs central
- [[feedback_customer_journey_antes_de_redisenar]] — cuando hay "torpe" hacer CJ audit
- [[feedback_simple_vence_inteligente]] — UX doctrine

---

## 🏁 KICKOFF

Fable, al leer este spec:

1. Confirma que estás en `EliteTimer-Fable` (worktree separado)
2. Crea branch `feat/v13-ux-blockers` desde main
3. Corre `npm install` (primera vez en el worktree)
4. Verifica `npx tsc --noEmit` = 0 errores baseline
5. Arranca F1 (Braverman crítico) — es el bug bloqueante más chico y desbloquea
6. Después F3 (Historia Clínica) — bug de output claro
7. Después F4 (Labs) — pulido
8. Después F2 (Onboarding v2) — el más grande, cierras el sprint

Reporta cuando termines. Sin OTA. Solo merge+push.

**Vamos a hacer que ATP sea HYPER PERRA. A trabajar.** 🚀
