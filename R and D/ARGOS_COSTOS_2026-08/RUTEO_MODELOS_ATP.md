# Ruteo de modelos ATP
## Qué acción va con Gemini, qué acción va con Sonnet, y por qué

**Fecha:** 11 de agosto de 2026
**Fuente:** código de `argos-proxy` v31 leído completo, tabla `proton_action_costs` (16 filas) y 1,273 registros reales de `argos_logs` entre el 20 de mayo y el 10 de agosto de 2026.
**Regla que se está estandarizando (tuya):** *lo que no requiere el cerebro ARGOS se va con Gemini; lo que tiene contexto y requiere análisis gordo se va con Sonnet.*
**Estado:** las tres decisiones abiertas ya están tomadas. Insight sube a Sonnet con cerebro, `bha_scan` se parte en dos, `routine` es legacy y no se toca.

> 📌 **La sección 4B, la del caché, quedó superada por `INGENIERIA_DE_CACHE_ATP.md`.** El diagnóstico era correcto pero la solución que propuse ahí, rehacer el cron primero, es la cara. **Con caché de una hora se captura el 90% del ahorro con una línea de código.** Ese documento manda sobre esta sección.
>
> 🔄 **Actualizado el 11 de agosto. Anthropic confirmó por correo que Sonnet 5 NO sube de precio el 1 de septiembre y se queda en tarifa de introducción.** Todos los costos de este documento venían sobreestimados un tercio porque la tabla `PRICING` del proxy tiene cableadas las tarifas estándar. **Las tablas de abajo ya están corregidas.** Y hay una tarea nueva que sale de esto: bajar `PRICING` a las tarifas de introducción, o la telemetría de costos va a seguir mintiendo 33% para arriba en todos los tableros.

---

# 0 · Antes que nada, una corrección mía

**Te dije que `HARD_CAP_DAILY = 50` era el límite y que era igual para todos los tiers. Es falso.** Fui a leer el código y el límite real sí diferencia:

```ts
const TIER_DAILY_LIMITS: Record<string, number> = {
  free: 5,
  base: 25,
  pro: 150,
  clinician: 100,
};
const limit = TIER_DAILY_LIMITS[effectiveTier] ?? HARD_CAP_DAILY;
```

`HARD_CAP_DAILY = 50` es solo el default de emergencia para un tier que no esté en la tabla. El gating por tier ya existe y ya funciona. Lo que dije en la estructura de valor estaba mal y ya lo corregí ahí.

**Lo que sí es cierto y sí es un problema** es otra cosa, y es más interesante: **el límite cuenta acciones, no costo.** Una estimación de comida por texto consume la misma unidad de cuota que una generación completa de diagnóstico que cuesta cien veces más. Eso es lo que el ruteo por modelo permite arreglar, y va en la sección 5.

---

# 1 · El hallazgo que cambia dónde se hace el trabajo

**`argos-proxy` no decide el modelo. No es un router.** No tiene un solo `switch`, ni un mapa de modelo por tipo de petición. Es un proxy delgado: recibe `model` desde la app y lo pasa tal cual.

```ts
const PRIMARY_MODEL_DEFAULT = "claude-sonnet-5";
const finalModel = model || PRIMARY_MODEL_DEFAULT;
```

Consecuencia directa: **el ruteo que quieres se hace en el cliente, en `src/constants/llm-config.ts`, no en el proxy.** El proxy solo hay que tocarlo para dos cosas: la cuota partida y una whitelist de `action_keys` que hoy no existe.

**Y el cerebro tampoco se decide por tipo.** Se activa con una sola condición:

```ts
if (BRAIN_ON && typeof body.dynamicSystem === "string" && body.dynamicSystem.length > 0) {
```

Solo `chat` manda `dynamicSystem`. El propio comentario del código lo dice:

> *"Solo se activa si el cliente mandó dynamicSystem (bundle nuevo, turno de chat). Bundles viejos sin OTA y callers no-chat (insight diario, DX, nutrición) siguen por la ruta legacy."*

