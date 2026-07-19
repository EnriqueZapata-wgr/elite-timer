# 🚀 MB-10 · ONBOARDING WOW + WELCOME TOUR POST-PAGO — Delivery

**Fecha:** 2026-07-19 · **Branch:** `feat/mb10-onboarding` (desde `feat/mb8-pulido`) · **CI:** tsc 0 errores · 1862 tests verdes (4 nuevos) · 2 commits

---

## El flujo post-pago (completo, de bienvenida a HOY)
`onboarding v2` (welcome → profile → goal → cycle → chronotype → consent → notifications) → **Meet ARGOS** (cinemática) → **selección de voz M/F** (nuevo) → **HOY** → **welcome tour editorial** (7 pilares, auto-dispara la 1ª vez). Todo skippeable, cero venta.

Buena parte del esqueleto ya existía (onboarding v2 termina en `/argos/meet` → `/(tabs)`). MB-10 aportó las dos piezas que faltaban para el WOW: la **selección de voz** dentro de Meet ARGOS y el **tour editorial** (antes era genérico).

## Qué se hizo

### 1. Meet ARGOS — selección de voz M/F con preview (commit 1)
Tras la cinemática (**copy #141 INTACTO**, ni una palabra tocada, flag vivo), nuevo paso `ArgosVoicePicker` antes de HOY:
- Orb (`ArgosAvatar`) que pasa a `speaking` mientras suena la muestra.
- Dos opciones (Femenina/Masculina) con **preview de audio real** vía `expo-speech` (TTS del dispositivo, pitch grave/agudo) — import perezoso, fail-soft (sin módulo nativo → no-op, nunca crashea por OTA).
- **"Saltar · elegir después" siempre visible** (guiado-no-prisionero).
- Persiste en `profiles.argos_voice` (migración **205**, idempotente, CHECK masculina/femenina).

### 2. Welcome tour editorial (commit 2)
`AppTour` era genérico (iconos, morado off-brand, hablaba de features: Electrones/Agenda/Reportes). Reconstruido:
- **7 pantallas full-bleed** (imagen editorial por pilar + overlay + kicker + **UNA idea**), `GradientCTA`, dots por token, **"Saltar" siempre visible**. Apetito, no manual de usuario.
- La **6ª pantalla depende del sexo**: CICLO solo para `female` ("tu fisiología tiene ventanas que un hombre no tiene"), COMUNIDAD para el resto. Nunca contenido de ciclo a un hombre (doctrina biological_sex de MB-7).
- Datos en **core PURO** `app-tour-core.ts` (sin RN/brand → testeable); el componente mapea `imageKey`→`require`. Test: 7 pantallas siempre, female ve CICLO y nadie más.

### Doctrina cumplida
- **Post-pago, cero venta**: no toqué ni añadí ninguna pantalla de pricing/venta. El único enlace externo (Tribu/Skool) ya existía en meet.tsx y no lo moví.
- **Guiado-no-prisionero**: voz y tour tienen "Saltar" visible sin culpa.
- **Copy Meet ARGOS #141**: intacto, flag no tocado.

## Qué NO se hizo (y por qué)
- **⚠️ MB-4 (orb glass lime→teal + voz propia ARGOS) NO está mergeado** — no existe rama `feat/mb4-*`. Construí contra la interfaz que YA existe (`ArgosAvatar`, SVG, estados idle/speaking/thinking) y contra el spec. **Gaps cuando MB-4 aterrice**: (a) el orb glass del spec reemplazará a `ArgosAvatar` en Meet ARGOS y en el picker — es 1 swap de componente; (b) el preview de voz pasará de `expo-speech` (TTS) a la voz real de ARGOS (ElevenLabs vía edge function J5) — es 1 cambio en `argos-voice-service.previewArgosVoice`. Ambos puntos de integración quedan aislados y anotados en el código.
- **Setup "más mínimo"**: el onboarding v2 ya pide solo lo esencial (sexo/DOB/altura/peso, goal, modalidad ciclo, cronotipo, consentimiento, push). No lo recorté más — quitar algo dejaría HOY sin sentido el día 1. Lo demás lo captura el Cuestionario Maestro con el uso, como manda la doctrina.
- **Imágenes del tour**: usé assets editoriales existentes (yo/, hoy-extra/, intervenciones/, health-hub/, cycle/, pillars/). No hay carpeta `assets/images/onboarding|tour` dedicada. Si quieres hero propios por pilar, es cablear nuevos `require` en `IMG` (AppTour) — assets pendientes MJ.
- **Swipe horizontal en el tour**: avanza por botón/tap (como el original). Un swipe paged sería un plus de motion; no crítico.

## Dudas para Enrique
1. **Migración 205 (argos_voice)**: requiere `npx supabase db push`.
2. **Preview de voz**: hoy es TTS del SO (pitch grave/agudo). ¿OK como stub hasta ElevenLabs, o prefieres ocultar el botón "Muestra" hasta tener la voz real?
3. **Copy del tour** (las 7 ideas): las escribí en tono "apetito". No es el copy #141 (ese es solo Meet ARGOS), pero si quieres que Mariana/tú lo revisen, está todo en `app-tour-core.ts` (un solo archivo, fácil de editar).
4. **Voz por defecto**: si el usuario salta, `argos_voice` queda NULL. ¿Quieres un default (p.ej. femenina) o que ARGOS pregunte de nuevo después?

## Checklist device (Enrique)
- [ ] Onboarding nuevo de punta a punta → Meet ARGOS cinemática → **pantalla de voz**: elegir Femenina/Masculina, tocar "Muestra" → se oye TTS y el orb se anima; CONTINUAR → HOY.
- [ ] En la pantalla de voz, "Saltar · elegir después" → va a HOY sin guardar voz.
- [ ] Primera vez en HOY → **tour editorial** de 7 pantallas con imagen por pilar; "Saltar" visible en todas; EMPEZAR cierra.
- [ ] Cuenta **masculina**: la 6ª pantalla del tour es COMUNIDAD (no CICLO).
- [ ] Cuenta **femenina**: la 6ª es CICLO.
- [ ] **Tras db push de 205**: la voz elegida queda en `profiles.argos_voice`.

## Commits
1. Meet ARGOS — selección de voz M/F con preview (+migración 205, ArgosVoicePicker, argos-voice-service)
2. Welcome tour editorial (AppTour reconstruido + app-tour-core puro + test)
