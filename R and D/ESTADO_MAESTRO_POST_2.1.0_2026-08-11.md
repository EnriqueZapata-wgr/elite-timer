# Estado maestro ATP · desde la v2.1.0

**Fecha:** 11 de agosto de 2026
**Autor:** Cowork Developer
**Para:** Enrique
**Naturaleza:** documento de estado y continuidad. Todo verificado contra el código con archivo:línea. Donde el código y un documento anterior se contradicen, gana el código, y lo digo explícitamente.

**Objetivo que ordena todo lo de abajo:** la versión más simple y útil de ATP. El sistema ya hace de todo, y ese es el problema. Nada de lo que sigue agrega funciones. Todo va a quitar fricción, quitar costo o quitar ceguera.

---

## 0 · Cómo usar este documento

Cada frente tiene: **qué es → qué YA se hizo → qué falta → dónde se toca → riesgo → qué decide si está listo**.

El trabajo hecho vive en el worktree `cowork/fase0-dify`, en `.worktrees/cowork-fase0`. Nada tocó tu checkout principal. Todo está sin commitear, listo para que lo audites.

Las cinco cosas que pediste no perder de vista están mapeadas así:

| Lo que pediste | Frente |
|---|---|
| Audits y crashes automáticos | A |
| Do It For You | C |
| Upgrades de ARGOS | C y B |
| Color scheme de la plataforma | D |
| Implementaciones de ARGOS | B y C |

---

## 1 · Lo que cambió hoy, archivo por archivo

Cinco archivos tocados, uno nuevo, más un script nuevo. Todo en el worktree.

| Archivo | Qué le pasó | Deploy |
|---|---|---|
| `CLAUDE.md` | Versión real (2.1.0, 194 pantallas, 211K líneas, 1,699 commits). Modelo corregido a `claude-sonnet-5`. Borrada la mención del fallback OpenAI, que era falsa | ninguno |
| `supabase/functions/_shared/llm-models.ts` | **NUEVO.** Fuente canónica de modelos para Deno | Edge |
| `supabase/functions/lab-parser-worker/index.ts` | Modelo hardcodeado fuera. Sube de `sonnet-4-6` a `sonnet-5` | Edge |
| `supabase/functions/anthropic-proxy/index.ts` | Encabezado de deprecación con evidencia. Default y pricing al día | Edge |
| `supabase/functions/argos-proxy/index.ts` | **Router de modelos server-side.** 149 líneas | Edge |
| `scripts/audit-colores.js` | **NUEVO.** Caza colores clavados a mano | ninguno |

⚠️ **No hay Deno en mi entorno, así que las Edge Functions no están type-checked.** Es la misma limitación que ya vive documentada en `lab-parser-worker`. La validación real es el deploy.

---

# FRENTE A · Audits y crashes automáticos

El objetivo: que tú y yo dejemos de trabajar con capturas de pantalla sueltas.

## A1 · Sentry no ve tu Android · 🔴 ABIERTO, y es lo primero

**Qué encontré.** Cuatro eventos en toda la historia del proyecto, todos de iPhone de testers, ninguno de Android. Tu crash de sueño nunca se registró.

**Por qué.** `app/_layout.tsx:58` tiene `enabled: !__DEV__`. Corriendo desde Metro, Sentry está apagado. Todo lo que pruebas en tu S24 desde el dev client es invisible.

**Qué falta:** instalar el build de preview en el S24, ir a Ajustes → Dev → "Enviar test error a Sentry" (el botón ya existe, `app/settings/dev.tsx:68`) y confirmar que llega. Si no llega, el problema es de configuración de Android y hay que resolverlo antes de seguir probando a ciegas.

**Qué decide que está listo:** un evento tuyo, de Android, visible en Sentry.

## A2 · Los tres crashes reales que sí están registrados

