# 🎸 FABLE DELIVERY — Sprint ONBOARDING épico + Meet ARGOS

**Fecha:** 2026-07-11 (entregado 2026-07-09 — margen para review Mariana antes del deadline)
**Branch:** `feat/onboarding-epico-pre-beta` (5 commits granulares, listo para merge post-approval)
**Buzón origen:** `R and D/FABLE_SPRINT_ONBOARDING_EPICO_2026-07-10.md`

---

## ✅ Resumen ejecutivo

| Task | Estado | Commit | Tests |
|------|--------|--------|-------|
| T1 · Meet ARGOS copy final + typing + timing | ✅ | `48edefa` | +10 |
| T2 · Splash épico cinemático | ✅ | `e89e472` | +5 |
| T3 · Transiciones + progress line + skip | ✅ | `3c231de` | — |
| T4 · Copy onboarding → constants | ✅ | `7143e8b` | +5 |
| T5 · Celebración fin de onboarding | ✅ | `ac8d90c` | +8 |

- **Tests:** 1138 pasando (baseline ~1110 → **+28**, target era +5)
- **`npx tsc --noEmit`:** 0 errores · **ESLint** archivos tocados: 0 errores
- **Sin migraciones, sin cambios nativos** — todo el sprint sale por OTA (`eas update`)
- **NO se tocó** MAGIA ARGOS, MENTE ni NUTRICIÓN (solo la pantalla meet.tsx, que es de este flow)

⚠️ **Bloqueante de merge:** approval de Mariana al copy de Meet ARGOS (sección 2).

---

## 1 · Los 90 segundos, como quedaron

1. **Splash** (~2.7s): fondo negro, logo con breath, tagline "Sistema operativo de rendimiento" fade-in, dissolve a la app.
2. **Register/Login** — sin cambios (fuera de scope).
3. **Onboarding v2** (7 pantallas): línea de progreso que SE LLENA animada, back en todas menos welcome, skip discreto en goal y cronotipo, copy centralizado.
4. **Meet ARGOS** (~30-35s auto-avance, o menos con taps): 5 pantallas cinemáticas, typing effect, avatar que sube de intensidad.
5. **Aterrizaje en HOY**: overlay "Bienvenido, {nombre}. Aquí empieza." + 14 partículas lima suaves, fade out ~2s, floating ARGOS ya presente.

---

## 2 · ⚠️ Copy Meet ARGOS — para approval Mariana

Implementado **verbatim de la Propuesta A** en `src/constants/argos-meet-copy.ts`:

| # | Pantalla | Copy | Efecto |
|---|----------|------|--------|
| 1 | avatar idle | "Hola, {nombre}." | typing 40ms/char |
| 2 | avatar sube (speaking) | "Soy ARGOS." | typing |
| 3 | avatar pleno | "No soy una app.<br>Soy tu asistente humano." | typing |
| 4 | avatar a fondo (35% opacidad) | "Voy a estar aquí.<br>En la mañana, cuando tu cuerpo despierte.<br>En la noche, cuando decidas qué comer.<br>Y cuando algo no cuadre, seré el primero en notarlo." | aparece completa |
| 5 | cierre | "Ingeniería humana.<br>Empezamos." | pausa 1.1s → botón "VAMOS" |

**🚩 Flag para Mariana (decisión suya, no mía):** la frase **"Soy tu asistente humano"** puede rozar los guidelines de transparencia de IA de Apple/Google (un agente de IA no debe presentarse como humano). Si les preocupa para review de stores, alternativas que conservan el gancho:

- *"No soy una app. Soy ingeniería al servicio de tu biología."*
- *"No soy una app. Soy tu copiloto de rendimiento humano."*
- *"No soy una app cualquiera. Estoy hecho para conocerte."*

Si Mariana confirma la Propuesta A tal cual, no hay que tocar código: solo se mergea. Si cambia una frase, es 1 línea en el constant.

**Sensibilidad aplicada:** sin "me llamo ARGOS", sin diminutivos. Sin nombre capturado, degrada con gracia ("Hola." — sin coma huérfana, testeado).

---

## 3 · Detalle por task

### T1 — Meet ARGOS cinemático
- `app/argos/meet.tsx` reescrito a secuencia de 5 pantallas (era 1 estática). El guion completo (texto, timing, estado/escala/opacidad del avatar por pantalla) vive en `src/constants/argos-meet-copy.ts`.
- Typing ~40ms/char en pantallas 1-3; tap completa el texto, segundo tap avanza; auto-avance 6-8s por pantalla. Hint "Toca para continuar" solo en la 1ra.
- Avatar: idle → speaking → speaking pleno, con escala progresiva (0.82 → 1.0) y a fondo (opacidad 0.35) en la 4ta. Transiciones fade+slide-up 300ms.
- Se conservó intacto el contrato existente: `markArgosIntroduced` + `setIntroduced` + replace a tabs (MeetArgosGate para usuarios existentes sigue funcionando igual).

### T2 — Splash cinemático (~2.7s)
- `src/components/AtpSplash.tsx` + timing en `src/constants/splash.ts`.
- **Decisión técnica:** el splash NATIVO de Expo ya muestra el logo (asset en app.json; cambiarlo = build nativo, regla 10). Para que no haya salto, el overlay arranca con el logo **ya visible** (mismo asset, mismo negro) y expresa la entrada como **breath-in de escala** en vez de fade desde negro. Tagline entra a los 1200ms (spec: delay 400ms post-logo), hold 500ms, dissolve 450ms.
- Verificación visual pendiente de Enrique vía `eas update --branch preview` (yo no corro la app).