Esto es importante porque significa que **hoy 14 de las 16 acciones ya corren sin cerebro y aun así están en Sonnet.** Están pagando el modelo caro sin usar lo que lo hace caro. La regla que propones no es un recorte, es cerrar una fuga.

**Verificado en los logs:** de 1,273 registros, las únicas 32 llamadas que corrieron en Gemini fueron **fallbacks por error de Anthropic**, no ruteo intencional. Ninguna acción va a Gemini por diseño hoy.

---

# 2 · La regla, escrita para que se pueda aplicar sin discutirla cada vez

> **Va con Gemini** si la tarea se puede describir sin mencionar a la persona: leer, extraer, transcribir, convertir a estructura. El resultado sería el mismo para cualquier usuario con el mismo insumo.
>
> **Va con Sonnet** si la respuesta cambiaría según quién pregunta, según qué trae encima, o según lo que dice el cerebro ATP.

La prueba de una línea: **¿el output cambiaría si fuera otra persona con el mismo input?** Si no cambia, es Gemini.

Un tercer caso que hoy no existe y que sale de aplicar la regla en serio: **acciones partidas en dos.** Leer una etiqueta es extracción y va con Gemini. Decidir si esa etiqueta es Biohacker Approved es doctrina ATP y va con Sonnet. Hoy las dos cosas viven en una sola llamada cara.

---

# 3 · Las 16 acciones clasificadas

Costos medidos en producción y convertidos a pesos al FIX de 17.1387, **ya ajustados a la tarifa de introducción de Sonnet 5**, que es la que Anthropic confirmó que se queda. Ojo: la tabla `PRICING` del proxy sigue cableada a la tarifa estándar, así que lo que ves en el tablero es un tercio más alto que lo que realmente se cobra, hasta que se corrija.

## 🟢 Van con Gemini

| Acción | H+ | Costo hoy | Costo con Gemini | Factor | Por qué |
|---|---|---|---|---|---|
| `food_estimate_photo` | 245 | $0.297 | **$0.007** | **45x** | Ver un plato y estimar macros. No cambia según quién comió |
| `food_estimate_text` | 155 | $0.164 | ~$0.004 | ~45x | Parsear texto a gramos. Es conversión, no criterio |
| `label_scan` | 240 | $0.201 | ~$0.007 | ~30x | Leer lo que dice la etiqueta. Extracción pura |
| `supplement_scan` | 240 | $0.298 | ~$0.007 | ~45x | Ídem. Leer, no juzgar |
| `lab_interpretation` **(la parte de extraer)** | 165 | $0.153 | **$0.006** | **28x** | Sacar los valores del PDF. Ya está medido funcionando en Gemini, 28 llamadas reales |
| `voice_stt` | 15 | ya en Gemini | ya en Gemini | | Transcripción. Ya está bien |

Los factores de 45x y 28x **no son estimaciones**: salen de comparar el promedio real de las llamadas que ya corrieron en cada modelo dentro de `argos_logs`.

## 🔵 Se quedan con Sonnet

| Acción | H+ | Costo | Por qué se queda |
|---|---|---|---|
| `chat` | 280 | $0.508 | Es la única que ya recibe el cerebro. Es el producto |
| `voice_turn` | 400 | igual que chat | Es chat con otra puerta |
| `dx_generation` | 1000 | $0.749 | Síntesis multi fuente. Es el análisis más gordo que hay |
| `dx_generation_first` | 0 | $0.513 | Ídem, y además es el regalo de bienvenida. No se abarata el primer momento |
| `braverman_premium_report` | 1000 | $0.344 | Dominancias neurotransmisoras según la metodología ATP. Eso es cerebro |
| `intervention_rationale` | 280 | $0.414 | Explicar el porqué de una intervención es doctrina, no dato |
| `lab_interpretation` **(la parte de interpretar)** | 165 | | Cruzar contra rangos clínicos ATP y contra su historial sí cambia según quién es |

## 🟣 Los tres que estaban abiertos, ya decididos