**ATP-MOBILE-H · `getValueWithKeyAsync` falla con el teléfono bloqueado.**
`expo-secure-store` pide un valor con la app en segundo plano (`in_foreground: false`) y el llavero de iOS lo niega. Solo iOS. **Importa más de lo que parece: los widgets, las acciones de notificación y el Sleep Cycle corren exactamente en esa condición.** Si el token de sesión se guardó con accesibilidad "solo desbloqueado", esas tres cosas nacen rotas en iPhone. Fix: accesibilidad "después del primer desbloqueo" donde aplique. Es JavaScript, entra por OTA, no bloquea build.

**ATP-MOBILE-F · congelamiento de 2 segundos al tocar un campo de texto.** Reportado por Patricia. Cola del teclado de iOS esperando un candado. Una sola vez.

**ATP-MOBILE-G · `[journal] handleSave insert failed`, error de red.** El culpable apunta a `app/food-text.tsx`, lo cual es raro. O está mal atribuido, o journal y comida comparten algo que no deberían.

## A3 · Audit de color automatizado · ✅ HECHO Y CORRIENDO

`scripts/audit-colores.js`. Detecta literales de color que el tema no puede tocar, sin abrir la app y sin una sola captura.

```
node scripts/audit-colores.js            # reporte legible
node scripts/audit-colores.js --top 20   # los peores archivos
node scripts/audit-colores.js --json     # para pipear
node scripts/audit-colores.js --ci       # exit 1 si hay críticos
```

Los resultados están en el Frente D, porque cambian la estrategia.

## A4 · Lo que falta para cerrar el frente

- **Galería de tema en Dev.** Una pantalla que renderice los componentes del sistema en claro y oscuro, lado a lado. Convierte "mándame 100 capturas" en "mándame 2".
- **Meter `audit-colores --ci` al pre-push**, junto a `npx tsc --noEmit`. Sin esto, los colores nuevos siguen entrando.

---

# FRENTE B · Costos, ruteo y la salud de ARGOS

## B1 · Router de modelos server-side · ✅ HECHO, sin desplegar

**La regla, que ya no se discute:** si el output no cambiaría con otra persona mandando el mismo insumo, es extracción y va con Gemini. Si cambia según quién pregunta o qué dice el cerebro ATP, va con Sonnet.

**Decisiones tomadas y cerradas:**

1. **Server-side, no en el cliente.** Un archivo contra 19 call sites. Y la tabla de ruteo ES la whitelist de seguridad: un cliente modificado ya no puede pedir un modelo caro declarando una acción barata, porque ya no pide modelo.
2. **Haiku queda fuera del diseño por completo.** Un respaldo del mismo proveedor no es respaldo: si Anthropic se cae, se cae completo.
3. **Respaldo cruzado y simétrico.** Lo que nace en Sonnet cae a Gemini, lo que nace en Gemini cae a Sonnet. Ningún proveedor es punto único.

**Rollout, y el orden importa:**

```
1. Deploy. No cambia nada: sin la env var el comportamiento es idéntico al de hoy.
2. MODEL_ROUTING_ENABLED_TYPES=food_estimate_photo
3. Mirar argos_logs: provider='google', fallback_used=false
4. Si aguanta: food_estimate_text,label_scan,supplement_scan
5. MODEL_ROUTING_ENABLED_TYPES=*
```

Revertir es borrar la variable. No requiere deploy de código.

⚠️ **Por qué la foto de comida va sola y primero:** la ruta de Gemini nunca ha corrido como primaria. Solo se ha ejecutado como rescate de errores de Anthropic, 32 veces en tres meses. El paso 2 estrena un camino, no lo asume.

**Lo que devuelve:** el costo mensual del usuario más pesado baja de $57.07 a $27.12, y el gasto se concentra en chat e insight, que es donde vive lo que nadie más puede dar.

## B2 · Batch del insight en ventana · 🔴 PENDIENTE, y bloquea al resto

