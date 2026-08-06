# 🎡 AWAY RUN · MB-10 — EMOCIONES pasa de check-in a módulo completo

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb10-emociones` desde `main`. NO merge, **NO tocar la versión**, **NO `db push`**. Cowork audita.
**Origen:** device test de MB-9 + investigación de estructuras emocionales + **cuatro prototipos interactivos ya validados con Enrique** (2026-07-27/28).

---

## 🧭 EL CAMBIO DE FONDO — leer antes de cualquier track

MB-9 entregó un mapa espiral bonito. **El device test reveló que como puerta de entrada es un examen**: pide pellizco, zoom, memoria espacial y desambiguar 144 palabras. Enrique lo dijo así: *"no le ayuda a quien está mal... si las personas no podemos hacer sentido de ello, no tiene caso."*

**La corrección viene de dos hallazgos de literatura:**

1. **Las categorías describen la experiencia mejor que las dimensiones.** Cowen & Keltner (*PNAS* 2017): la experiencia reportada se captura mejor con categorías que con calificaciones de valencia y activación. Nuestro mapa es exactamente valencia × activación.
2. **Nombrar es la intervención, no el trámite previo.** Lieberman (2007): poner el sentimiento en palabras baja la actividad de la amígdala y sube el prefrontal ventrolateral derecho.

> **De ahí sale el criterio rector de todo este batch: gana lo que lleve a la palabra exacta más rápido.** Todo lo demás se subordina.

### El módulo queda con tres partes, no tres modos paralelos
- **CHECK-IN** · dos puertas que se eligen solas (rueda y cuerpo)
- **INTERVENCIÓN** · la cola común de cualquier puerta
- **EXPLORACIÓN** · el mapa espiral, fuera del check-in

⚠️ **La intervención NO es una tercera puerta.** Si se construye por separado terminas con tres flujos de navegación, tres de estadística y tres de salvaguarda.

---

# 🎡 TRACK A · LA RUEDA (nueva puerta principal del check-in)

Estructura de tres anillos con acercamiento de cámara. **Prototipo validado por Enrique.**

### A.1 · Jerarquía: 6 núcleos → 13 familias → 144 emociones
Los 13 `EmotionFamily` que ya existen en `src/data/emotions-library.ts` **son el anillo intermedio**. No se crean datos: se usan los que hay.

| Núcleo | Familias que lo componen | Emociones |
|---|---|---|
| **Enojo** | ira | 12 |
| **Miedo** | miedo · agobio | 18 |
| **Tristeza** | tristeza · rechazo · desconexión · vergüenza | 42 |
| **Alegría** | energía · gratitud · curiosidad | 33 |
| **Fuerza** | foco | 8 |
| **Paz** | calma · afecto | 31 |
| | | **144** |

Los seis núcleos son los de **Willcox (1982)**, el instrumento más usado en consulta.

**Decisión tomada — Vergüenza cuelga de Tristeza.** Es donde suele ubicarse en la práctica clínica y evita crear un séptimo núcleo con 7 emociones. **La jerarquía completa vive en UN SOLO archivo de configuración**, así que mover una familia de núcleo es editar una línea. Enrique puede vetarlo después sin tocar código de UI.

### A.2 · 🔑 Ancho proporcional al contenido — esto es lo que hace que quepan las 144
**El arco de cada sector es proporcional a cuántas emociones lleva dentro.** Núcleo de 42 emociones ocupa ~105°; uno de 8 ocupa ~20°.

**Por qué es obligatorio:** con sectores iguales, las 42 de Tristeza recibirían 1.4° cada una y las 8 de Fuerza 7.5°. Con reparto proporcional **cada emoción recibe exactamente 2.5°**, o sea que **ninguna es más difícil de tocar que otra**.

Efecto secundario que Enrique aprobó: la rueda se ve dispareja, **y eso es honesto** — hay más palabras en español para el bajón que para el empuje.

### A.3 · Revelado por nivel
- **Nivel 0 (lejos):** se ven los tres anillos y todas sus divisiones, **pero solo se leen los 6 núcleos.** Nada que descifrar todavía.
- **Nivel 1:** al tocar un núcleo la cámara entra a su sector y aparecen **sus familias**. El resto de la rueda **no desaparece: se apaga**, para no perder dónde estás parado.
- **Nivel 2:** al tocar una familia entran **sus emociones** con nombre.
- **Una etiqueta solo se dibuja si cabe:** si el arco a esa escala no da el alto de texto, no se pinta. Nada encimado, nunca.

### A.4 · Se puede saltar niveles
Si el usuario ya sabe qué quiere, **puede tocar directo el anillo exterior desde donde esté**. Los tres toques son el camino guiado, no una cadena obligatoria.

### A.5 · Detalles de render
- Texto **radial** siguiendo el sector, **volteado del lado izquierdo** para que nunca se lea de cabeza.
- Contador visible de cuántas emociones quedan en el nivel actual ("42 aquí"). Es la señal de "voy bien, se está acotando".
- Cámara con interpolación suave; **la animación NUNCA bloquea el siguiente toque** — si el usuario ya sabe a dónde va, se adelanta.

### A.6 · 🆕 El aterrizaje muestra la descripción *(pedido de Enrique)*
Al elegir la emoción final se muestra **su `description`**, que **ya existe en las 144** (`emotions-library.ts`). Ejemplo real: *"Sientes una alegría tan grande que es difícil contenerla. Todo brilla."*

Además, en el aterrizaje se nombra el mecanismo en una línea: **ponerle nombre a lo que sientes ya bajó algo; no es el trámite antes de la ayuda, es la primera parte de la ayuda.** No es copy motivacional, es Lieberman.

---

# 🫀 TRACK B · LA PUERTA DEL CUERPO

**No vive en un menú de modos.** Vive como una salida discreta en la rueda: **"No sé cómo se llama"**. Aparece exactamente cuando hace falta.

**Respaldo:** Nummenmaa et al. (*PNAS* 2014, n=701) — las emociones producen mapas corporales **consistentes y culturalmente universales**. Enojo y miedo activan torso alto, brazos y cabeza; la tristeza apaga las extremidades; el asco se localiza en abdomen y garganta.

**Default:** silueta o zonas grandes en lenguaje de cuerpo (*pecho apretado · cabeza y mandíbula · estómago · todo apagado*). La zona elegida **acota a un par de familias candidatas** y de ahí el flujo continúa igual que la rueda.

**Por qué importa:** es la única puerta que funciona cuando la persona no tiene palabras, y **ninguna app de emociones entra por ahí**. Además es lo más ATP posible: si somos cuerpo primero en nutrición, fitness y salud, que también lo seamos aquí.

⚠️ El mapeo cuerpo→emoción **no es uno a uno**. Se ofrece como acotamiento, nunca como diagnóstico: *"esto suele sentirse así"*, no *"lo que tienes es"*.

---

# 🎯 TRACK C · RUTEO ADAPTATIVO EN EL ATERRIZAJE

**El usuario nunca elige un "modo". La app se adapta a su capacidad.**

Regla, derivada de la ventana de tolerancia y del modelo de `ANALISIS_NAVEGACION_EMOCIONAL_v2.md`:

- **Emoción desagradable de alta activación e intensidad ≥6** → **UNA sola salida**, y es del cuerpo (respiración / frío / movimiento). Nada de reencuadrar. Con la activación arriba las herramientas cognitivas casi no sirven, y **ofrecerlas ahí es preparar a la persona para fallar**.
- **Dentro de la ventana** → dos o tres salidas, porque ahí sí hay capacidad de elegir.
- **Estados agradables** → se ofrece saborear o activar, nunca "bajar".

⚠️ **La lógica de destinos sigue siendo de `emotion-navigation-core.ts`.** Este track decide **cuántas** salidas se ofrecen y de qué tipo; **no** decide a qué emoción se va. **`NO_DESCENT_TARGET_IDS` es intocable y su test debe seguir pasando.**

---

# 🌀 TRACK D · EL MAPA SALE DEL CHECK-IN

El espiral de MB-9 **no se tira: cambia de lugar y de propósito.**

**Default:** se mueve a **Exploración**, con su propia entrada desde el hub de Mente o el perfil emocional. Es para días buenos: recorrer el territorio, construir vocabulario, ver la navegación como geometría.
**Se retira del flujo de check-in.** Meterlo como tercera opción mete una decisión en el peor momento.

### D.1 · Y ahí sí se arreglan los bugs del device test
1. **🔴 BUG del zoom — causa raíz ya diagnosticada, no la re-investigues.** `Gesture.Simultaneous(pan, pinch)` con el pan **sin límite de dedos**: al pellizcar, el centroide se mueve y **el pan se activa también**, sumando su delta a `rawTx/rawTy` mientras el pinch aplica su anclaje focal. Dos modelos escribiendo la misma variable → deriva a la esquina. **Fix: `.maxPointers(1)` en el pan** para que el pinch sea dueño de los gestos de dos dedos.
2. **El cribado está brutal.** En las capturas casi todo se ve negro con dos o tres brillantes. **No lee como jerarquía, lee como roto.** Subir el piso de opacidad de lo no destacado.
3. **Burbujas tardan en aparecer.** Revisar el revelado por zoom.
4. **Reparto radial por ORDEN, no por valor** *(validado en prototipo)*: la distribución real de `intensity` es una campana (0 emociones en intensidad 1, una en 2, **63 entre 5 y 6**), por eso el centro sale hueco. **Ordenar las 144 por intensidad y repartir por posición en la fila, con raíz cuadrada para densidad pareja por área.** El orden se respeta por construcción; no se toca ni una intensidad.
5. **El centro deja de etiquetarse "CALMA".** Calma es una emoción concreta que vive en baja energía agradable; el centro es **baja intensidad de cualquier cualidad**, y su punto exacto es ausencia de emoción — justo lo que la salvaguarda de anhedonia evita. Pintar eso como destino deseable contradice nuestra propia protección.
   **Decisión tomada: el centro NO se etiqueta.** Queda como origen de los ejes, con su claro visual pero sin nombre. Es lo más honesto y no lo convierte en meta. *(Alternativa que Enrique puede activar después: llamarlo por la zona de capacidad, "tu ventana", que es donde las herramientas cognitivas empiezan a servir. Dejar el texto en constante para poder cambiarlo sin tocar el render.)*

---

# 📊 TRACK E · LA ESTADÍSTICA SIGUE VIVA

Lo de MB-9 Track C **no se toca ni se duplica**. Solo hay que asegurar que **las tres puertas escriben el mismo registro**: qué emoción, por qué puerta se llegó, qué movimiento se ofreció y cuál se tomó.

**Default:** agregar al log de check-in **la puerta de entrada** (`rueda` · `cuerpo` · `mapa` · `busqueda`). Sirve para responder algo que ninguna app puede: **¿la gente que entra por el cuerpo termina en emociones distintas que la que entra por la rueda?** Y para saber cuál puerta usar por defecto con el tiempo.

---

# 🔧 TRACK F · LAS INTERVENCIONES SE CABLEAN A LAS HERRAMIENTAS REALES

Hoy la navegación **propone** un movimiento pero no lleva a ningún lado. Eso la deja en consejo, no en ayuda.

**Default:** cada movimiento aterriza en una herramienta que **ya existe en la app**:
- **↓ Bajar** → sesión de respiración del pilar Mente (la lenta / 4-7-8 según intensidad). **Esta es la más importante: es la única salida que se ofrece en activación alta, y si no lleva a nada, el momento crítico queda sin resolver.**
- **→ Cruzar / reencuadrar** → journal con el prompt correspondiente.
- **↑ Subir / saborear** → movimiento, luz, o la pieza de audio que aplique.
- **Solo registrar** → guarda y regresa a HOY.

**Al volver de la herramienta, se ofrece un re-check-in corto** ("¿cómo quedaste?"). Ese segundo dato es el que alimenta la métrica de efectividad de MB-9 y es **el único modo de saber si esto sirve**.

---

# 🔍 TRACK G · LA CUARTA PUERTA — BÚSQUEDA

Para quien ya sabe qué siente y no quiere navegar nada.
**Default:** campo de búsqueda accesible desde la rueda, que busca en **nombre y descripción** de las 144, tolerante a acentos y a escritura parcial. Cae en el mismo aterrizaje que todas las demás puertas.

---

# 🏛️ TRACK H · EL MÓDULO COMO MÓDULO

Emociones deja de ser una pantalla suelta colgada de HOY.

**H.1 · Entrada coherente.** Un lugar donde vivan las tres partes: hacer check-in, explorar el mapa, y ver tu historia. **Aplica la doctrina de menú: cards editoriales que llevan a algún lado, CERO datos duros en el hub.** Un dato vive en un solo lugar.

**H.2 · Las tres pantallas existentes se alinean al módulo.** `app/emotion-history.tsx` · `app/emotion-profile.tsx` · `app/emotion-navigation.tsx` ya existen y MB-7 solo les dio retoques. Ahora deben:
- Hablar el vocabulario nuevo (núcleo · familia · emoción).
- Recibir la **barrida editorial gradiente** completa, al nivel de Mente V1.5.2.
- Cazar el **antipatrón de opacidad apilada** que sigue vivo en `checkin.tsx` y compañía (botones que se ven apagados como si tuvieran algo encima).

**H.3 · Vacíos que informan, en todo el pilar.** Es un módulo recién nacido: la primera semana casi todo va a estar vacío. **Cada pantalla debe decir qué le falta para existir** ("necesitas 5 check-ins para ver tu patrón"), nunca mostrar un cero pelón.

**H.4 · ARGOS ve el estado emocional, con límites.** El check-in del día entra al contexto de ARGOS para que sus recomendaciones lo tomen en cuenta.
⚠️ **Límites duros:** ARGOS **no diagnostica**, **no interpreta patrones emocionales como condición clínica**, y **nunca menciona el expediente de navegación de otros días sin que el usuario pregunte**. Si detecta señales sostenidas de malestar profundo, **sugiere apoyo profesional, no lo resuelve él**.

---

## 🧾 Protocolo
`feat/mb10-emociones` desde `main`. Commit por track. Migraciones idempotentes si hacen falta, después de 237. `npx tsc --noEmit` (0) + tests verdes + eslint sin errores nuevos. **NO merge, NO tocar versión, NO `db push`.**

### ⚠️ Reglas de este batch
1. **Nada queda bloqueado esperando a Enrique.** Las dos decisiones abiertas ya están tomadas con default en el brief y **viven en constantes editables**, no en el render. Si aparece otra decisión, **toma la más conservadora, sigue, y flaguéala en el delivery.**
2. **El objetivo es el módulo COMPLETO: los ocho tracks.** El orden importa porque A → C → F es la columna vertebral (llegar a la palabra, decidir la salida, y que la salida lleve a algo real). Haz esos primero para que en cualquier momento haya algo que funcione de punta a punta, y sigue con B, D, G y H hasta terminar. Solo si de verdad se acaba el tiempo, **para en frontera limpia de track y repórtalo** — nunca a media pantalla.
3. **`NO_DESCENT_TARGET_IDS` es intocable.** Ninguna puerta, ninguna búsqueda y ninguna sugerencia puede guiar hacia anhedonia.
4. **La estadística de MB-9 no se duplica ni se reescribe:** las puertas nuevas escriben en lo que ya existe.

**Delivery con:**
- Confirmación de que **ninguna etiqueta se encima** en ningún nivel de la rueda y de que **cada emoción recibe el mismo arco** en el anillo exterior.
- Confirmación de que **`NO_DESCENT_TARGET_IDS` sigue intacto** y su test pasa.
- Confirmación de que **la salida de "bajar" en activación alta lleva de verdad a una respiración** (Track F). Es el camino crítico del módulo.
- Qué se rompió al sacar el mapa del check-in, si algo.
- Qué decisiones tomaste tú por default y cuáles quiere revisar Enrique.
- **Dónde paraste** si no llegaste al final, y por qué esa frontera es limpia.
- Checklist de device test por track.

## 📚 Respaldo
- Willcox G. "The Feeling Wheel." *Transactional Analysis Journal* 1982 *(6 núcleos, granularidad hacia afuera)*
- Cowen AS, Keltner D. *PNAS* 2017 *(27 categorías con gradientes; categorías > dimensiones)*
- Lieberman MD et al. "Putting Feelings Into Words." *Psychological Science* 2007 *(nombrar reduce amígdala)*
- Nummenmaa L et al. "Bodily maps of emotions." *PNAS* 2014 *(mapas corporales universales)*
- Russell JA. *J Pers Soc Psychol* 1980 *(circumplejo, base del mapa de exploración)*
- Contexto completo en `R and D/RESEARCH_ESTRUCTURAS_DE_EMOCION.md` y `R and D/ANALISIS_NAVEGACION_EMOCIONAL_v2.md`