**`insight` diario · 45 H+ · 290 llamadas, la acción más frecuente del sistema.**
**Decisión: sube a Sonnet CON cerebro.** Hoy corre en el peor de los dos mundos, pagando el modelo caro sin usar lo que lo justifica. Es el único mensaje que la persona recibe todos los días, así que su voz es producto, no costo.
🔴 **Pero esta decisión trae una condición técnica que no es opcional. Va completa en la sección 4B.**

**`bha_scan` · 500 H+ · $0.250.**
**Decisión: se parte en dos.** Gemini extrae ingredientes y cantidades en estructura. Sonnet con cerebro emite el veredicto Biohacker Approved sobre esa estructura, que ya es un input chiquito. Más barato, y el veredicto deja de depender de si el modelo leyó bien la foto. El mismo patrón aplica tal cual a `supplement_scan` y `label_scan` cuando alguna necesite juicio y no solo lectura.

**`routine` · 165 H+.**
**Decisión: es legacy huérfano. Si se reactiva, va con cerebro y Sonnet.**
Los datos te dan la razón: **2 llamadas en toda la historia, de un solo usuario, la última el 27 de junio.** No se toca, no se optimiza, y no entra en la cuenta. Si algún día vuelve, entra por la puerta de Sonnet con cerebro, no por la de Gemini.

## ⚫ Y de paso, cinco acciones que están prácticamente muertas

Vale la pena decirlo porque cambia el orden de trabajo: **el costo unitario no es la prioridad, el volumen sí.**

| Acción | Llamadas en 3 meses | Usuarios | Última vez |
|---|---|---|---|
| `intervention_rationale` | 2 | 2 | 30-jul |
| `braverman_premium_report` | 2 | 2 | 30-jul |
| `label_scan` | 2 | 1 | 27-jun |
| `routine` | 2 | 1 | 27-jun |
| `supplement_scan` | 2 | 1 | 21-jun |
| `bha_scan` | 1 | 1 | 17-jul |

Contra esto: `insight` 290, `chat` 166, `lab_interpretation` 69, `food_estimate_photo` 54, `food_estimate_text` 42. **El 90% del gasto vive en cinco acciones.** Optimizar `bha_scan` antes que la foto de comida sería trabajar en el lugar equivocado, por mucho que su costo unitario se vea feo.

**`electron_award`** no es una acción de modelo. Son 609 registros de premios de H+ que se loggean en la misma tabla, con costo cero. No entra en esto.

---

# 4 · La cuenta

Un mes de un usuario Base activo. La mezcla sale del usuario más pesado que existe hoy en producción, que hizo 90 acciones en 27 días activos.

| Acción | Veces | Hoy | Con el ruteo |
|---|---|---|---|
| Insight diario | 30 | $2.21 | $3.91 ⬆ sube, y está bien |
| Insight semanal | 4 | $0.13 | $0.02 |
| Foto de comida | 60 | **$17.81** | **$0.40** |
| Comida por texto | 20 | $3.26 | $0.07 |
| Chat con cerebro | 25 | $12.70 | $12.70 |
| Laboratorio | 2 | $0.31 | $0.11 |
| Diagnóstico funcional | 1 | $0.75 | $0.75 |
| Escaneos de etiqueta | 3 | $0.89 | $0.02 |
| **TOTAL AL MES** | | **$38.05** | **$18.08** |

**52% menos**, y el insight es la única línea que sube, a propósito, porque se le está metiendo el cerebro.

Lo que importa más que el ahorro: **el chat y el insight, las dos acciones que usan el cerebro, pasan de ser el 39% del costo a ser el 92%.** El gasto queda concentrado exactamente donde vive lo que nadie más puede dar.

Contra $336 de margen mensual de Base cobrando en web, el costo de servir baja de 11% a **5.4%**.

---

# 4B · 🔴 La condición de la decisión del insight

Meterle el cerebro al insight cuesta **$3.91 al mes** o **$35.01 al mes**, por usuario. Nueve veces de diferencia. Y lo que decide cuál de las dos es una sola cosa: **si el caché del cerebro está tibio cuando el insight dispara.**