**El hallazgo más importante del audit comercial, y no es de tokens.** El insight diario acierta caché el **0.7%** (2 lecturas contra 157 escrituras en 290 llamadas), porque dispara espaciado a lo largo del día. El chat acierta 90% porque viene en ráfagas.

**Un token en caché tibia cuesta diez veces menos que un token nuevo.** Por eso la variable a optimizar no es cuántos tokens mandas, es si el bloque está tibio.

Meter cerebro al insight sin batchear cuesta **9 veces más**: $52.51 contra $5.86 por usuario al mes. A mil usuarios son $559,740 al año por una sola función.

**Dónde se toca:** `dispatch-agenda-notifications`, que ya es un cron y ya corre. No hay que inventar infraestructura, hay que agrupar el disparo.

**Regla que no se negocia:** el batch va ANTES de cualquier decisión sobre cerebro en el insight.

## B3 · Evaluar cerebro en el insight · ⏸️ BLOQUEADO por B2

Decisión tuya: primero medimos si hace falta, después se mete. No al revés.

## B4 · Cuota diaria partida por modelo · 🔴 PENDIENTE

Hoy `TIER_DAILY_LIMITS` cuenta acciones, no costo: una foto de comida de un centavo gasta la misma unidad que un diagnóstico de un peso doce.

Propuesta: cuota Sonnet (Free 3, Base 25, Pro 150) y acciones Gemini sin tope en Base y Pro. Base con tres fotos diarias cuesta 89 centavos al mes.

**Esto es customer journey, no costo.** La foto de comida es la acción más formadora de hábito de la app: se hace con el teléfono ya en la mano y devuelve algo en dos segundos. Tenerla capada en Base para proteger un costo de un centavo es la decisión al revés.

**Dónde se toca:** `argos-proxy`, `TIER_DAILY_LIMITS`, y la RPC `increment_argos_usage`.

## B5 · Deuda de seguridad que el propio código reconoce

- **El `userId` viene del body sin verificar contra el JWT.** Con ruteo por modelo esto se vuelve más goloso.
- **El `requestType` lo declara el cliente.** El comentario del código lo dice: un cliente modificado puede mandar `chat` en un turno de voz para evadir la prima de `voice_turn`. Eso es economía de H+, distinto de lo que cierra el router.

Ninguna de las dos bloquea el launch. Las dos deben estar antes de abrir registro masivo.

---

# FRENTE C · Do It For You

La escalera completa vive en `Business development/ATP_DIFY_MASTER.md`. Aquí va el estado y las correcciones que salieron al contrastarlo con el código.

**Dónde está ATP hoy:** 2.8 de 5. DIWY con islas de DIFY.

**Los dos bloqueadores estructurales, con 0 líneas escritas ambos:**

1. **Tool use.** ARGOS habla pero no puede hacer. Es el prerequisito de toda la capa de ejecución.
2. **Memoria persistente.** Abrir la app en frío es ARGOS en blanco.

## C1 · Fase 0, estado real

| # | Qué | Estado |
|---|---|---|
| IMPL-01 | Router de modelos | ✅ hecho, sin desplegar. **Rediseñado**: el documento decía Haiku, el audit con datos de producción dice Gemini |
| IMPL-02 | Cache split en callers no-chat | 🔴 pendiente |
| IMPL-03 | Contexto: sueño, Edad ATP, agenda, adherencia | 🔴 pendiente |
| IMPL-04 | Higiene de config | ✅ hecho |
| IMPL-04b | Extraer `glucose-service` y `journal-service` | 🔴 pendiente. **Bloquea IMPL-05** |

## C2 · IMPL-07 sube a Fase 0 · ⚠️ el único con fecha de caducidad

**Decisión tuya de hoy.** HealthKit y Health Connect estaban en Fase 1, post-launch, pero el propio documento dice que van en el build del launch, "el MISMO build, no uno extra". Las dos cosas no pueden ser ciertas.

