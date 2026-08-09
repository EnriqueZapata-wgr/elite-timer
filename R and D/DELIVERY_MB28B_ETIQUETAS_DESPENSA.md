# 📦 DELIVERY · MB-28B — Etiquetas y despensa

**Fecha:** 8-ago-2026 · **Rama:** `feat/mb28b-despensa` (desde `main` en `ce70c10`) · **SIN mergear.**
**Commits:** 4 piezas + entrega, uno por pieza. `tsc` 0 · **3100 tests** en verde · censo de rutas y de iconos en verde antes de cada commit.

---

## Lo que pedía el reporte, en corto

| Pregunta del brief | Respuesta |
|---|---|
| ¿El escáner necesitó módulo nativo? | **SÍ lo exigiría el visor de cámara, y NO se instaló.** V1 teclea el código. |
| ¿Qué tan bien cubre OpenFoodFacts productos mexicanos? | **Parcial: marcas grandes sí, el resto cae a manual.** 3 de 13 códigos probados. |
| ¿La promesa de Recetas ya era verdad? | **A la mitad.** Registrar desde receta sí; guardar registro como receta no existía. Se construyó. |
| ¿La conexión lista→despensa cupo? | **Sí, en su versión mínima útil** (rastro de comprado + no re-pedir). |
| Número de migración | **260** (MB-29 trae la 259 asignada en su brief; verificado antes de elegir). |
| Resultado real de las mutaciones | **4 mutaciones aplicadas y las 4 pusieron su candado en rojo** (detalle abajo). |

---

## PIEZA 1 · Leer etiquetas (commit `7cdf58d`)

**La premisa del brief era falsa y se verificó antes de escribir:** la
"cámara que ya está en el binario" es `expo-image-picker`
(`launchCameraAsync`, fotos): **no decodifica códigos de barras.** El visor
en vivo exige `expo-camera`, que NO está en `package.json` ni en el binario
(verificado; `expo-barcode-scanner` además está muerto desde SDK 52). Regla
del brief aplicada: **no se instaló nada nativo** — queda para MB-30.

**Lo que sí se construyó (todo OTA-compatible):**
- `src/services/barcode-product-service.ts`: lookup en OpenFoodFacts con
  contrato de TRES salidas (`found` / `not_found` / `network_error`) que
  **nunca lanza**. Un 5xx del servicio NO se miente como "no existe". El
  mapeo **excluye a conciencia nutriscore, nova y ecoscore** aunque el
  payload los traiga (doctrina, cementada en test).
- `app/food-barcode.tsx`: se teclea el número bajo las barras → producto
  con **la lista de ingredientes al frente** (ahí está el valor, sin
  semáforos ni puntuaciones), macros por porción. SIMPLE registra y ya;
  COMPLETO ajusta la porción en gramos y los números escalan en vivo.
  Código no encontrado o sin red → **captura manual inline, con el código
  guardado en `ai_analysis`** por si se quiere completar después. Nunca
  callejón sin salida.
- Todo entra por `saveFoodLog` con `source: 'barcode'` (valor nuevo del
  contrato del writer; la columna es TEXT sin CHECK, cero migración).
- Puerta: cuarta vía "Código" en la cuadrícula de registro de
  `/nutrition` (ahora 2x2). `router.d.ts` regenerado y commiteado.
- Sin electrones: el premio de comida es por FOTO (evidencia) y el barcode
  no trae foto. Honesto, no un hueco.
- Cuando llegue MB-30, el visor de cámara alimenta EXACTAMENTE este flujo.

**Cobertura OpenFoodFacts medida (8-ago-2026, endpoint v2 de producto):**
- ✅ Coca-Cola 600 ml (`7501055300075`): nombre, **ingredientes en
  español** y macros completos por 100 g y porción.
- ✅ Ciel (`7501055310883`), ✅ Gamesa Florentinas (`7501000673209`):
  existen con nombre/marca (datos más ralos).
- ❌ 10 códigos más: `product not found` (varios eran conjeturas de EAN,
  así que el % exacto no es concluyente — la señal sí: **la caída a manual
  es camino primario en México, no caso raro**, y por eso el flujo la trata
  como ciudadano de primera).
- El endpoint de BÚSQUEDA de OFF estuvo caído durante las pruebas; el de
  producto (el que usa la app) respondió siempre.

## PIEZA 2 · Recetas que sirven (commit `99b7fe9`)

1. **¿La promesa era verdad?** A la mitad. *"Reúsalas al registrar"* SÍ:
   `my-recipes` registra con un toque vía `saveFoodLog` (verificado).
   *"Guarda tus comidas como recetas"* NO existía: solo el alta manual
   tecleando macros. La descripción del registro no se cambió porque ahora
   es verdad completa:
2. **Se construyó la mitad que faltaba** (`recipe-save-service`):
   - `food-scan`, tras guardar: botón **"Guardar como receta"** con lo
     recién revisado (nombre, macros, ingredientes del análisis).
   - `my-recipes`: **"Desde mis registros"** — tus comidas recientes
     deduplicadas; un toque y quedan como receta, con ingredientes
     extraídos de `notes.items` o `ai_analysis.ingredients`.
   - Dedupe por nombre normalizado: comer lo mismo tres veces no crea tres
     recetas, y el caller se entera (`duplicate` con el nombre existente).
   - `food-text` NO se tocó: su flujo guarda-y-sale es el camino más usado
     y meterle un interstitial era fricción; su cosecha llega igual por
     "Desde mis registros".
