# 🏷️ AWAY RUN MB-28B · Etiquetas y despensa

**Rama:** `feat/mb28b-despensa` desde `main` (en `ce70c10`) · **worktree propio.**
**Probablemente con migración** (pieza 3; sería la 259 o la 260 según quién mergee primero
— ⚠️ **usa el número que esté libre y dilo en el reporte**).
`tsc`, Vitest y `npm run censo` en verde antes de cada commit.

⚠️ **CORRE EN PARALELO con `feat/mb29-salud`.** Para que no choquen:

| Este run TOCA | Este run NO TOCA |
|---|---|
| `app/food-*`, `app/nutrition.tsx` | ⛔ `app/salud/*`, `app/labs-guide.tsx` |
| `app/my-recipes.tsx`, `app/argos-recipes.tsx` | ⛔ `app/reports.tsx`, `src/services/dx/*` |
| `app/lista-compra.tsx` | ⛔ `src/constants/salud-puertas.ts` |
| `src/data/starter-recipes.ts` | ⛔ `src/services/pack-*` |

⚠️ **El mapa de iconos quedó cerrado con censo en MB-28A.** Si necesitas uno que no existe,
**repórtalo, no lo agregues.**

## Qué cierra este run

MB-28A hizo rápido el registro manual. **Este cierra nutrición**: leer una etiqueta, y que
recetas y lista de súper dejen de ser islas.

---

# PIEZA 1 · Leer etiquetas

## Lo que ya tienes a favor

✅ **La cámara ya está en el binario** por el registro con foto. **El escáner de código de
barras NO exige build nativo** si se resuelve con lo que Expo ya trae instalado.

⚠️ **Verifícalo antes de asumirlo.** Si el escáner exige un módulo nativo nuevo, **NO lo
instales: repórtalo** y quedará para MB-30, que es el único build del plan. Una premisa
falsa aquí cuesta el run completo.

## Qué construir

Escanear el código de barras de un producto y que sus datos entren al registro.

**La base de datos:** OpenFoodFacts como arranque, que es libre y no cuesta.

⚠️ **La cobertura de productos mexicanos es decente pero imperfecta.** Cuando el código no
exista, **el flujo debe caer con gracia a captura manual**, con el código ya guardado por si
la persona quiere completarlo. **Nunca un callejón sin salida.**

⚠️ **Lo que escanees entra por `saveFoodLog` → `food_logs`**, el mismo camino de MB-28A.
**Cero rutas paralelas:** el candado de `registro-comida.test.ts` está ahí justamente para
esto y debe seguir en verde.

⚠️ **Respeta el modo simple y completo.** En simple se registra y ya; en completo se ven y
se ajustan los números. Es la regla que MB-28A acaba de cementar en las tres pantallas.

## Doctrina de ATP en el escáner

⚠️ Cuando muestres la información de un producto, **preséntala sin juicio moral**. Nada de
semáforos, puntuaciones de "qué tan sano" ni caritas. **La doctrina de ATP no es contar
calorías: es comida limpia y flexibilidad metabólica.**

**Lo que sí es útil mostrar:** la lista de ingredientes, para que la persona vea qué trae
de verdad. Ahí está el valor, no en un número que la juzgue.

---

# PIEZA 2 · Recetas que sirven

Hoy existen `my-recipes.tsx` y `argos-recipes.tsx`, más recetas de arranque en
`src/data/starter-recipes.ts`. **Recetas está en el registro con
`installable: false`** — o sea que nadie puede instalarla ni desinstalarla.

**Qué hacer, en este orden:**

1. **Registrar desde una receta en un toque.** Su promesa en el registro es *"guarda tus
   comidas como recetas y reúsalas al registrar, sin volver a capturar nada."* **Verifica
   que eso sea verdad hoy**; si no lo es, hazlo verdad o cambia la descripción.
2. **Guardar como receta lo que acabas de registrar.** Es el camino natural: comes algo dos
   veces y a la tercera ya no lo quieres teclear.
3. **Decidir si Recetas se vuelve instalable.** Reporta tu criterio.

⚠️ **Las recetas de arranque no pueden nombrar padecimientos ni prometer efectos médicos.**
Mismo criterio que los packs.

---

# PIEZA 3 · La lista de súper conectada

Hoy `lista-compra.tsx` es una isla: escribes a mano y no sabe nada de lo demás.

**Las dos conexiones que la vuelven útil:**

**De la receta a la lista.** Elegir una receta manda sus ingredientes a la lista, sin
duplicar lo que ya está anotado.

**De la lista a la despensa.** Marcar algo como comprado deja rastro, para que la lista no
te vuelva a pedir lo mismo la semana entrante si todavía lo tienes.

⚠️ **Empieza por la primera.** La segunda es la que se puede ir de las manos: una despensa
completa con caducidades y cantidades es un proyecto propio. **Si no cabe, déjala fuera y
repórtalo.**

**Migración:** lo que necesiten los ingredientes y su estado. Idempotente, RLS, policy.

⚠️ **Nada de lo que el usuario ya tenga en su lista puede perderse.**

---

# PIEZA 4 · Tests

1. **El escáner entra por `saveFoodLog`.** La mutación que escriba directo a `food_logs`
   truena (el candado de MB-28A).
2. **Código no encontrado → captura manual**, nunca pantalla muerta.
3. **El escáner respeta el modo** simple y completo.
4. **De receta a lista no duplica** lo que ya estaba anotado.
5. **Sin red, el escáner falla honesto** y no cuelga la pantalla.
6. Tests de servicio con `supabase-fake` de lo que toques.

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 🟡 LO QUE NO ES DE ESTE RUN

Todo SALUD (MB-29) · una despensa completa con caducidades · planeación de menús
semanales · nada nativo (eso es MB-30).

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: **si el escáner necesitó módulo nativo o no** ·
qué tan bien cubre OpenFoodFacts productos mexicanos en tus pruebas · si la promesa de
Recetas ya era verdad · si la conexión lista-despensa cupo · el número de migración que
usaste · el resultado real de las mutaciones.

**Actualiza `R and D/FIFO_PENDIENTES.md`.** ⚠️ **También lo toca MB-29: espera conflicto al
mergear y NO lo resuelvas por tu cuenta.**

**Verificación en dispositivo (Enrique):**
1. Escanear un producto del súper y que quede registrado sin teclear.
2. Escanear algo que no exista en la base **y poder registrarlo igual, a mano.**
3. Registrar desde una receta guardada en un toque.
4. Mandar los ingredientes de una receta a la lista de súper.
5. Ningún juicio de valor sobre la comida en pantalla.

---

# 🔒 PROTOCOLO DE CIERRE

**Al terminar: reporta y DETENTE. No merges sin el verde del audit de Cowork.**

⚠️ **Hay otra rama viva en paralelo: el orden de merge lo decide Cowork, no tú.**