El código ya está escrito y esperando build: `@kingstinct/react-native-healthkit`, `react-native-health-connect`, el plugin `with-health-connect-delegate.js`, `health-import-service.ts`, `sleep-import-service.ts`. El toggle de auto-sync ya existe en `cardio-import.tsx:378-389`.

**Si el build de tiendas sale sin esto, sueño y entrenamientos siguen entrando a mano hasta el siguiente build nativo.** Y sueño es la dependencia dura de la detección de patrones, que es el diferenciador.

Falta: permisos y purpose strings (App Store 5.1.3, datos de salud nunca para ads), QA en device físico.

## C3 · Lo que viene después, y por qué en ese orden

**Fase 1:** tool use, memoria persistente, "confío en ti" en nutrición.
**Fase 2:** ARGOS proactivo, **Piloto Automático**, detección de patrones, expediente automático, voz.
**Fase 3:** gemelo metabólico, CGM, modo familia, contratos de compromiso, portabilidad, comercio agéntico.

**El Piloto Automático es la pieza que más habla de tu objetivo de esta semana.** No agrega funciones: presenta UNA cosa a la vez y esconde el resto. Es literalmente hacer esbelto al monstruo sin quitarle nada. Los motores ya existen (`day-compiler.ts:196`, `hoy/local-recommendation.ts`); lo que falta es la capa de presentación secuencial y el motor de "¿qué sigue AHORA?", que es determinista y cuesta $0 de LLM.

---

# FRENTE D · Color scheme y tema claro

## D1 · Lo que dice la medición, y corrige lo que te dije antes

**Te dije que la migración de tema estaba prácticamente hecha. Me equivoqué**, y quiero que quede escrito. Me basé en que 197 archivos importan el theme context. Importarlo no es usarlo.

Lo que dice el barrido real:

```
1,974 literales de color en 267 archivos
1,350 en fondo, borde o texto (los que rompen el tema claro)
    41 dentro de un ternario de tema (o sea: casi nada es consciente del tema)
```

## D2 · La buena noticia: está concentrado

| Alcance | Críticos cubiertos |
|---|---|
| Top 10 archivos | 27% |
| Top 20 archivos | 41% |
| **Top 30 archivos** | **51%** |
| Top 50 archivos | 63% |

**Se arregla por archivo, no por bug.** Treinta archivos son la mitad del problema.

## D3 · Los peores, y una lectura importante

```
  60  app/functional-quiz.tsx
  43  src/components/nutrition/FoodReviewEditor.tsx
  38  app/solar.tsx
  38  src/components/FeedbackButton.tsx
  37  app/feedback-dashboard.tsx
  37  src/components/training/MyoReps.tsx
  30  src/constants/electrons.ts
  28  app/supplements.tsx
  27  app/food-register.tsx
  27  src/constants/concept-colors.ts
```

Tres lecturas que cambian la prioridad:

- **`FeedbackButton` y `feedback-dashboard` son herramientas tuyas, no del usuario.** Van al final.
- **`electrons.ts`, `concept-colors.ts` y `functional-quizzes.ts` son paletas semánticas**, no bugs de estilo. Ahí la pregunta no es "quitar el color" sino "¿esta paleta tiene versión clara?". Es decisión de diseño, no de código.
- **`app/solar.tsx` ya usa `dark ? '#fbbf24' : t.textoSecundario`.** Alguien resolvió el tema a mano en vez de con tokens. Funciona, pero es deuda: cada pantalla inventa su propia forma.

## D4 · Recomendación

No intentes los 1,350 antes del launch. Toma los **top 30 que son user-facing**, que es cerca de la mitad del problema real, y mete el script al pre-push para que no entren más. El resto se arregla con la galería de tema, cuando puedas verlo en vez de leerlo.

---

# FRENTE E · Build y launch

## E1 · El build de widgets

El build que falló hoy era de un commit anterior al fix. `68bf54e` ya corrige la dependencia de React Native que faltaba en el módulo `atp-widgets`. Solo hay que reconstruir.