3. **Decisión: Recetas NO se vuelve instalable.** `installable` significa
   "activable como hábito del día con electrón" y Recetas es herramienta de
   captura/reúso, no práctica diaria — el hábito es Comida, que sí lo es.
   Mismo criterio que Rachas ("consulta, no práctica"), 1RM y Medidas.
   Documentado en el registro.
4. **Recetas de arranque:** barrido con el criterio de los packs. Describir
   contenido sí, prometer efecto no: murieron "anti-inflamatorio" (nombre
   del smoothie), "Restaurador intestinal" y "Cena anti-inflamatoria".
   `tags`/`diet_types` quedan: taxonomía interna que ninguna pantalla
   pinta. **Hallazgo:** `seedRecipes()` no tiene un solo importador vivo y
   la tabla `recipes` no se lee en ningún lado (al FIFO, B5).

## PIEZA 3 · La lista de súper conectada (commit `7a90576`)

**Migración 260** (`shopping_list_items`): idempotente, RLS + policy,
**índice único `(user_id, name_key)`** — el dedupe vive en la base, no solo
en el cliente. Cero pérdida: la pantalla previa no persistía nada.

- **De la receta a la lista (la primera, como pedía el brief):** tocar una
  receta manda sus ingredientes. La decisión es pura
  (`planRecipeToList`): lo nuevo entra, **lo pendiente NO se duplica**
  (insensible a acentos/mayúsculas; solo se le anota la receta), y la
  pantalla resume honesto: "3 a tu lista · 1 ya estaba · en tu despensa: aceite".
- **De la lista a la despensa (SÍ cupo, versión mínima útil):** marcar
  comprado deja rastro (`status='bought'` + `bought_at`). La sección EN TU
  DESPENSA responde cuando una receta vuelve a pedir algo comprado: **no se
  re-pide**; un toque lo regresa a la lista. Lo que quedó FUERA a
  propósito: caducidades y cantidades por item — eso es el proyecto
  "despensa completa", no esta pieza.
- Alta a mano arriba de todo (como empieza toda lista real), compartir se
  conserva, y **quitar es acción explícita con confirmación**: nada se
  pierde solo.
- Escrituras concurrentes: `upsert` con `ignoreDuplicates` contra el índice
  único; el 23505 de una carrera se reporta como "ya estaba", no como error.

## PIEZA 4 · Tests (commit `38e15aa`) — resultado REAL de las mutaciones

**57 tests nuevos** (3100 en total, todo verde). Los 6 pedidos del brief:

| # | Pedido | Dónde | Mutación aplicada → resultado |
|---|---|---|---|
| 1 | El escáner entra por `saveFoodLog`; escribir directo truena | `registro-comida` (food-barcode = 4ª pantalla) | insert directo a `food_logs` en food-barcode → **ROJO** ✅ |
| 2 | Código no encontrado → captura manual, nunca pantalla muerta | `mb28b-etiquetas` | quitar el form manual de la rama sin red → **ROJO** ✅ |
| 3 | El escáner respeta el modo | `registro-comida` | reemplazar el gate del modo por `true` → **ROJO** ✅ |
| 4 | Receta→lista no duplica | `shopping-list-merge` (puro) + servicio | cubierto por 10 tests de la lógica pura |
| 5 | Sin red falla honesto, no cuelga | `barcode-product-service` | fetch que rechaza → `network_error`, sin lanzar |
| 6 | Servicios con supabase-fake | `shopping-list-service` + `recipe-save-service` | payloads reales afirmados (name_key, 23505, forma de fila) |
| + | `shopping_list_items` una sola puerta de escritura | `mb28b-etiquetas` | mutar la tabla desde lista-compra → **ROJO** ✅ |

Las 4 mutaciones se aplicaron de verdad sobre el fuente, se corrió el test
(rojo), y se revirtió (verde). No es intención: es resultado.

---

## Verificación en dispositivo (Enrique) — del brief

1. Escanear un producto del súper y que quede registrado sin teclear
   *(nota honesta: en V1 "escanear" = teclear el número bajo las barras;
   probar con `7501055300075`, Coca-Cola 600 ml)*.
2. Escanear algo que no exista en la base y **poder registrarlo igual, a mano**.
3. Registrar desde una receta guardada en un toque.
4. Mandar los ingredientes de una receta a la lista de súper (y verificar
   el resumen "ya estaba / en tu despensa" mandando la misma dos veces).
5. Ningún juicio de valor sobre la comida en pantalla *(en el escáner de
   códigos; el scan de etiqueta CON FOTO conserva su score de MB-28A — la
   tensión quedó anotada en el FIFO, B5)*.

## Para Cowork (audit)

- **Migración 260 pendiente de `db push` — ANTES del OTA** (la lista
  persistente la necesita; el escáner y recetas no).
- `FIFO_PENDIENTES.md` también lo toca MB-29: **conflicto esperado al
  mergear, no lo resolví por mi cuenta.** El orden de merge lo decide
  Cowork.
- `.expo/types/router.d.ts` regenerado por la ruta nueva (MB-0).
- MB-29 y este run no comparten archivos fuera del FIFO (tabla del brief
  respetada: no toqué `app/salud/*`, `labs-guide`, `reports`,
  `src/services/dx/*`, `salud-puertas`, `pack-*`).
