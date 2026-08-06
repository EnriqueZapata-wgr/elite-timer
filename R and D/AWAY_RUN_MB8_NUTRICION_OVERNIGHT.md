# 🌙 AWAY RUN · MB-8 — Pilar NUTRICIÓN completo (overnight, para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb8-nutricion` desde `main` (ya trae MB-7). NO merge, **NO tocar la versión**, **NO `db push`**. Cowork audita de madrugada; Enrique prueba en la mañana.
**Contexto:** Fitness y Mente están cerrados, Emociones va encaminado. **Nutrición es el siguiente pilar de la marcha hacia V2 completa** y es el que Enrique usa a diario, así que el device test de mañana es real (desayuna y ya lo probó).

## 📐 CÓMO CORRER ESTE BATCH
**Track 0 primero y completo**, porque alimenta a todos los demás. Luego los tracks de arreglo **en orden**.
**Regla de corte:** si te quedas sin tiempo, **para en frontera limpia de track** y repórtalo. Un track sólido vale más que seis a medias. Enrique no trabaja con parches.
**Commit por track.** Migraciones idempotentes si hacen falta, numeradas después de 236.

---

# 🔍 TRACK 0 · AUDITORÍA DEL PILAR *(primero, y se entrega escrita)*

Nadie ha auditado Nutrición en esta corrida. **Antes de arreglar, levanta el mapa.** Entrega el resultado en `R and D/AUDITORIA_NUTRICION_2026-07-27.md`.

Superficie conocida:

| Pantalla | Líneas |
|---|---|
| `app/food-scan.tsx` | 1608 |
| `app/fasting.tsx` | 1343 |
| `app/food-text.tsx` | 949 |
| `app/supplements.tsx` | 823 *(MB-2 ya la tocó)* |
| `app/food-register.tsx` | 523 |
| `app/nutrition.tsx` | 480 *(hub)* |
| `app/my-recipes.tsx` · `argos-recipes.tsx` · `food-preferences.tsx` | 355 · 316 · 177 |

**Qué levantar:**
1. **El mapa de caminos:** ¿cuántas formas hay de registrar una comida y en qué se diferencian? Sospecha fuerte: `food-scan`, `food-text` y `food-register` hacen el mismo trabajo por tres puertas. **Es el mismo patrón que nos mordió en Fitness** (tres runners para una sesión).
2. **Fantasmas de esquema.** Aplica el método de MB-6: **`supabase-js` no lanza en 4xx**, el error viene en `{ error }`. Cruza cada `.select/.insert/.update` del pilar contra el esquema real (columnas que existan, `NOT NULL` sin default cubiertos, tipos de filtro correctos) y revisa que cada query chequee `error`. En MB-6 esto destapó 15 bugs silenciosos, dos de ellos en el score de nutrición.
3. **Dónde falta editorial gradiente** y dónde sobrevive el lime brutalist.
4. **Estados vacíos** de cada pantalla: es lo primero que ve un usuario nuevo.
5. **Dónde el copy incumple** las reglas de abajo (Track E).

---

# 🚪 TRACK A · CONSOLIDAR LOS CAMINOS DE REGISTRO

**Default:** que exista **un solo flujo de registro de comida con varias entradas**, no tres flujos paralelos. Foto, texto y manual son **maneras de llenar el mismo registro**, no productos distintos: el usuario elige cómo describe la comida y de ahí en adelante el camino es uno solo (revisión, ajuste, guardado, score).

- Si una de las tres pantallas es legacy y ya nadie debería llegar ahí, **retírala** (mismo criterio que `routine-execution.tsx` en MB-7) y reporta qué ruteaba a ella.
- Si las tres son legítimas, **unifica lo que sigue después de capturar**: una sola pantalla de revisión y guardado.
- ⚠️ Es el registro diario de Enrique: **ningún cambio puede perder datos ya guardados**. Si hay migración de forma, que sea aditiva y reversible.

---

# 👻 TRACK B · LOS FANTASMAS QUE ENCUENTRE EL TRACK 0

Arregla lo que levantó el punto 2 del Track 0, con el criterio de MB-6:
- Cada query chequea `error` y **lo loguea** aunque degrade en silencio hacia el usuario.
- Un `catch` de lectura **nunca devuelve un valor que se confunda con un dato real**. "Sin registro" y "cero" son estados distintos.
- **Recordatorio de MB-6:** la calidad de una comida vive en `ai_analysis.score` (IA) o en `notes.quality_score` (manual). `food_logs.quality_score` **no existe**. Si encuentras más código buscándola, es el mismo fantasma.

