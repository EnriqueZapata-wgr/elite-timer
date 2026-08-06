# 🌙 AWAY RUN · MB-7 — Plano fluido · Check-in · Entrenamiento · Mente (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb7-away-run` desde `main`. NO merge, **NO tocar la versión**, **NO `db push`**. Cowork audita todo antes de que nada toque el remoto.
**Origen:** device test de Enrique sobre el OTA de MB-6 (2026-07-26). Su veredicto del check-in: *"está muy fregona, solo hay que terminar de adaptarla."*

## 📐 CÓMO CORRER ESTE BATCH
Seis tracks **en orden**. El **Track A es sagrado**: es el que más oficio pide y el que Enrique va a sentir primero, así que va con la cabeza fresca y no se recorta.

**Regla de corte:** si te quedas sin tiempo, **para en frontera limpia de track** y repórtalo. Un track completo y sólido vale más que seis a medias. Enrique prefiere calidad sobre cobertura y no trabaja con parches.

**Commit por track**, para que Cowork audite por partes.

---

# 🎯 TRACK A · LA FÍSICA DEL PLANO *(sagrado)*

Enrique: *"la navegación es atropellada, el zoom in y zoom out tiene pausitas que se sienten frágiles. Al moverse a lo largo y ancho del plano se tropieza un poco. ¿Podemos hacerlo más fluido?"*

### ✅ CAUSA RAÍZ YA DIAGNOSTICADA POR COWORK — no la re-investigues
Revisé `src/components/checkin/EmotionMap2D.tsx` (477 líneas). **La arquitectura base está bien**: `GestureDetector` + shared values + un solo `useAnimatedStyle` sobre el contenedor `world`. No hay que reescribir el componente. Son tres cosas puntuales:

**A.1 · No existe momentum. Cero.**
Las líneas 138-140 animan con `withTiming({ duration, easing })`. **No hay un solo `withDecay` en el archivo.** Al soltar el pan, el plano se detiene en seco. Eso es lo que se siente como "atropellado": nada físico frena instantáneo cuando lo avientas.
**Default:** en `.onEnd` del pan, tomar `velocityX`/`velocityY` y pasarlos a **`withDecay`** con `deceleration: 0.998`. Reanimated ya implementa la proyección de momentum que usa iOS. Es una herramienta que ya está instalada y no se está usando.

**A.2 · Hay `runOnJS` durante el gesto, y ahí está la "pausita".**
Línea 129: `useAnimatedReaction` dispara `runOnJS(recomputeVisibleBox)` al cambiar de celda. Línea 200: `runOnJS(setOverviewSafe)`. Cada uno cruza al hilo de JS, hace `setState` y **re-renderiza el mapa con sus 144 burbujas a media navegación**.
El comentario de la línea 122 muestra que ya lo habían atacado ("serían 60 setState/s, solo al cambiar de celda se recalcula"). Bajarlo de 60/s a 1-por-celda ayudó pero **no lo eliminó: ahora el tirón ocurre justo al cruzar cada frontera de celda.** Eso explica literalmente "se tropieza al moverse a lo largo y ancho".
**Default:** que el gesto **nunca** toque el hilo de JS. Las burbujas se montan una vez y solo se transforma el contenedor; el culling por `visibleBox`, si se conserva, se recalcula **al terminar** el gesto. Mismo criterio para `overview`: derivarlo en el worklet (opacidad de etiquetas en función de `scale.value`) en vez de con `setState`.

**A.3 · Los límites son tope duro, no liga.**
`clampTx`/`clampTy` cortan seco. Un tope duro se lee como "se congeló"; la resistencia progresiva se lee como "responde, pero aquí ya no hay más".
**Default:** rubber-banding. `withDecay` acepta `clamp` + `rubberBandEffect: true`, así que sale casi gratis.

**A.4 · Zoom y pan simultáneos, no por turnos.**
**Default:** `Gesture.Simultaneous(pinch, pan)` con handoff de velocidad. Y que **toda animación arranque del valor presentado en pantalla**, nunca del objetivo: si el usuario agarra el plano a media inercia, debe engancharse desde donde está, sin salto.

**A.5 · Un plano cartesiano de verdad.**
Enrique: *"quisiera que la cuadrícula se respetara como plano cartesiano y sí poder navegar entre cuadrantes casi sin sentir separación."*
**Default:** el mundo es **un solo lienzo continuo** con origen al centro; los cuadrantes son regiones, no cuatro contenedores. Cruzar de rojo a verde es desplazamiento continuo, sin transición ni snap. El overview es un nivel de zoom del mismo lienzo, no otra pantalla.

**Vara de calidad:** usa la skill **`apple-design`** (secciones 1-6, 9 y 11). Lo que queremos: respuesta en touch-down, tracking 1:1, interrumpible en cualquier instante, entrega de velocidad sin costura al soltar, resistencia progresiva en bordes.

---

# 🫀 TRACK B · CHECK-IN — SELECCIÓN Y COHERENCIA

