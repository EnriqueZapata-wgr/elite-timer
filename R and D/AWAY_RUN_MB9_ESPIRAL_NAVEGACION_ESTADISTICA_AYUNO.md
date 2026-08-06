# 🌀 AWAY RUN · MB-9 — Espiral emocional · Navegación real · Estadística · Ayuno ATP

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb9-espiral` desde `main` (ya trae MB-7 y MB-8). NO merge, **NO tocar la versión**, **NO `db push`**. Cowork audita.
**Origen:** device test de Enrique sobre 1.8.0 + tres prototipos interactivos validados con él (2026-07-27).

## 📐 ORDEN Y REGLA DE CORTE
Cinco tracks **en orden**. El **D es P0 y va primero aunque sea el más chico**: hay un claim vivo en producción que no debe estar ahí.
Si te quedas sin tiempo, **para en frontera limpia de track** y repórtalo. **Commit por track.**

## ⛔ LO QUE NO SE TOCA — leer antes de empezar
MB-8 logró un salto de usabilidad en la pantalla de ayuno que **se conserva íntegro**. Este batch cambia **la geometría y el incentivo**, no la mecánica de interacción. Sobreviven sin negociación:
1. **Contención** (~8 superficies presionables, **un solo primario**).
2. **El botón primario no se mueve entre estados**: misma posición, tamaño y forma; **solo cambia el peso visual** (iniciar = relleno degradado; terminar = relleno tenue).
3. **Terminar NO pide diálogo de confirmación.** Lo destructivo ("Cancelar y eliminar") va aparte, en peso mínimo.
4. **Edición inline** de inicio y meta, pegada al valor que modifica.
5. **Vacío que informa** ("desde tu último ayuno"), nunca un hueco triste.
6. **Tira semanal** con anillo por día.
7. **El estado se anuncia con palabras** en el encabezado.
8. **Pastilla de fase** con detalle a un toque.
9. Molde `GradientCTA`, tres niveles de texto, cero verde plano.

---

# 🔴 TRACK D · MATAR LAS HORAS DE AUTOFAGIA *(P0, va primero)*

**Está vivo en el build que Enrique trae puesto.** La lista de fases publica **"Autofagia · 16 h"** y **"Autofagia profunda · 24 h"**, más **"Reparación inmune · 36 h"** y **"Reset metabólico · 48 h"**.

**Por qué es P0:** no existe una hora confirmada de autofagia en humanos. El flujo autofágico casi no se puede medir en personas vivas y las cifras que circulan vienen de animales o de marcadores extrapolados. Publicar una hora es afirmar lo que no está establecido, y es exposición innecesaria.

**Default:** en `src/constants/fasting-phases.ts`, **retirar las cuatro fases sin respaldo** y dejar la escalera basada en literatura primaria:

| Fase | Ventana | Respaldo |
|---|---|---|
| Fase alimentada | 0-4 h | Cahill 2006 |
| Postabsorción | 4-12 h | Cahill 2006 |
| Cambio metabólico | 12-18 h | de Cabo & Mattson 2019 (depleción de glucógeno 10-14 h+) |
| Cetosis | 18-48 h | de Cabo & Mattson 2019 · Cahill 2006 |
| Ayuno prolongado | 48 h+ | Cahill 2006 · **requiere acompañamiento** |

**La autofagia se puede nombrar como proceso que el ayuno favorece, pero NUNCA con reloj.** Detalle y fuentes en `R and D/RESEARCH_FASES_AYUNO_ATP_2026-07-26.md`.
⚠️ Enrique valida las ventanas finales; estas son la propuesta con respaldo.

---

# 🌀 TRACK A · EL MAPA EMOCIONAL PASA A ESPIRAL CIRCUMPLEJA

**Causa raíz de la mariposa, ya diagnosticada:** la interfaz `Emotion` tiene `quadrant` (categórico), `energy` e `intensity`, **pero no tiene coordenada continua de valencia**. El eje X se deriva de un binario agradable/desagradable, así que todo se empaca en dos mitades y el centro queda vacío. **Ningún ajuste de render lo arregla: falta el dato.**

**Default:** migrar a **circumplejo polar** (Russell 1980, que es el modelo fuente y es circular, no cuadrado).

### A.1 · Geometría
- **Ángulo = cualidad.** Cada cuadrante ocupa un sector de ~86°: `hp` 3-87° · `hu` 93-177° · `lu` 183-267° · `lp` 273-357°. Dentro del sector, la posición se deriva de energía e intensidad.
- **Radio = intensidad.** Centro = calma (`R0`), borde = pico (`R1`).
- **El centro es destino, no hueco:** zona "CALMA" explícita.
- **Diámetro de burbuja escala con intensidad** (las de adentro son más chicas, que es donde hay menos espacio).

### A.2 · Algoritmo anti-colisión *(validado en prototipo, cero traslapes con las 144)*
**Regla madre: el radio es sagrado, el ángulo es flexible.** La intensidad no se puede mover porque es el eje de la navegación; la cualidad aguanta deslizarse unos grados.

```
ordenar emociones por radio (intensidad) ascendente
para cada emoción:
  r = radio(intensidad)
  intentar su ángulo semántico
  si choca → deslizar sobre el MISMO anillo, alternando ±, en pasos
              proporcionales a (diámetro+gap)/circunferencia
  si el anillo se agota → empujar r += ~5.5px y reintentar
