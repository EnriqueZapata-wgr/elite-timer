# 🏋️ CUSTOMER JOURNEY · Fitness (pre-brief MB-3)

**Fecha:** 2026-07-24 · **Regla:** customer journey ANTES de tocar código (doctrina Enrique). Este doc es el mapa; el brief de CC sale DESPUÉS de que Enrique lo vete/afine.
**Estado real (auditoría de código 2026-07-24):** el pilar está ~35-40% — hay bases funcionales sólidas y un hueco grande en el corazón. No es obra negra; es una casa con cimientos buenos, cuartos a medio amueblar, y **la tubería principal desconectada**.

---

## 🔍 QUÉ HAY HOY (inventario factual)

**Lo que YA funciona (no rehacer):**
- **Hub + navegación** editorial (hub → Mi Fitness / Entrenar / Explorar), stats de la semana reales (sesiones, kg, PRs).
- **Logging que persiste:** fuerza (`log-exercise`, con 1RM Epley + auto-PR), cardio (`log-cardio`, con auto-PR de distancia), movilidad (lectura completa).
- **3 métodos propietarios interactivos:** Method 3.5, EMOM Auto, Myo-Reps — con timers, feedback de peso en vivo y háptico. **Reales y jugables.**
- **Motor de ejecución con voz/sonido** (`use-routine-engine` / `execution.tsx`): TTS, cuentas regresivas habladas, keep-awake, háptico. Potencia HIIT y rutinas del builder.
- **Motor de protocolo respiratorio** con fases + safety gate + Wim Hof (vive en Mente, `breathing.tsx`).
- **Scorer de Edad ATP para fitness** (`area-fitness-service`): 9 tests ponderados, bandas por sexo, test-verificado.

**Los 4 huecos que definen el rebuild:**
1. 🔴 **La tubería está desconectada.** Entrenar NO alimenta tu Edad ATP. `computeAreaFitness` lee de un capture path aparte (`edad-atp/tests/*`); tus `exercise_logs`/`cardio_sessions`/PRs no le llegan. **Sudas y tu edad no se mueve.** Este es EL problema.
2. 🔴 **No hay entidad "sesión" en fuerza.** Cardio tiene sesiones; fuerza son filas sueltas en `exercise_logs`. No hay "entrené hoy: 5 ejercicios, 45 min". Y no hay temporizador de descanso entre series.
3. 🟠 **Biblioteca de ejercicios de juguete.** ~26 ejercicios (benchmarks + variantes), **cero media** (las columnas video/thumbnail/instrucciones existen pero vacías). No hay pantalla de detalle de ejercicio.
4. 🟠 **Dos motores de ejecución divorciados.** Los 3 métodos (solo háptico, dentro de log-exercise) NO corren por el motor con voz. El motor rico no corre los métodos. El usuario vive dos experiencias distintas según por dónde entre.

**Basura visible:** 2 items "Pronto disponible" en Explorar; `fitness-hiit` es una pantalla huérfana (no linkeada del hub); movilidad-assessment es solo 50 líneas (captura floja).

---

## 🧭 EL JOURNEY IDEAL (5 momentos)

> Ancla emocional: **el usuario de ATP no "hace ejercicio", ejecuta un protocolo de rendimiento y VE que su cuerpo responde.** El foso es el bucle sudor→dato→edad que se mueve. Sin ese bucle cerrado, Fitness es otra app de logging.

### Momento 1 · LLEGO (hub)
**Quiere:** saber qué toca hoy y sentir que la semana avanza.
**Hoy:** stats de semana ✅, pero el hub es un menú — no le dice "hoy toca X".
**Ideal:** el hub abre con **la sesión de hoy** (una, tipo Oura "one big thing"), no con 3 cards de navegación. Debajo: progreso de semana. La rutina de hoy sale de ARGOS o del plan activo. *(Depende de: ARGOS routine — verificar calidad aparte.)*

### Momento 2 · ELIJO / ARRANCO
**Quiere:** entrar a entrenar sin fricción — que la app sepa su rutina.
**Hoy:** `fitness-train` lidera con "ARGOS genera tu rutina" + menú a builder/mis-rutinas/timer. Funciona pero es un cruce de caminos, no un flujo.
**Ideal:** un botón grande "EMPEZAR SESIÓN DE HOY" → entra directo al motor de ejecución con la rutina cargada. Builder y biblioteca quedan como caminos secundarios (explorar, no el default diario).

### Momento 3 · EJECUTO *(el corazón — donde vive el 60% del valor)*
**Quiere:** guía en vivo — cuánto peso, cuántas reps, cuándo descansar, cuándo el siguiente — sin pensar.
**Hoy:** DOS experiencias divorciadas. Métodos = háptico sin voz (en log-exercise). Motor con voz = no corre métodos. Sin timer de descanso en fuerza.
**Ideal — UN motor unificado:**
- Un solo runner de sesión con voz + sonido + háptico + keep-awake que corra TODO: series estándar, los 3 métodos propietarios, HIIT, y protocolos respiratorios (Wim Hof/apnea como bloque pre o intra-workout).
- **Timer de descanso entre series** con cuenta hablada.
- Registro inline durante la sesión (peso/reps por serie), no una pantalla de captura aparte al final.
- Feedback de auto-regulación en vivo (sube/baja peso) preservado de los métodos actuales.