### B.1 · Una sola emoción activa mientras navegas *(decisión de Enrique)*
*"Propongo que solo se pueda seleccionar 1 y que esa es la que va switcheando mientras navegas. Si una vez que le damos continuar, allí se da la opción de agregar una segunda o simplemente seguir."*
**Default:** tocar una burbuja **reemplaza** la selección activa (no acumula). El átomo viaja contigo por el plano. Al dar **CONTINUAR** aparece la opción de sumar una segunda o seguir de largo.

### B.2 · BUG: no se puede deseleccionar
La primera emoción se queda pegada. Hay un "Quitar" en la hoja inferior pero aparece de forma inconsistente. Con B.1 el problema se disuelve, pero **verifica que tocar la misma burbuja otra vez la suelte**.

### B.3 · El átomo le encanta, no lo toques
*"Está muy padre que se convierta en átomo, es excelente y me encanta."* Núcleo + anillo orbital se conservan. Lo único a arreglar es que no colisione (B.4).

### B.4 · Colisiones del átomo
Al seleccionar, el anillo se dibuja encima de las vecinas y **la etiqueta se corta**: se ve "n éxtasis" en vez de "En éxtasis", "on determinación", "ómod@".
**Default:** reservar en el layout el espacio que el átomo necesita al expandirse, de modo que ninguna emoción quede a menos del radio del anillo de otra. Y que la etiqueta del seleccionado se dibuje **por encima** de todo.

### B.5 · 🔴 Los cuadrantes están espejeados entre portada y plano
- **Portada (4 cards):** Agradable a la **izquierda**, Desagradable a la **derecha**.
- **Plano:** Desagradable a la **izquierda**, Agradable a la **derecha**.

**El plano es el correcto y no se toca:** sigue la convención cartesiana y la del Mood Meter (valencia crece a la derecha, energía hacia arriba). **Se corrigen las cards:**

| | Izquierda | Derecha |
|---|---|---|
| **Arriba** | Alta energía · Desagradable | Alta energía · Agradable |
| **Abajo** | Baja energía · Desagradable | Baja energía · Agradable |

Es memoria espacial: si el usuario aprende dónde vive "con enojo" en la portada, tiene que estar del mismo lado al entrar.

### B.6 · 🔴 El encabezado no se actualiza al navegar *(Cowork, no reportado por Enrique)*
En tres capturas seguidas el título dice **"Alta energía · Agradable"** mientras en pantalla se ven rojos (con furia, con pánico, con enojo), luego azules, luego teales. Y en overview dice "Baja energía · Desagradable" mientras muestra los cuatro cuadrantes.
**Default:** el encabezado se deriva de la posición real del centro del viewport, en tiempo real (sin `setState` por frame: derívalo del worklet o recalcula al asentarse). En overview no debe nombrar un cuadrante.

### B.7 · 🔴 El orbe de ARGOS tapa la descripción *(Cowork, no reportado)*
En cinco capturas el orbe verde se encima a la hoja inferior y **corta el texto**: "Sientes una alegría tan grande que es di…" (debería decir "difícil contenerla").
**Default:** con la hoja abierta, el orbe se recoge, se desplaza u oculta. La descripción es el contenido principal de ese momento.

### B.8 · Etiquetas del overview ilegibles *(Cowork, no reportado)*
En zoom out, los rótulos de cuadrante y el "Toca para entrar" se dibujan sobre el enjambre sin contraste.
**Default:** soporte propio para el rótulo (material translúcido o claro reservado en el layout) para que no compita con las burbujas.

### B.9 · Barrida editorial gradiente
*"En la pantalla siguiente se ve como aún no le llega el overhaul de gradientes al módulo de check-in."*
La pantalla de contexto (¿Dónde estás? · ¿Con quién? · ¿Qué estás haciendo? · prompt del día) tiene chips planos gris oscuro y el REGISTRAR en amarillo plano. Vara: `docs/DESIGN_SYSTEM.md` y la referencia de Mente V1.5.2.
**Extra:** los chips se cortan en el borde derecho ("Comp…", "D…"). Que el scroll horizontal se lea como scroll, o que envuelvan.

> ⛔ **NO tocar:** *"la gradiente y los colores se ven muy bien, me encantan."* La paleta del plano se queda como está.

---

# 🏋️ TRACK C · CONSOLIDAR LAS INTERFACES DE ENTRENAMIENTO

Enrique construyó una rutina con el constructor nuevo (*"funcionó excelente"*), la corrió, **y le salió la interfaz vieja, sin clip**. La captura muestra "Peso muerto / Barbell Deadlift" (nombre de la matriz) en el runner de timer puro.

**Default: exactamente DOS interfaces de entrenamiento en toda la app, ni una más.**

1. **Entrenamiento con clip** — la del sprint de Fitness (MB-3/MB-5). **Se usa siempre que el ejercicio tenga `matrix_slug`**, sin importar por dónde se creó la rutina. Hereda clip, músculo, equipo, métodos ATP y benchmark.
2. **Entrenamiento por timer puro** — para bloques de puro tiempo sin ejercicio de matriz. **Subirla a ATP editorial gradiente** (hoy es legacy: verde brutalist sobre negro plano) conservando toda su función.

