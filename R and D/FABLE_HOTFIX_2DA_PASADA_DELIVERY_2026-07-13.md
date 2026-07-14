# FABLE — HOTFIX SPRINT 2da pasada de device · DELIVERY (2026-07-13)

Branch: `fix/hotfix-2da-pasada` (6 commits sobre main). tsc limpio · 1534 tests pass.

## 🚨 1. CRASH Guía de laboratorios — FIXEADO (4ec8639 + c9d2224)

Sentry confirmó: `Cannot find native module 'ExpoPrint'` (fatal, unhandled).
**Causa raíz:** `labs-guide-service.ts` importaba `expo-print` a nivel de módulo →
`requireNativeModule` reventaba AL EVALUAR el import (al entrar a la pantalla),
antes de llegar al try/catch que solo protegía la llamada.

**Fix (defensa en profundidad, como pidió Enrique):** los 3 módulos nativos
(print/sharing/file-system) ahora se requieren LAZY dentro del try/catch. En
binario viejo: la pantalla abre normal, y al pulsar el botón PDF sale Alert
"actualiza a la última versión de la app". El fix real sigue siendo el
`eas build` (expo-print entra al binario).

Auditado: `expo-print` no tiene otro consumidor; `expo-sharing` (usado también
en edad-atp/result-preview) está en binario desde junio → no expuesto.

## 🧬 2. Rediseño DX (c4e9c60)

### (a) quality_level por densidad real
`computeDataDensityScore` (0-17) puntúa TODO lo que el motor ya cosechaba:
integral 3 · áreas hasta 3 · Braverman 2 · quizzes hasta 2 · labs 2 · historia
básica / hábitos / síntomas(≥3) / padecimientos / suplementos 1 c/u.
Nivel 2 con score ≥3, nivel 3 con score ≥6; **labs y genéticos siguen siendo
compuertas duras del 4/5**. Caso del tester (Braverman+quizzes+labs+síntomas+
sups sin cuestionario integral): antes nivel 1 → ahora nivel 4.
⚠️ El nivel recalculado aplica al REGENERAR (el `quality_level` persistido de
versiones viejas no se reescribe — append-only).

### (b) PDF entregable con identidad ATP
- `dx-html.ts` (puro, testeado): portada ATP, nivel con barras, síntesis,
  raíces con severidad/confianza, fuentes, "cómo subir de nivel", disclaimer.
- `dx-pdf-service.ts`: patrón labs-guide con **imports nativos lazy** (misma
  lección del crash). Archivo: `Diagnostico-Funcional-ATP-v{N}.pdf`.
- **"Actualizar" ahora regenera el análisis Y abre el share del PDF** de la
  versión recién persistida. Botón secundario "DESCARGAR / COMPARTIR PDF"
  para la versión vigente sin pagar regeneración.

### (c) CTAs de data faltante
Los chips de "qué te falta" ahora navegan: integral/áreas/hábitos →
`/historia-clinica[...]`, Braverman/quizzes → `/quizzes`, labs → `/labs-guide`.
Genéticos queda como chip "próximamente" (sin fuente hasta post-beta).

## 📋 3. Historia Clínica (dbddad6)

- **Mi Protocolo embebido (widget con lista viva) → card-link** EditorialCard
  a su pantalla propia `/salud/intervenciones`.
- **Resumen del expediente**: verificado — YA está dentro de card ELEVATION[1]
  desde hotfix-ux FIX 3. Si Enrique lo vio suelto, su binario no tenía el OTA.
- **Sistemas funcionales**: verificado — sigue dentro de card contenedora
  ELEVATION[1] con sistemas ELEVATION[2] (no se tocó).

## ☀️ 4. Fitzpatrick surfaced (5346ab5)

El cuestionario solo era alcanzable enterrado como card "Fototipo de piel" en
la lista de `/historia-clinica`. Ahora el selector de piel de **ATP SOL
(`/solar`)** — justo donde Enrique lo buscó — ofrece "Descúbrelo con el
cuestionario · 6 preguntas" → `/historia-clinica/fitzpatrick`, con el picker
manual debajo como "O elígelo manualmente".

## 🧭 5+6. Routing HOY → hubs de pilar (2dd1794)

Patrón "tap → hub del pilar, no acción directa" aplicado:
- proteína → `/nutrition` (antes /food-register)
- check-in, journal, meditación, breathwork → `/mente` (hub NUEVO; breathwork
  y meditación caían al pilar Mente VIEJO `/mind-hub` vía ELECTRON_ROUTES)
- fuerza, cardio → `/fitness-hub`
- agua/suplementos/ayuno/UV ya apuntaban a su hub (sin cambio)
- pasos (config de fuente en /settings) y sueño (/reports) se quedaron —
  no son "registro", avisar si también los quieres al hub
- `VERIFIED_ELECTRON_ROUTES` (tap en electrones verificados) también migró

## 🎨 Assets MJ — PENDIENTE de los PNG

Cuando Enrique pushee los 10 assets, swap en:
- `kit.tsx` L54 (`kit_comunidad`, hoy `imageBn: undefined`)
- `health-hub.tsx` HEALTH_HUB_IMAGES: labs_guide (reusa laboratorios),
  historia_clinica (reusa tests), sintomas (reusa mi-salud), padecimientos
  (reusa biomarcadores)
- Card A (`hh_diagnostico`, sin imageBn) y Card B (`hh_mi_protocolo`, nuevo)

## Estado

- Flag `INTERVENTIONS_DRIVE_HOY` sigue OFF (no se tocó).
- Sin migraciones SQL en este sprint.
- Pendiente: audit Cowork → merge a main → `eas build` (expo-print) + OTA.
