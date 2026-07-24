# 🧠 SPEC · Módulo N-Back ATP (reverse-engineered de la app de referencia)

**Fecha:** 2026-07-23 · **Norte de UX:** la app que Enrique usa y ama (screenshots en el chat).
**Objetivo:** recrear un dual N-Back completo y pulido, con piel editorial ATP propia.
**Para el próximo away run de CC** (aparte del overhaul de Mente — no en el mismo branch).

---

## 0 · Antes de construir (CC): lee lo previo
Ya hay trabajo/decisiones ATP sobre N-Back. **No los contradigas — este doc es el norte de UX, esos son los parámetros ATP acordados.**
- Spec de investigación (task #6) y las 5 decisiones de Enrique (task #44) — busca en `R and D/` los docs de N-Back.
- **Migración 197 `nback_challenge`** ya está en remoto — revisa el esquema y construye sobre él (no dupliques tablas).

---

## 1 · Qué es
Dual N-Back: entrenamiento de memoria de trabajo. En cada turno aparecen DOS estímulos a la vez:
- **Posición visual:** un cuadro se ilumina en una celda de un grid 3×3 (8 posiciones, centro es crosshair).
- **Sonido:** se reproduce una letra hablada (1 de 8).

El usuario marca **Posición** si la posición actual es igual a la de **N turnos atrás**, y **Sonido** si la letra actual es igual a la de N atrás. Los dos son independientes y simultáneos. N sube con el desempeño.

## 2 · La experiencia (mapa de pantallas, según la referencia)
1. **Home del módulo:** week-strip (día seleccionado), card "Challenge X/20 · N días para completar · %", card "Today 0/12 · 20 min · %" con **Start session**.
2. **Countdown:** "Ready?" → "Set." → "Go!" — full black, texto grande, cero distracción.
3. **Gameplay:** header "Level N" + back. Grid 3×3 con crosshair al centro; un cuadro blanco se ilumina por turno. Abajo, dos botones circulares grandes: **Position** (izq) y **Sound** (der).
4. **Resultados ("A memorable start!"):** barra **Position %** y barra **Sound %**, con marcas de umbral en 75% y 90%. Card "**Level raised to N** · X rounds left for today · Continue". Tooltip del algoritmo.
5. **Stats (3 tabs):**
   - **Overview:** Total sessions · Longest streak · Highest level — cada uno con su **percentil vs todos los usuarios**.
   - **Challenge:** line chart de nivel a lo largo de los 20 días · Average level · Average visual % · Average auditory % · speed · sound on/off.
   - **Leaderboards.**
6. **Settings:** speed (1x…), sonido on/off.

## 3 · Mecánica exacta (para implementar)
- **Nivel adaptativo (verbatim de la referencia):** si **cualquiera** de los dos resultados < 75% → baja N. Si **ambos** ≥ 90% → sube N. En cualquier otro caso → N igual.
- **Sesión / round:** ~20 turnos por round. **12 rounds al día** (~20 min). Reto de **20 días**.
- **Timing:** estímulo visible ~0.5s + gap; intervalo total por turno ~2.5–3s en 1x (speed multiplica). Definir fino y exponer en settings.
- **Posición:** 8 celdas (grid 3×3 sin el centro).
- **Sonido:** 1 de 8 letras habladas (ver §6, las graba Enrique).
- **Scoring:** aciertos vs errores de posición y de sonido por separado → dos %.
- **N inicial:** 1 o 2 (la referencia arrancó en 3 tras varios; empezar en 2 para novatos, o el valor que diga la decisión #44).

## 4 · Piel editorial ATP (lo nuestro)
- La referencia ya es B/N minimal — alineado con el B/N editorial ATP. Sumar: acentos lime/teal, tipografía Barlow, el molde de cards ATP, háptica ATP en aciertos/level-up.
- **Full focus en el juego: cero ARGOS, cero nav flotante** (igual que el player de meditación).
- La "N coin" dorada de la referencia → ficha/ícono ATP propio.
- Countdown y resultados con el lenguaje ATP (cálido, directo), no genérico.

## 5 · Integración ATP (lo que la referencia NO tiene y nosotros sí)
- **Electrones:** completar la sesión diaria otorga **e-** (source nuevo, ej. `nback` o `cognicion`). Definir peso + gate (¿al completar los 12 rounds, o al menos 1 round?) + cap diario. Integra con la card de HOY + racha (mismo patrón que meditación).
- **Racha propia** del reto (la referencia ya la tiene) + alimentar la racha global ATP.
- **Percentiles y leaderboards:** requieren agregados server-side (RPC sobre las sesiones de todos los usuarios). Construir sobre mig 197.
- **Correlación cognitiva (roadmap):** task #115 investigó reaction time / TMT / Stroop para correlacionar — no en el MVP, pero deja el esquema abierto.

## 6 · 🎙️ AUDIO A GRABAR — TU PARTE, Enrique
Las **8 letras habladas** del flujo auditivo. Tú las grabas; yo te las proceso a nivel uniforme si quieres (como el pipeline de audio).

- **Qué:** 8 letras, dichas claras y aisladas, tono neutro (NO voz de meditación — solo la letra, limpia y seca).
- **Set propuesto (máxima distinción fónica en MX):** **A · O · U · efe (F) · ele (L) · eme (M) · erre (R) · ese (S)**. Mezcla vocales muy distintas con consonantes sonoras/fricativas para que no se confundan al ir rápido. Si al oírlas en el juego dos se parecen, las cambiamos.
- **Cómo grabar:** cuarto silencioso, misma distancia al micro, mismo volumen en las 8, una sola letra por archivo, ~0.5–0.7s cada una. 2–3 tomas de cada una y elegimos la más limpia.
- **Formato:** mono, WAV 44.1kHz (o el mejor que te dé tu grabadora). Sin efectos.
- **Nombres:** `nback_a.wav`, `nback_o.wav`, `nback_u.wav`, `nback_f.wav`, `nback_l.wav`, `nback_m.wav`, `nback_r.wav`, `nback_s.wav`.
- **Opcional (no bloquea el MVP):** un chime suave de acierto/level-up (podemos reusar un cuenco). El Ready/Set/Go va en texto, sin audio.

Cuando las tengas, me las pasas y las normalizo/recorto parejas, y CC las cablea al juego.

## 7 · Plan de build (CC · run aparte, después del overhaul)
1. Leer spec #6 + decisiones #44 + esquema mig 197 → reconciliar parámetros.
2. Motor del juego (lógica pura testeable: generación de secuencia, detección de match n-back, scoring, algoritmo adaptativo 75/90).
3. Pantallas: home del módulo, countdown, gameplay (grid + botones), resultados, stats (3 tabs), settings.
4. Backend: sesiones/resultados/racha/challenge sobre mig 197 + RPC de agregados para percentiles/leaderboards (idempotente, RLS).
5. Integración: e- + HOY + racha + entrada desde el pilar Mente (¿o pilar propio? definir con decisiones #44).
6. Piel editorial ATP + full focus.
7. `tsc` + tests verdes. NO merge — Cowork audita.

**Dónde vive:** ¿dentro de Mente, o módulo propio? Lo definen las decisiones #44 — CC lo confirma al leerlas.