### Momento 4 · CIERRO (post-sesión)
**Quiere:** ver qué logró y que "cuente".
**Hoy:** guarda filas en `exercise_logs`; detecta PRs. Pero no hay resumen de sesión ni conexión a la edad.
**Ideal:** pantalla de cierre de **sesión** (entidad nueva): X ejercicios, Y kg movidos, Z min, PRs nuevos celebrados (brinco >15% = celebración, doctrina carrot). Y el gancho: **"esto movió tu Edad ATP de fitness"** — aunque sea una señal parcial. Cerrar el bucle emocional aquí.

### Momento 5 · VEO QUE FUNCIONA *(el foso — la retención de largo plazo)*
**Quiere:** evidencia de que su cuerpo mejora — contra su yo pasado.
**Hoy:** 🔴 no existe. La tubería está cortada.
**Ideal:** conectar el logging real (fuerza/cardio/movilidad) como señales que **alimentan `computeAreaFitness`** (o un puente que las traduzca a los inputs del motor). Que un PR de sentadilla o una mejora de VO2 mueva la aguja de la Edad ATP. Este es **el diferenciador #1** (aha cruzado tipo Levels, pero para fitness): entrenas → tu edad biológica de fitness baja → lo ves. Sin esto, todos los demás momentos son logging bonito.

---

---

## 🏗️ LA BIBLIOTECA MATRICEADA + MOTOR DE RUTINAS *(decidido 2026-07-24)*

**El bombazo del pilar.** Reemplaza el hueco #3 (biblioteca de juguete) con una biblioteca infinita + generador de rutinas ilimitadas. Cuatro capas:

### Capa 1 · Los clips — **MoveKit (DECIDIDO)**
Librería 3D licenciada con variante de **músculo resaltado** (el look anatómico exacto, perfecto para la imagen de ATP). API entrega metadata: grupos musculares, equipo, dificultad, URL del clip. Licencia comercial royalty-free para app de paga.
- **Por qué MoveKit:** el estilo 3D anatómico coincide con el brand ATP (serio, científico, no monito genérico). ~200+ clips base, muscle-highlight incluido.
- **Costo:** one-time (~$99-full library / verificar términos y tier al momento de comprar).
- **Descartado:** AI video generativo (MJ/Kling/Runway) — coherencia temporal mala en 2026, deforma la forma, riesgo de enseñar mal. Sirve solo para b-roll de marketing, NO para biblioteca instruccional.
- **Bonus:** la API de MoveKit **siembra el esquema de la matriz** (cada clip ya viene taggeado).

### Capa 2 · La matriz (taxonomía) — **el moat, trabajo Enrique + Mariana**
Cada ejercicio taggeado en N dimensiones para que el algoritmo pueda razonar: `ejercicio × grupo muscular × equipo × método × objetivo × nivel × patrón de movimiento × contraindicaciones`. La API de MoveKit da la base (músculo/equipo/dificultad); Enrique+Mariana suman las capas propietarias (método ATP, objetivo, contraindicaciones, modalidad). **Este es el activo que nadie puede copiar.**
- *Pendiente de diseño conjunto: las dimensiones exactas de la matriz (siguiente peloteo).*

### Capa 3 · El algoritmo generador — **determinista, SIN LLM**
Satisfacción de restricciones sobre la matriz: dado {objetivo, equipo disponible, nivel, tiempo, historial}, arma la rutina. Rota día a día (anti-repetición), respeta volumen/sobrecarga progresiva, filtra por lo que el usuario tiene al alcance.
- **$0 de runtime** (on-device, sin costo por llamada — respeta doctrina H+/no-gate-por-LLM).
- **Reproducible + seguro** (un LLM alucinaría combos peligrosos; el algoritmo no).
- **Offline, instantáneo, ilimitado.**
- ARGOS pone una capa ENCIMA (explica, ajusta por cómo te sentiste, personaliza) — pero el esqueleto es algorítmico y gratis. **Base gratis / capa premium ARGOS.**

### Capa 4 · Entrega (delivery) — **remoto + caché, infra ya probada**
Clips NO van en el binario (lo volvería gigas). Viven en Storage/CDN, se descargan bajo demanda y se cachean. **Mismo patrón que ya corre Mente audio** (bucket + caché expo-image).
- Clips probablemente NO necesitan gate de pago → **bucket público + CDN** (Cloudflare) = más simple y cacheable al borde.
- **Formato:** loops 3-6s, MP4 H.265 o WebM, mudos, resolución de card (~200KB-1MB/clip). GIF descartado (10x más pesado).
- **Prefetch de la rutina del día** en background → cero buffering en el gym, funciona sin señal. Lazy load (solo lo de hoy, no los miles).
- **Primera carga sin blanco:** mismo fix que portadas de Mente (fallback local + `onError`).
- **Único costo real:** egress/CDN — modesto porque los clips son chicos y se cachean; escala con ingresos.