El cerebro son unos 26,000 tokens que van en un bloque marcado como cacheable. Anthropic los cobra a dos precios muy distintos:

| | Precio por millón, tarifa intro | 26,000 tokens |
|---|---|---|
| Leerlos de caché | $0.20 | $0.005 |
| Escribirlos a caché | $2.50 | **$0.066** |

El caché de Anthropic vive **cinco minutos**. Si nadie lo tocó en esa ventana, la siguiente llamada paga escritura completa.

## Los datos ya dicen exactamente cómo se va a comportar

Esto no es teoría. Está medido en producción:

| | Llamadas | Lecturas de caché | Escrituras | Acierto |
|---|---|---|---|---|
| `chat` con cerebro | 78 | 70 | 8 | **90%** ✅ |
| `insight` hoy, sin cerebro | 290 | 2 | 157 | **0.7%** 🔴 |

**El chat acierta el 90% porque las conversaciones vienen en ráfagas** y el bloque del cerebro es idéntico para todos los usuarios, así que una escritura sirve a todas las lecturas de esos cinco minutos. Y esto mejora al crecer: más tráfico es caché más tibio.

**El insight acierta el 0.7% porque dispara espaciado**, uno por usuario a lo largo del día. Ya hoy escribe caché en 157 de 290 llamadas y eso se come más de la mitad de su costo total, sin traer todavía ni un token de cerebro.

**Si le metes 26,000 tokens de cerebro a un patrón con 0.7% de acierto, cada insight se vuelve una escritura completa.**

## Lo que eso cuesta a escala

| | Insight batcheado | Insight espaciado | Diferencia |
|---|---|---|---|
| Por usuario al mes | $3.91 | $35.01 | 9x |
| 1,000 usuarios al mes | $3,908 | **$35,005** | **$31,097** |
| 5,000 usuarios al mes | $19,540 | **$175,025** | **$155,485** |

A mil usuarios, hacerlo mal cuesta **$373,164 al año**. Por una sola función, y por no agrupar un cron.

## El arreglo, y es chico

**Los insights se generan en ventana, no espaciados.** Una escritura de caché sirve a todas las lecturas de esos cinco minutos, y el bloque del cerebro es idéntico para todos los usuarios, así que con mil usuarios son **una escritura y 999 lecturas**.

Ya existe la infraestructura: `dispatch-agenda-notifications` es un cron y corre en la versión 17. No hay que inventar nada, hay que agrupar el disparo.

> **La decisión de subir el insight a Sonnet con cerebro es correcta, y queda condicionada a que se genere en ventana. Sin el batch, sale más caro que todo lo demás junto y hay que dejarlo como está hoy.**

Vale la pena verificar lo mismo cuando el volumen de chat crezca, pero ahí el riesgo es al revés: más usuarios significa caché más tibio, y el 90% de acierto de hoy con tres usuarios solo puede subir.

---

# 5 · Lo que esto desbloquea, y es más grande que el ahorro

**Una vez que las acciones están partidas por modelo, la cuota diaria también se debe partir.** Hoy `TIER_DAILY_LIMITS` cuenta cada acción igual: una foto de comida de un centavo consume la misma unidad que un diagnóstico de un peso doce.

| | Cuota Sonnet al día | Acciones Gemini al día |
|---|---|---|
| Free | 3 | 20 |
| Base | 25, igual que hoy | **sin tope** |
| Pro | 150, igual que hoy | **sin tope** |

Base con fotos de comida sin tope cuesta **60 centavos al mes** si tira tres diarias. Y arregla de un solo golpe el problema del gating que te mencioné: la foto de comida es la acción más formadora de hábito de la app, se hace con el teléfono ya en la mano y devuelve algo en dos segundos. Tenerla apagada en Base para proteger un costo de un centavo era la decisión al revés.

**El límite de Sonnet no se puede quitar, y este es el número que lo explica.** Un usuario Pro que agotara sus 150 chats diarios costaría **$2,285 al mes** contra $688 de margen. Nadie hace eso, el máximo real medido son 90 acciones al mes, pero el tope es lo único que separa el negocio de esa cola. Por eso "sin límite" en el paywall de Pro no es una frase que se pueda sostener tal cual: lo honesto es *"sin límite práctico"* o decir el número.

