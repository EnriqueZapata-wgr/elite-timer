# 🐺 MB-4 · ARGOS JARVIS (orb + voz) — Brief para CC

**Fecha:** 2026-07-18 · **Branch sugerido:** `feat/mb4-argos-jarvis`
**Prerequisito duro:** build nativo instalado (`eas build --profile preview --platform ios`). Este bloque NO se puede probar por OTA: necesita permisos de micrófono y background audio mode en el binario.

**Fuentes de verdad (leer ANTES de tocar código):**
- `R and D/SPEC_ARGOS_JARVIS_v1.md` — arquitectura de streaming, diálogos, system prompt
- Memoria de doctrina: `project_argos_personalidad_creer` (los 5 pilares) · `project_argos_como_jarvis`
- `docs/DESIGN_SYSTEM.md` — tokens, degradados, nada de lime brutalist legacy

---

## Decisiones de Enrique (2026-07-18) — CERRADAS

### 1. Voz: catálogo ElevenLabs, MASCULINA Y FEMENINA, elige el usuario
No es una voz: son dos, y es **preferencia del usuario**, no inferencia nuestra.

- Shortlist de 2 voces de catálogo en **español MX** (una masculina, una femenina) con calidad de mentor: cálida, con autoridad, NO locutor comercial ni robótica.
- Nueva columna `argos_voice` en `profiles` (`'masculina' | 'femenina'`), default `NULL`.
- Se elige en **Meet ARGOS** (primer encuentro) con preview de 1 frase por voz — que la escuche antes de decidir, no que elija a ciegas por etiqueta.
- Cambiable después desde ajustes de perfil. Si `NULL`, default `'masculina'` (ARGOS es nombre masculino) pero SIN asumirlo por `biological_sex` — el sexo del usuario no determina qué voz quiere oír.
- Los voice IDs van en variables de entorno / config del edge function, **nunca hardcoded en cliente**.

### 2. Orb: esfera translúcida lime→teal que respira
- Degradado con los 2 colores principales de ATP (tokens de `brand.ts`, cero hardcode).
- **Idle:** respiración lenta (~4s ciclo, ease-in-out). Presencia viva sin pedir atención.
- **Escuchando:** la esfera se abre/expande sutil.
- **Hablando:** waveform reactiva al audio, SOLO mientras habla.
- **Pensando:** rotación interna lenta, sin waveform.
- Respetar `prefers-reduced-motion` / la config de accesibilidad del sistema: si está activa, estados por opacidad/color, sin animación continua.
- 60fps en device real. Si no llega, simplificar antes que dejarlo jankeando — un orb que tartamudea mata la magia más que un orb simple.

### 3. Firma de voz: solo en Meet ARGOS, una vez
Se presenta en el primer encuentro y de ahí entra directo al grano. Nada de "Soy ARGOS" cada turno.

---

## ⚠️ Gate vivo que NO se toca en este bloque

El copy de Meet ARGOS lleva el flag de revisión (task #141). **No lo des por cerrado ni le quites el flag.** Hay dos frases pendientes de segunda pasada por tema de honestidad de IA:
- "No soy un chatbot" — literalmente falso.
- "Soy un mentor que ya recorrió el camino" — es la vivencia de Enrique, no de ARGOS.

Si en MB-4 tocas la pantalla de Meet ARGOS por la selección de voz, **deja el copy y el flag intactos**. La reescritura es aparte y la aprueba Enrique.

**Consecuencia directa para este bloque:** si el usuario puede elegir voz femenina, cualquier copy que ate la identidad de ARGOS a una vivencia masculina específica se rompe. Un motivo más para que esa reescritura pase.

---

## Alcance técnico

### Config nativo (primero, es lo que exige el binario)
- `app.json`: `UIBackgroundModes: ["audio"]` (iOS) + `NSMicrophoneUsageDescription` con texto honesto en español MX ("ATP usa el micrófono para que puedas hablar con ARGOS").
- Provider de `react-native-keyboard-controller` cableado en el root (ya está en deps, falta el provider).
- `expo-audio` (NO `expo-av`, está deprecado).

### Streaming (el corazón del "se siente vivo")
Objetivo: **primer audio en <2s.** La arquitectura va en el spec; lo no negociable:
- Token-stream del LLM → chunking por frase → TTS por chunk → reproducción encolada. No esperar la respuesta completa.
- **STT: Gemini audio-input.** NUNCA OpenAI/Whisper (doctrina `feedback_no_openai_preferencia`).
- Interrumpible: si el usuario habla, ARGOS se calla. Un asistente que no se deja interrumpir se siente sordo.
- Fallback de red: si el streaming falla, degradar a texto con mensaje honesto, nunca colgarse en silencio.

### Costos (H+)
Voz es la feature más cara por interacción. Aplica `project_features_premium_como_transaccion_hplus`: se cobra con H+, no se gatea por tier. Pro = all-you-can-eat. Instrumentar el consumo desde el día 1 — sin métrica no hay forma de calibrar el precio en H+.

---

## Invariantes (las de siempre)
`str_replace` quirúrgico · tsc verde vía CI · commits agrupados por tema · delivery doc al final · **cero borrado automático de filas del user** · migraciones idempotentes + RLS · `Constants.expoConfig.extra`, no `process.env` en cliente · voice IDs y API keys jamás en el bundle del cliente.

## Definición de terminado
1. Orb en sus 4 estados a 60fps en device real, con reduced-motion respetado.
2. Selección de voz M/F con preview funcionando y persistida.
3. Conversación de voz completa: hablas → ARGOS entiende → responde con primer audio <2s → puedes interrumpirlo.
4. Consumo de H+ instrumentado y visible.
5. Copy de Meet ARGOS **sin tocar**, flag intacto.