**Veredicto de viabilidad:** ligera, no torpe, infra probada en la propia app. La parte cara (clips) se licencia barato; la parte valiosa (matriz + algoritmo) la controla ATP.

---

## 🌉 EL PUENTE EDAD↔ENTRENAMIENTO *(RESUELTO 2026-07-24)*

Modelo **híbrido de dos magnitudes** — el log de ciertos benchmarks ES el test, y mueve la Edad ATP con peso distinto según la calidad de su norma:

- **Bandas PRIMARIAS (Tier A — respaldo de literatura):** `VO2max · grip · sit-rise · push-ups max`. **YA están en el motor V7/V6** (vo2max, grip, old_man_test, push_ups). Mueven la Edad ATP en **puntos sólidos** (peso fuerte). Verdad medida. Solo hay que marcarlas como benchmarks entrenables en la biblioteca para que el log alimente el score.
- **Bandas SECUNDARIAS (Tier B — heurística de experto Attia/Galpin):** `dead hang · deadlift ×BW · pull-ups max · farmer carry · wall sit · broad jump`. Viven en la **capa de proyección**, PERO mueven la edad un **mínimo real (nudge acotado)** — el usuario siente avance a diario sin que la heurística distorsione la verdad. **Cap duro** para que ninguna secundaria domine a una primaria.

**Rigor (no negociable):**
- Tier A ya normado por edad/sexo; **push-ups necesita norma FEMENINA propia** (el umbral 40 se derivó en hombres — no extrapolar con descuento).
- Tier B entra **relativo** (×peso corporal / reps máximas), nunca kg absolutos.
- **Aditivo al motor congelado** — no reescribe las áreas que validó Mariana; el nudge secundario carga como modulador acotado.

**Set Tier B CERRADO (2026-07-24):** los **6** — dead hang · deadlift ×BW · pull-ups max · farmer carry · wall sit · broad jump. Fuentes y bandas en `RESEARCH_BENCHMARKS_EDAD_BIOLOGICA.md`. Pendiente para brief: solo las dimensiones de la matriz.

---

## 🎯 IMPLICACIONES PARA EL BRIEF MB-3 (borrador de alcance, sujeto a tu veto)

**Orden propuesto (customer-journey primero, luego construir de adentro hacia afuera):**
1. **Puente Fitness → Edad ATP** *(el hueco #1 — probablemente lo primero, es la tubería).* Definir cómo `exercise_logs`/`cardio`/PRs se traducen a señales del scorer. *(Requiere decisión tuya: ¿qué logs cuentan y cómo mapean a los 9 inputs?)*
2. **Biblioteca matriceada + motor de rutinas** *(las 4 capas de arriba — MoveKit + matriz + algoritmo + delivery).* Probablemente su propio tramo grande dentro del XL.
3. **Entidad "sesión" de fuerza** + timer de descanso.
4. **Motor de ejecución unificado** (fusionar los 3 métodos al runner con voz; sumar protocolo respiratorio como bloque; correr las rutinas que arma el algoritmo).
5. **Pantalla de cierre de sesión** con celebración + señal de edad.
6. **Limpieza:** matar coming-soons, linkear/retirar HIIT huérfano, engordar captura de movilidad.

**Tamaño:** XL — corrida dedicada, time-box duro, NO mezclar con otro MB (regla del roadmap).

---

## ❓ LO QUE NECESITO DE TI PARA CONVERTIR ESTO EN BRIEF
Preguntas de fondo (peloteo, no drip — respóndelas cuando puedas):
1. ~~**El puente edad↔entrenamiento**~~ **RESUELTO 2026-07-24 → híbrido de 2 magnitudes** (Tier A primarias = puntos sólidos; Tier B secundarias = nudge mínimo acotado en proyección). Ver sección "🌉 EL PUENTE" arriba. Pendiente solo: recortar el set final de Tier B.
2. **Métodos propietarios:** ¿los 3 actuales (3.5 / EMOM / Myo) son EL catálogo, o hay más de tu arsenal que faltan por meter?
3. **Protocolo respiratorio en Fitness:** ¿Wim Hof/apnea como bloque pre-workout dentro del runner, o como su propia sección? ¿CO2 tables / apnea tablas te interesan como training real?
4. **ARGOS routine:** ¿la generación por ARGOS es una capa ENCIMA del algoritmo determinista (ajusta/explica/personaliza), o un camino aparte? *(Default Cowork: el algoritmo arma el esqueleto gratis, ARGOS es la capa premium que lo personaliza. No audité la calidad del `argos-routine` actual — flag.)*
5. ~~**Biblioteca: ¿media propia o texto?**~~ **RESUELTO 2026-07-24 → MoveKit** (3D licenciado con muscle-highlight, imagen ATP). Ver Capa 1 arriba.
6. **Dimensiones de la matriz:** el siguiente peloteo de fondo — diseñar juntos las N dimensiones del tag de cada ejercicio (músculo/equipo/método/objetivo/nivel/patrón/contraindicación/...). Es el moat; lo hacemos tú y yo.

Con tus respuestas (o tu veto a mis defaults) esto se vuelve el brief MB-3.