```
El empuje por desborde es lo que produce **la espiral**. No es decoración: es la huella de la solución.

**Invariantes a testear:**
- Cero pares con distancia < r1+r2 (test que falle si regresa una colisión).
- Ninguna emoción termina en un radio menor que otra de intensidad estrictamente menor.
- Ningún deslizamiento cruza de cuadrante.

### A.3 · Determinismo — **crítico**
**El mismo input debe producir exactamente el mismo mapa siempre.** Si las posiciones se recalculan distinto entre sesiones, el usuario nunca aprende dónde vive "con enojo" y **se pierde la memoria espacial, que es la mitad del valor.**
**Default:** calcular una vez y **congelar las posiciones en constante**, o algoritmo puro y determinista sin aleatoriedad. Test de regresión que compare contra un snapshot.

### A.4 · Cribado por zoom (LOD)
Alejado no tiene sentido dibujar 144. **Default:** mostrar las representativas y revelar el resto al acercarse, como cualquier mapa. **Bonus: resuelve el problema de montaje en gama media** que quedó pendiente de MB-7, porque el primer render deja de ser 144 burbujas con degradado.

### A.5 · Se conserva de MB-7
La física del plano (momentum con `withDecay`, cero `runOnJS` en el gesto, rubber-banding, pinch+pan simultáneos) **se mantiene tal cual**. Solo cambia dónde están las burbujas.
El **átomo** se conserva y por fin tiene lugar natural. Se mantiene la selección única que switchea y el toggle para soltar.

---

# 🧭 TRACK B · NAVEGACIÓN EMOCIONAL — MODELO CORREGIDO

**Análisis completo en `R and D/ANALISIS_NAVEGACION_EMOCIONAL_v2.md`. Léelo antes de este track.**

**El modelo anterior estaba mal:** el "flip" como espejo a través del círculo propone saltos implausibles (de "con desilusión" a "con euforia"), porque pide cambiar activación **y** valencia en un solo movimiento.

**Lo que dice la evidencia:** las transiciones son graduales entre estados adyacentes; existe una **ventana de tolerancia** fuera de la cual las herramientas cognitivas pierden casi toda su fuerza; y **las estrategias fisiológicas funcionan con activación alta mientras que las cognitivas funcionan cuando ya estás moderadamente en calma.** Es decir: **primero se baja la activación, después se reencuadra.**

**Esto ya era doctrina ATP** (eje de energía = herramientas fisiológicas · eje de valencia = cognitivas). El trabajo es **hacer que la geometría obedezca la doctrina**.

### B.1 · Cuatro movimientos con disponibilidad condicional

| Movimiento | Geometría | Herramienta ATP | Cuándo se ofrece |
|---|---|---|---|
| **↓ Bajar** | hacia el centro | respiración, frío, movimiento | **siempre** desde activación alta |
| **⇄ Reencuadrar** | arco **corto** entre vecinas de activación parecida | renombrar la sensación | entre estados adyacentes; **sí vale en activación alta** |
| **→ Cruzar** | arco por el borde, con escalas | journal, reevaluación, gratitud | **solo dentro de la ventana**; bloqueado en activación alta |
| **↑ Subir** | hacia afuera | movimiento, luz, propósito | **solo desde estados agradables o neutros** |

**Prohibición dura:** subir desde desagradable **no se ofrece nunca**. Activarte estando mal produce agitación, no bienestar.

**El reencuadre corto es real:** entusiasmo y ansiedad ocupan casi la misma posición en el circumplejo y pueden convertirse una en otra, porque son la misma activación con distinta lectura. Ese es el único cruce de valencia legítimo estando arriba, y **no le pide a la persona que se calme, le pide que relea su energía.**

### B.2 · La ruta es un arco con escalas, no una cuerda
De "con furia" a "en calma" el camino real pasa por frustración, fastidio, cansancio, y **solo ahí** entra a la ventana donde se puede cruzar.
**Default:** el destino lejano se puede mostrar como **horizonte tenue**, pero **la app solo ofrece el siguiente paso**. El check-in deja de ser un evento y se vuelve un proceso.

### B.3 · Cuántas salidas ofrecer *(criterio de Enrique)*
**Default: en activación alta, UNA sola salida** (bajar), porque ahí menos opciones es más cuidado, justo cuando la persona está peor. **Dentro de la ventana, dos o tres**, porque ahí sí hay capacidad de elegir. Enrique afina el umbral con Mariana.

### B.4 · ⚠️ La lógica existente manda
**La geometría DIBUJA la decisión, no la toma.** `src/services/emotion-navigation-core.ts` sigue decidiendo destinos con sus reglas de familia y su lista de exclusión.
**La salvaguarda de anhedonia (`NO_DESCENT_TARGET_IDS`) es intocable y su test debe seguir pasando.** Ninguna ruta puede guiar a "sin interés", "apagado", "vacío" y compañía. Esto es seguridad del usuario, no estética. **Si tocas ese core, re-corre la verificación y repórtala.**

---

# 📊 TRACK C · ESTADÍSTICA DE EMOCIONES

Existen `emotion-history-core` y `emotion-profile-core` con tests, pero **el reporteo profundo no está construido**. Enrique lo pidió explícito.

**Default — lo que sí se reporta:**
1. **Patrón por día de la semana** y **por hora del día** (¿a qué hora se te cae el ánimo?).
2. **Distribución por cuadrante** en el periodo, con tendencia contra el periodo anterior.
3. **Correlaciones cruzadas** con lo que ATP ya tiene: sueño, entrenamiento, ayuno, glucosa, ciclo. **Redactadas como asociación, nunca como causa.**
4. **Disparadores frecuentes** desde el contexto que ya se captura (dónde, con quién, qué hacías).
5. **Racha de escucha** (ya existe) y consistencia.

### C.1 · 🎯 El reporte que nadie más puede dar
Con la navegación emocional, **ATP no solo sabe cómo te sentiste: sabe hacia dónde te moviste y si funcionó.**

**Default:** reportar **efectividad de la navegación** — qué movimientos tomaste, y en los check-ins siguientes, si tu estado se movió en la dirección propuesta. *"Cuando bajas con respiración, tu siguiente check-in mejora 7 de cada 10 veces."*

Eso es imposible para How We Feel, que solo te ubica. **Es el diferenciador del pilar y hay que construirlo desde el arranque.**

⚠️ Lenguaje: asociación, no promesa. Y **cero comparación con otros usuarios** en salud emocional.

### C.2 · Vacíos que informan
Es un pilar recién nacido: casi todo va a estar vacío la primera semana. **Cada reporte debe decir qué le falta para existir** ("necesitas 5 check-ins para ver tu patrón semanal"), no mostrar un cero.

---

# ⏳ TRACK E · AYUNO — META PROPIA Y VELOCIDAD, NO DURACIÓN

**Problema detectado por Enrique:** la escalera de fases hasta 72 h **incita a ayunar de más**, convirtiendo la privación en niveles por desbloquear. El disclaimer de esa misma pantalla menciona trastornos alimentarios. **Es un tema de seguridad, no de estética.**

### E.1 · El progreso se mide contra TU meta
**Default:**
- **El 100% es la meta del usuario**, no un tope universal. El anillo se llena hasta sus 16 h y ahí está completo.
- **Pasar la meta NO llena más nada:** arco delgado y apagado encima, sin color y sin celebración. **Registra que siguió, no lo premia.**
- **Solo se muestran las fases que caben en su meta.** Con meta de 16 h, "ayuno prolongado 48 h" **no existe en su pantalla**. Nunca se presenta como nivel por desbloquear.
- **Al cumplir la meta, el copy empuja al siguiente paso**, no deja un vacío que invite a seguir: *"Ya llegaste. Romperlo bien cuenta tanto como sostenerlo."* → enlaza al cierre guiado con proteína primero que ya existe.

### E.2 · 🎯 La métrica de mejora cambia de eje
**Default:** el progreso real que se reporta **no son horas aguantadas sino qué tan rápido cambias de combustible.**

Dos ayunos de 16 h con meses de diferencia: el de antes cambiaba a las 15.5 h, el de hoy a las 10.5 h. **Mismo ayuno, mejor metabolismo.** Se visualiza como **la curva moviéndose a la izquierda**, nunca como una barra llegando más lejos.

**Por qué importa:** invierte el incentivo. Para mover esa curva hay que comer mejor, dormir y entrenar. **El ayuno deja de ser la palanca y se vuelve el termómetro.** Y es literalmente la definición de flexibilidad metabólica, que tiene respaldo primario (Goodpaster & Sparks, *Cell Metabolism* 2017).

### E.3 · Modo medido *(preparar, no bloquear)*
La infraestructura ya existe: `glucose_logs` (mig 040) y `ketones_logs` (078, β-hidroxibutirato en mmol/L).
**Default:** dos modos en la pastilla de fase. **Sin datos de sangre**, fase estimada por tiempo, **declarada como estimación**. **Con glucosa y cetonas**, el estado real medido vía **GKI = glucosa mmol/L ÷ cetonas mmol/L** (Meidenbauer, Mukherjee & Seyfried 2015). Si la glucosa viene en mg/dL, dividir entre 18.016.
⚠️ **El GKI viene de terapia metabólica oncológica.** Se usa como **profundidad de cetosis**, **NUNCA** como afirmación de autofagia.
Si el modo medido no cabe en este batch, **déjalo detrás de una bandera y repórtalo** — no bloquea E.1 ni E.2.

---

## 🧾 Protocolo
`feat/mb9-espiral` desde `main`. Commit por track. Migraciones idempotentes si hacen falta, después de 236. `npx tsc --noEmit` (0) + tests verdes + eslint sin errores nuevos. **NO merge, NO tocar versión, NO `db push`.**

**Delivery con:**
- Confirmación de que **las 4 fases sin respaldo salieron** (Track D).
- Resultado de los invariantes del algoritmo de colocación: **cero colisiones** y monotonía de radio contra intensidad.
- Cómo garantizaste el **determinismo** de las posiciones.
- Confirmación de que **`NO_DESCENT_TARGET_IDS` sigue intacto** y su test pasa.
- Qué de la UX de MB-8 tuviste que tocar, si algo, y por qué.
- **Dónde paraste** si no llegaste al final.
- Checklist de device test por track.