### T3 — Onboarding premium
- `OnboardingShell`: barra segmentada → **línea continua animada** que arranca en la fracción del paso anterior y se llena al entrar (Reanimated, 550ms) — el avance se ve, no se adivina.
- **Skip** discreto (top-right) con confirm suave ("Puedes completarlo después en Ajustes…") **solo en goal y cronotipo** — criterio: consent no se salta (legal), profile no se salta (alimenta Edad ATP), welcome necesita el nombre, cycle guarda modalidad con default, notifications ya tenía "Ahora no". El quiz de cronotipo completo existe en `/quiz/chronotype` para completar después.
- Back ya existía en todas las pantallas menos welcome (correcto). Slide horizontal 300ms ya venía del Stack root — verificado, no se duplicó.

### T4 — Copy centralizado
- `src/constants/onboarding-copy.ts`: TODAS las cadenas de las 7 pantallas + comunes (i18n-ready). Los textos de OPCIONES (objetivos, modalidades de ciclo, preguntas de cronotipo) siguen en `onboarding-v2-core.ts` porque son modelo de datos, no chrome.
- **Textos sin cambios de fondo** — consent sigue alineado al doc legal de Mariana. Propuestas de polish (deciden Enrique + Mariana, cada una es 1 línea si se aprueba):

| Pantalla | Actual | Alternativa propuesta |
|----------|--------|----------------------|
| Welcome subtitle | "…Empecemos por lo básico." | "…Empecemos por tu nombre." (más personal, anticipa el input) |
| Profile subtitle | "Con esto calculamos tu Edad ATP…" | "Cuatro datos. Con ellos calculamos tu Edad ATP y calibramos tus rangos desde el día 1." (justifica el form) |
| Goal subtitle | ok | — (claro y motivante) |
| Chronotype | ok | — (científico accesible vía CHRONO_META) |
| Cycle | ok | — (tone sensitive ya revisado en task #111) |
| Consent | ok | — (NO tocar sin Mariana; "sin letras chiquitas" es exactamente el tono correcto) |
| Notifications | ok | — (honesto, no manipulador: "Nada de spam") |

### T5 — Celebración
- `src/components/onboarding/OnboardingCompletion.tsx` (overlay global en `_layout`) + core puro testeado.
- Meet ARGOS encola al terminar; el overlay consume al detectar aterrizaje en HOY (`pathname === '/'`). One-shot, fail-quiet (si la app muere entre medias, simplemente no hay celebración).
- 14 partículas lima **deterministas** (secuencia áurea, sin `Math.random`), opacidad pico ≤0.7, ascenso suave — editorial, no cumpleaños. `pointerEvents="none"`: nunca bloquea HOY.
- **🚩 Flag menor para Mariana:** "Bienvenido, {nombre}." es masculino genérico (copy del brief). Si quieren, se puede generar "Bienvenida" según sexo biológico (dato disponible) o neutro "Te damos la bienvenida, {nombre}." — 5 min de cambio.

---

## 4 · Archivos tocados

**Nuevos:** `src/constants/argos-meet-copy.ts` · `src/constants/splash.ts` · `src/constants/onboarding-copy.ts` · `src/components/AtpSplash.tsx` · `src/components/onboarding/OnboardingCompletion.tsx` · `src/components/onboarding/onboarding-completion-core.ts` · 4 archivos de test.

**Modificados:** `app/argos/meet.tsx` (reescrito — lo pedía el brief) · `app/_layout.tsx` (+3 líneas: splash + celebración) · `src/components/onboarding/OnboardingShell.tsx` (progress line + skip) · las 7 pantallas `app/onboarding/v2/*.tsx` (strings → constants; goal y chronotype además ganan skip).

**Nota:** el hint `COWORK_HINT_T3_MEET_ARGOS_BUG_2026-07-09.md` ya estaba resuelto en main (MeetArgosGate + argos-intro-core, de MAGIA 2.0 T3) — verificado, sin acción.

---

## 5 · Cómo probar (Enrique)

1. `git checkout feat/onboarding-epico-pre-beta` → `eas update --branch preview` (⚠️ publica desde donde estás parado — hacerlo DESDE la rama).
2. Splash: cerrar y abrir la app → breath del logo + tagline + dissolve (~2.7s).
3. Flow completo: resetear tu usuario (`onboarding_step = 'v2_welcome'` y `argos_introduced_at = NULL` en supa) → register/login → 7 pantallas (mirar la línea de progreso llenarse, probar Saltar en objetivo y cronotipo, probar back) → Meet ARGOS (dejar correr el auto-avance una vez; probar taps otra) → celebración al caer en HOY.
4. Sin nombre: el guion degrada a "Hola." / "Bienvenido." — no debería verse coma suelta en ningún caso.

## 6 · Merge checklist

- [ ] Approval Mariana copy Meet ARGOS (sección 2 — incluye decisión sobre "asistente humano")
- [ ] Decisión "Bienvenido/Bienvenida" (sección 3·T5, opcional)
- [ ] Visto bueno visual de Enrique (splash + transiciones + celebración)
- [ ] Merge a main (fast-forward) → `eas update` desde main

Los primeros 90 segundos ya tienen ritmo. Ejecutado con cariño. 💛

— Fable (CCF5)