---

# 6 · Dónde se toca

En orden de retorno, no de dificultad. Los primeros tres cubren el 90% del gasto.

| # | Cambio | Archivo | Riesgo | Qué devuelve |
|---|---|---|---|---|
| 1 | Foto y texto de comida a Gemini | `src/constants/llm-config.ts` | Bajo. Es una tabla | $20 de $24 del ahorro |
| 2 | Abrir foto de comida a Base | paywall y `llm-config` | Bajo | El ancla diaria del hábito |
| 3 | **`ttl: "1h"` en el bloque del cerebro** | `argos-proxy`, **una línea** | Bajo | **$364,531 al año a mil usuarios.** Ver `INGENIERIA_DE_CACHE_ATP.md` |
| 4 | Insight a Sonnet con cerebro, después del 3 | cliente, mandar `dynamicSystem` | Bajo | La voz del toque diario |
| 4b | Agrupar el disparo del insight en ventanas | `dispatch-agenda-notifications` | Medio | $8,256 extra sobre el paso 3. Ya no es urgente |
| 5 | Cuota partida por modelo | `argos-proxy`, `TIER_DAILY_LIMITS`, `increment_argos_usage` | Medio. Toca la RPC del contador | Base con Gemini sin tope |
| 6 | Extracción de laboratorio vía `lab-parser-worker` | edge function que ya existe | Medio | 28x en la parte de extraer |
| 7 | Whitelist de `action_keys` | `argos-proxy` | Bajo, y hoy no existe | Cierra el hueco de seguridad |
| 9 | **Bajar `PRICING` a tarifa intro** | `argos-proxy` | Bajo. Son cuatro números | La telemetría deja de mentir 33% |
| 8 | Partir `bha_scan` en extracción y veredicto | cliente | Medio. Es lógica nueva | Casi nada hoy. **Va al final** |

**El 3 va antes que el 4 y ese orden no es negociable.** Meter el cerebro al insight sin la TTL de una hora es la única forma de que este documento salga caro en vez de barato: la cuenta de IA se multiplica por diez y el problema se descubre en la factura.

## Dos cosas que el propio código ya reconoce como deuda y conviene no perder de vista

**El `userId` viene del body sin verificar contra el JWT**, y el `requestType` lo declara el cliente. El comentario del código lo dice tal cual: *"un cliente modificado puede mandar 'chat' en un turno de voz para evadir la prima de voice_turn"*. Con el ruteo por modelo eso se vuelve más goloso, porque un cliente modificado podría pedir Sonnet declarando una acción de Gemini. La whitelist deja de ser opcional.

**Los PDFs no caen a Gemini a propósito**, y está bien justificado en el código:

```ts
// Para PDFs: NO usar Gemini fallback. Reportar el timeout/error de Anthropic directo.
// Gemini no procesa el bloque type:"document" igual y devuelve basura.
```

Por eso el laboratorio no se puede mover de un jalón. Las 28 llamadas de laboratorio que sí corrieron en Gemini a $0.008 no traían el PDF en el payload. La ruta buena es que `lab-parser-worker`, que ya existe, saque los valores primero, y que Gemini o Sonnet trabajen sobre valores y no sobre el documento.

---

# 7 · Lo que no sé y no voy a suponer

**No pude leer `src/constants/llm-config.ts`.** El puente con tu compu se cayó a mitad de esto. Todo lo de arriba sale del proxy, de la base de datos y de los logs reales, que es evidencia de qué modelo se usó, no de dónde se decide. Cuando reconectes lo verifico en el archivo y te digo si algo no cuadra.

**Los factores de Gemini para `food_estimate_text`, `label_scan` y `supplement_scan` van marcados con tilde** porque esas acciones nunca han corrido en Gemini. El 45x lo estoy trasladando del caso de foto de comida, que sí está medido. Se confirman con veinte llamadas reales, no con esta tabla.