**Ruteo:** rutina con ejercicios de matriz → interfaz 1. Si hay mezcla, cada bloque usa la que le toca **sin sacar al usuario de la sesión**. **Retira cualquier tercera interfaz de ejecución viva en el repo** y reporta cuáles encontraste.

---

# 🧭 TRACK D · EL RESTO DEL PILAR EMOCIONAL

Enrique solo ha visto el mapa y la pantalla de contexto. **Las otras tres pantallas del pilar nunca se han abierto en device** y son lo siguiente que va a probar:
`app/emotion-history.tsx` (372) · `app/emotion-navigation.tsx` (336) · `app/emotion-profile.tsx` (287)

**Default:**
1. **Barrida editorial gradiente** a las tres, al mismo nivel que dejes el check-in en B.9. Casi seguro traen el mismo legacy plano.
2. **Revisión funcional de escritorio** de cada una: que no haya columnas fantasma (mismo patrón que MB-6: `supabase-js` no lanza en 4xx, revisa que cada query chequee `error`), que los estados vacíos digan algo útil (es un pilar recién nacido: **casi todo va a estar vacío en su primer uso**, y un vacío feo es lo primero que va a ver).
3. **Coherencia con B.5:** si alguna de estas pantallas dibuja cuadrantes o el plano, que respete la misma orientación.

⚠️ La **navegación emocional** es el diferenciador del módulo y trae una salvaguarda que Cowork encontró en MB-4.1: las cadenas **nunca deben guiar hacia anhedonia** (`NO_DESCENT_TARGET_IDS` en `emotions-library.ts`). **Si tocas `emotion-navigation-core.ts`, re-corre esa verificación y repórtala.** Esto es seguridad del usuario, no estética.

---

# 🧘 TRACK E · MENTE V1.5.2 *(la deuda más vieja abierta)*

Quedó pendiente desde antes de Fitness y es el único pilar a medias. **Fuente:** `R and D/PLAN_TERMINAR_MENTE_OVERHAUL.md` y `R and D/AUDITORIA_PILAR_MENTE_2026-07-16.md`.

Pendientes conocidos:
1. **N-Back con skin ATP** — el módulo funciona pero sigue con visual genérico. Editorial gradiente.
2. **Breakdown de resultado** del N-Back (que el usuario entienda su score, no solo lo vea).
3. **Covers con URL estable** — hoy se rompen. Ojo: el bucket de audios de Mente es privado con edge function, y **las policies NO viven en migración**, así que `db push` no las recrea. Verifica antes de asumir.
4. **Cards de respiración** al molde nuevo.
5. **Corte de silencio de salida** en las piezas de audio.

**Default:** re-deriva el alcance de los docs y **ejecútalo**. Si algún punto quedó ambiguo o el doc no coincide con el código, **NO adivines**: hazlo hasta donde sea claro y **flaguea el resto en el delivery** para que Enrique lo resuelva. Es su pilar más sensible en tono y él lo revisa a oído.

---

# 🧹 TRACK F · LIMPIEZA *(solo si sobra tiempo)*

1. **`health-score-engine.ts` huérfano** — MB-6 lo reportó sin consumidores. **Verifica que de verdad nadie lo importe y retíralo.** Menos código muerto, menos fantasmas.
2. **`argos_daily_insights.read` no existe** — el contador de no-leídos lo consulta y falla. **Default:** migración idempotente aditiva `add column if not exists read boolean not null default false` (numera después de 234). Es aditiva y no rompe nada; **NO `db push`**, la deja en la rama.
3. **`expo-av` deprecado** sigue instalado. Retíralo **solo si nada lo importa**; si algo lo usa, reporta qué y no lo toques.
4. **Barrido de fugas en mensajes de error** (app + Edge Functions): ningún mensaje al usuario debe revelar rutas, tablas, versiones o stack traces. El detalle va a Sentry; a pantalla, copy genérico y útil. *(Es el punto 7 de `SEGURIDAD_LINEAMIENTOS_GOB_ATP.md`, requisito del trato de gobierno.)*

---

## Protocolo
`feat/mb7-away-run` desde `main`. Un commit por track. Migraciones **idempotentes** si hacen falta, numeradas después de 234. `npx tsc --noEmit` (0) + tests verdes + eslint sin errores nuevos. **NO merge, NO tocar versión, NO `db push`.**

**Delivery con:**
- Qué cambiaste exactamente en la física del plano, y **si quitaste todo `runOnJS` del camino del gesto**.
- Las terceras interfaces de entrenamiento que encontraste y retiraste.
- Qué encontraste en las tres pantallas emocionales que nadie había abierto.
- Qué de Mente quedó ambiguo y necesita a Enrique.
- **Dónde paraste** si no llegaste al final, y por qué esa frontera es limpia.
- Checklist de device test por track.