---

# 🎚️ TRACK C · SIMPLE POR DEFECTO, COMPLETO OPCIONAL

Doctrina de Enrique, **no negociable**: *guiado, no prisionero.*

**Default:** el camino por defecto de registrar comida es **el más corto que sirva** (describir y listo). Todo lo granular (gramajes finos, micros, edición de macros, etiquetas) vive en un **modo COMPLETO que el usuario activa**, no en el camino principal.
- El modo se recuerda: si eligió COMPLETO, no se lo vuelvas a preguntar.
- **Nunca bloquees el guardado** por un campo faltante. Se guarda con lo que haya y se puede completar después.
- Mismo criterio en ayuno, hidratación y suplementos: lo esencial al frente, lo fino a un nivel de profundidad.

---

# 🍖 TRACK D · DOCTRINA ATP EN LO QUE LA APP RECOMIENDA

Estas son reglas de contenido de ATP. **Si el código o el copy las contradice, es bug.**

0. **El marco, antes que los números: ATP es comida-limpia-céntrica y flexibilidad-metabólica-céntrica.** NO es proteíno-céntrica ni grasa-céntrica. Los rangos de abajo son **consecuencia** de comer limpio, no la doctrina en sí. Si el copy o la UI presentan a ATP como "la app de las grasas" o como una dieta de un macro, es bug: lo que se persigue es **limpieza de la comida y capacidad de usar los dos combustibles**.
1. **Macros ATP:** carbohidratos 0-25% · grasas 50-75% · proteína 20-35%. Verifica que los targets, gráficas y semáforos del pilar usen estos rangos y no los convencionales.
2. **Romper el ayuno: proteína primero.** Que el flujo de romper ayuno lo guíe, no que sea un registro cualquiera.
3. **Aceites vegetales industriales NO.** Y **AHA, USDA, Harvard y ADA no son autoridad** para ATP: son cuerpos capturados por industria. Si hay copy o lógica que los cite como respaldo, fuera.
4. **Plantas tradicionales sí, extractos comerciales no.** Té, polvo o alimento entra al catálogo de nutrición; cápsulas y extractos son suplementación y van por BHA. El vehículo importa.
5. Si detectas un choque entre una regla de estas y algo que ya está construido, **NO lo resuelvas por tu cuenta: flaguéalo.** Es doctrina de Enrique y Mariana.

---

# 🎨 TRACK E · EDITORIAL GRADIENTE Y COPY

**E.1 · Barrida visual.** Vara: `docs/DESIGN_SYSTEM.md`, y la referencia lograda es Mente V1.5.2 y el Fitness post-MB-7. Fuera lime brutalist, dentro degradados y molde editorial. **Caza el antipatrón de opacidad apilada** (botones que se ven "apagados como si tuvieran algo encima") que apareció en Fitness: es probable que viva aquí también.

**E.2 · El hub `nutrition.tsx` es navegación, no tablero.**
Doctrina: **un menú se navega, no se consulta.** Cards editoriales que llevan a algún lado, **cero datos duros** en el hub. Y **un dato vive en un solo lugar**: si las calorías del día ya se ven en el registro, no se repiten en el hub.

**E.3 · Copy.**
- Español de México. **Explica toda sigla la primera vez** que aparece.
- Guía con ejemplos concretos en vez de instrucciones abstractas.
- Inputs amigables en móvil (teclado correcto por tipo de dato).
- **Cero nombres propios de personas en copy de usuario.** Toda recomendación es de ATP o de ARGOS.
- Que no suene a texto generado: sin muletillas, sin jerga sin presentar.

---

# ⏳ TRACK F · AYUNO AL NIVEL DE LA COMPETENCIA

Enrique mandó capturas de **Zero Fast** para levantar la vara del pilar. **Análisis completo y criterio en `R and D/SPEC_ADOPCIONES_ZERO_A_ATP.md` — léelo antes de este track.** Ahí está también lo que **NO** se copia y por qué.

Se adopta **la función y la decisión de UX, nunca la estética ni el modelo de negocio**. Zero es blanco, aireado y agresivamente freemium; ATP es oscuro, editorial y de degradados. Todo esto aterriza en molde ATP.

### F.0 · 🔴 CONTENCIÓN — bajar de 30 decisiones a un puñado *(lo primero de este track)*
**`app/fasting.tsx` tiene 1,343 líneas y 30 elementos presionables. La pantalla equivalente de Zero tiene 4, y solo 1 es primario.** Enrique: *"básicamente quiero que sea así de fácil de usar."*
**No es un problema de estilo. Ninguna barrida de degradados lo arregla.** Lee la sección **ANATOMÍA DE LA INTERACCIÓN** del SPEC y aplícala:

1. **El botón primario NO se mueve entre estados.** Iniciar y Terminar ocupan la misma posición, tamaño y forma; **solo cambia el peso visual** (iniciar = relleno sólido; terminar = relleno tenue). El pulgar aprende un solo lugar. Terminar antes de tiempo baja de énfasis **sin esconderse y sin diálogo de confirmación**.
2. **El anillo no se mueve.** Mismo lugar y tamaño en ambos estados; solo cambia lo que vive adentro. **Cero salto de layout.**
3. **El número es el héroe:** se lee a un metro, de reojo. Todo lo demás se subordina.
4. **Tres niveles de texto, sin excepciones:** etiqueta (chica, gris, mayúsculas espaciadas) · valor (negrita, alto contraste) · acción (mediana, color de marca).
5. **Una sola acción primaria por estado.** Nunca dos botones compitiendo.
6. **El estado se anuncia con palabras** en el encabezado, no solo implícito en la UI.

**Default:** audita las 30 superficies, quédate con las que sostienen la tarea principal y **pliega, agrupa o retira el resto**. Reporta la cuenta antes y después. Si algo te parece indispensable y no cabe, **flaguéalo** en vez de dejarlo tirado en la pantalla.

### F.1 · Etapa metabólica en vivo *(la joya)*
Durante el ayuno activo, una pastilla nombra **la fase fisiológica en la que estás ahora** y cambia conforme avanzan las horas. Convierte una cuenta regresiva en la narrativa de lo que pasa en tu cuerpo, que es justo el terreno de ATP.
**Default:** pastilla bajo el contador con la fase actual + detalle a un toque (qué pasa ahora, qué sigue).
⚠️ **Las ventanas horarias de cada fase las define Enrique** (`R and D` de ayuno + su protocolo). **NO las inventes ni las copies de Zero.** Implementa el mecanismo con las fases parametrizadas en un solo lugar, deja un default razonable **marcado como provisional**, y **flaguéalo en el delivery** para que él lo cierre.

### F.2 · Editar inicio y meta desde el propio timer
Zero permite "Edit Start" y "Edit 16h Goal" sin salir de la pantalla. Es *guiado, no prisionero*: se te olvidó arrancar el timer y lo arreglas donde estás.
**Default:** ambos editables inline, con el recálculo en vivo del progreso y la hora meta.

### F.3 · Estado vacío que informa
Sin ayuno activo, Zero muestra **"Tiempo desde tu último ayuno"** en vez de un anillo vacío.
**Default:** mismo criterio. **Y aplícalo como regla a todo el pilar**: los pilares de ATP son nuevos y casi todo va a estar vacío la primera semana. Un vacío que informa es la diferencia entre "esto no sirve" y "esto ya me conoce". Si nunca ha ayunado, que el vacío invite en vez de acusar.

### F.4 · Tira de la semana y marcador de progreso
**Default:** tira de 7 días con un anillo por día (consistencia de un vistazo, sin abrir otra pantalla) y un **marcador que viaja sobre el anillo** del timer, que lee mejor que solo el relleno: ves dónde vas, no solo cuánto falta.

> ⛔ **NO construir:** "Protein Score" ni ningún medidor equivalente. **Choca con la doctrina ATP** (grasa 50-75%, proteína 20-35%): Zero es proteíno-céntrico, ATP es grasa-céntrica. El razonamiento completo está en el SPEC.
> ⛔ **NO copiar** la densidad de upsell de Zero (tarjetas de pago por todos lados, métricas con candado). Nuestro modelo es otro.

---

# 🧾 Protocolo
`feat/mb8-nutricion` desde `main`. Un commit por track. `npx tsc --noEmit` (0) + tests verdes + eslint sin errores nuevos. **NO merge, NO tocar versión, NO `db push`.**

**Delivery con:**
- `R and D/AUDITORIA_NUTRICION_2026-07-27.md` completo (Track 0), aunque no hayas arreglado todo lo que encontraste. **Enrique prioriza lo que quede.**
- Cuántos caminos de registro había y con cuáles te quedaste.
- Los fantasmas encontrados y cuáles siguen abiertos.
- **Qué choca con la doctrina y necesita a Enrique** (no lo resuelvas solo).
- **Dónde paraste** si no llegaste al final, y por qué esa frontera es limpia.
- Checklist de device test por track, pensado para que Enrique lo camine desayunando.