Diagnóstico para la próxima: `expo-modules-core` declara React Native como `implementation`, no como `api`. Se lo queda y no se lo pasa a los módulos que lo usan. Cualquier módulo nativo nuevo que toque `com.facebook.react.*` va a tropezar igual.

## E2 · Ciclo local de build

Tienes Java 17 recién instalado pero falta el SDK de Android, así que `gradlew` todavía no corre localmente. No es urgente: se resuelve cuando quieras dejar de esperar 10 minutos por error de compilación.

## E3 · Higiene de git

Hay **27 worktrees prunables** apuntando a carpetas que ya no existen, de los sprints MB anteriores. `git worktree prune` los limpia. No rompe nada, pero ensucia cada diagnóstico.

---

# 2 · Decidido y cerrado. No volver a discutir

1. Ruteo **server-side** en el proxy. La tabla es también la whitelist.
2. **Haiku no se usa.** Dos proveedores, respaldo cruzado.
3. **El batch del insight va antes que el cerebro del insight.**
4. **IMPL-07 sube a Fase 0** y viaja en el build de tiendas.
5. **Sonnet 5 se queda** en el parser de labs. No se revierte.
6. Los PDFs **nunca** van a Gemini.

# 3 · Congelado, con la forma ya acordada

**Partición del cerebro en núcleo y módulos.** No es prioridad ahora.

Cuando se retome, la forma es: un núcleo en toda llamada (doctrina, palabras rojas, tono, seguridad, derivaciones) que carga el volumen y por eso se mantiene tibio solo, más módulos por dominio anexados solo a quien los necesita.

**Y la justificación es CALIDAD, no costo.** Partir el cerebro para ahorrar tokens optimiza la variable equivocada: mandar una partición chica y fría sale más caro que mandar el cerebro entero tibio.

---

# 4 · Orden recomendado

**Esta semana, antes del launch:**

1. Confirmar que Sentry ve tu Android (A1). Sin esto todo lo demás se prueba a ciegas.
2. Reconstruir el build de widgets (E1).
3. Desplegar el router y encender solo la foto de comida (B1).
4. Cerrar IMPL-07 para que viaje en el build de tiendas (C2). **Ventana que se cierra.**
5. Fix del llavero de iOS (A2). Es OTA, y protege a los widgets.

**Inmediatamente después:**

6. Batch del insight (B2).
7. Extraer `glucose-service` y `journal-service` (C1). Desbloquea tool use.
8. Cuota partida por modelo (B4). Abre la foto de comida en Base.
9. Top 30 archivos de color (D4).

**Y después, el salto:** tool use y memoria persistente, que son los dos bloqueadores del Do It For You. Con Fase 1 completa, ATP pasa de 2.8 a ~3.8 de 5.

---

# 5 · Riesgos abiertos, sin adornos

| Riesgo | Por qué importa | Mitigación |
|---|---|---|
| Edge Functions sin type-check | No hay Deno en mi entorno | El deploy es la prueba. Desplegar el router con la env var apagada |
| Gemini como primario nunca ha corrido | 32 ejecuciones, todas de rescate | Foto de comida sola, medida antes de mover el resto |
| El parser de labs cambió de modelo | Extracción de valores clínicos | Pasar dos PDFs conocidos y comparar |
| `userId` sin verificar contra JWT | Superficie de abuso | Antes de registro masivo, no antes del launch |
| 1,350 colores clavados | El tema claro no está terminado | Triaje por archivo. El script evita que crezca |
| Ceguera en Android | Es tu dispositivo de pruebas | A1 es el paso 1 de la lista |

---

*Verificado contra el código el 11 de agosto de 2026, en `cowork/fase0-dify` sobre `68bf54e`. Fuentes: `argos-proxy/index.ts`, `llm-config.ts`, `app/_layout.tsx`, Sentry `atp-v5/atp-mobile`, y el audit comercial de ruteo del 11 de agosto.*
