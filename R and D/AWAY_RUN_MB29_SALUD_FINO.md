# 🩺 AWAY RUN MB-29 · Salud, el overhaul fino

**Rama:** `feat/mb29-salud` desde `main` (en `ce70c10`) · **worktree propio.**
**Trae migración** (pieza 3). `tsc`, Vitest y `npm run censo` en verde antes de cada commit.

⚠️ **CORRE EN PARALELO con `feat/mb28b-despensa`.** Para que no choquen:

| Este run TOCA | Este run NO TOCA |
|---|---|
| `app/salud/*`, `app/labs-guide.tsx`, `app/reports.tsx` | ⛔ `app/food-*`, `app/my-recipes.tsx`, `app/lista-compra.tsx` |
| `src/constants/salud-puertas.ts`, `app-registry.ts` | ⛔ `app/nutrition.tsx` |
| `src/services/dx/*`, labs y biomarcadores | ⛔ el escáner de código de barras |
| `src/services/pack-*` (paquetes de salud) | ⛔ `src/services/food-log-service.ts` |

⚠️ **El mapa de iconos quedó cerrado con censo en MB-28A.** Si necesitas un icono que no
existe, **repórtalo, no lo agregues**: el censo truena y con razón.

## Qué cierra este run

Con MB-29 **V2.0 queda funcionalmente completa.** Después solo falta el build y la piel.

Cierra dos huecos estructurales del plan (`PLAN_MAESTRO_V2_A_V21.md`) y completa los packs
7 y 10 de `CASOS_DE_USO_10_PERFILES.md`.

---

# PIEZA 1 · H3 · El reporte para el médico

## Por qué existe

El perfil *"Cuidar mi glucosa"* llega a ATP diciendo **"voy con el doctor y no sé qué
contarle."** Ese es el trabajo que nos contrata: **monitorear y graficar, no tratar.**

⚠️ **ATP no diagnostica, no interpreta estudios y no ajusta medicación.** El documento
presenta **lo que la persona registró**, ordenado y legible. Nada más, y eso ya es mucho.

## Lo que ya existe y hay que reusar

✅ **La infraestructura de PDF ya está construida:** `src/services/dx/dx-pdf-service.ts`
sigue el patrón `buildHtml` (puro) → `expo-print` → `Sharing.shareAsync`, y
`labs-guide-html.ts` hace lo mismo. **Reúsalo: no construyas un generador nuevo.**

⚠️ **`expo-print` es módulo nativo.** En binarios viejos que reciben OTA **no existe** — el
propio servicio ya lo contempla devolviendo `'unavailable'`. **Respeta ese camino** y que
el copy lo diga con honestidad. El binario nuevo llega en MB-30.

## Qué construir

Un documento con lo que la persona ya tiene: **rango de fechas elegible**, sus mediciones
(glucosa, cetonas, peso y medidas, presión si hay), sus laboratorios subidos, sus síntomas
registrados, sus padecimientos declarados y sus intervenciones activas.

**Con criterio editorial, no un volcado:** un médico con siete minutos necesita ver
tendencia y adherencia, no 400 filas.

⚠️ **Cero interpretación.** Nada de "esto sugiere", "riesgo elevado" ni semáforos de salud.
Números, fechas y tendencias. **La lectura la hace el médico.**

⚠️ **Si el usuario tiene Ciclo en modo propio**, sus fases pueden acompañar los datos
porque cambian la interpretación de un laboratorio. **Si no lo tiene, nada de ciclo
aparece.**

---

# PIEZA 2 · H5 · Subir laboratorios sin fricción

## El problema

La Edad ATP es lo que más quiere ver el perfil de longevidad, **y depende de laboratorios
que hoy cuestan trabajo subir.** Es la fricción más alta de la app, en la pieza que le
importa a quien paga Pro.

## Qué hacer

**Mide primero:** cuántos toques y cuántas pantallas cuesta hoy subir un estudio de
laboratorio, desde que abres la app hasta que el valor queda guardado. **Ese número va en
el reporte.**

Luego, en orden de barato a caro:

- **Una sola puerta clara** para "tengo estudios nuevos". Hoy la captura está repartida
  entre `edad-atp/biomarkers`, `edad-atp/lab-confirmation` y `my-health`, y ninguna se
  llama "sube tus labs".
- **Captura por foto del estudio**, si la infraestructura de foto que ya usa Comida se
  puede reusar. ⚠️ **Si extraer valores de la foto no es confiable, NO lo hagas** — un
  número mal leído en un biomarcador es peor que teclearlo. **Reporta qué decidiste.**
- **Lo frecuente al frente:** los biomarcadores que esa persona ya ha subido antes, primero.

⚠️ **Ningún valor de laboratorio existente puede perderse ni pisarse.** Es dato médico de
la persona.

---

# PIEZA 3 · Los 9 destinos como apps instalables

## La decisión de Enrique

Los 9 destinos de SALUD (síntomas, mapa funcional, Edad ATP, reportes, cronotipo, historia
clínica, cuestionario, evaluaciones, padecimientos) **se vuelven apps instalables** desde el
Centro, además de seguir viviendo dentro de sus puertas.

**No son dos verdades: son dos puertas al mismo cuarto**, como el dock y la biblioteca de
un teléfono.

**Solo `edad_atp` entra al set inicial.** Es el gancho, es lo que la gente presume, y así
queda a un toque. Las otras ocho se instalan desde el Centro quien las quiera.

⚠️ **Cada una necesita su ficha del Centro:** qué es y para qué sirve, en el lenguaje de
siempre. **Honesto, del cuerpo, sin promesas médicas y sin inventar beneficios.** Si no te
alcanza, deja alguna sin descripción y repórtala — **nunca inventes.**

⚠️ **Los iconos ya existen todos** (se montaron en MB-28A). No agregues ninguno.

**Migración 259:** lo que haga falta para que estas apps sean instalables por el camino que
ya existe. Idempotente, RLS, policy. ⚠️ **Nadie pierde acceso al actualizar**: quien hoy
llega a esos destinos por su puerta debe seguir llegando igual.

---

# PIEZA 4 · Los paquetes de salud, sobre el motor de packs

> *"Creo que las apps de salud se instalan como paquetes."* — Enrique

**Reúsa el motor de MB-25** (`pack-core.ts`, `pack-service.ts`). ⚠️ **No construyas un
mecanismo paralelo:** pack, protocolo y paquete de salud son la misma cosa, y esa decisión
ya está tomada.

Un paquete de salud instala el grupo de apps que se usan juntas: quien quiere seguir su
glucosa necesita Glucosa, Cetonas, Comida y Labs, no las nueve por separado.

**Propón 3 o 4 paquetes**, con el mismo criterio de nombres de los packs:

⚠️ **Ninguno puede nombrar enfermedad, diagnóstico ni tratamiento.** *"Cuidar mi glucosa"*
nunca *"control de diabetes"*. Hay test que barre el archivo.

**Repórtalos para que Enrique y Mariana los aprueben** antes de que el copy sea definitivo.

---

# PIEZA 5 · El barrido fino del pilar

Pantalla por pantalla, con `docs/DESIGN_SYSTEM.md` enfrente:

- **Jerarquía de Sol:** hoy compite visualmente con cosas que importan más.
- **Estadísticas de glucosa y cetonas:** hoy son bitácoras. Deberían mostrar tendencia,
  y el GKI donde aplique.
- El copy con em dash que MB-28A dejó fuera a conciencia por ser de este dominio:
  `domain-explanations`.
- Lo que el recorrido marcó del pilar en `RECORRIDO_UX_2026-08-01.md`.

⚠️ **Si algo de esto no cabe, déjalo fuera y repórtalo.** MB-27 se estiró a 66 archivos y
costó tres vueltas de audit. **No repitas eso.**

---

# PIEZA 6 · Tests

1. **El reporte médico no interpreta:** un test que barra el HTML generado y truene si
   aparecen palabras de diagnóstico o riesgo.
2. **Sin Ciclo propio, el reporte no trae nada de ciclo.** La mutación que lo cuele truena.
3. **Ningún laboratorio se pisa** al subir uno nuevo.
4. **Instalar un destino no rompe su puerta:** ambos caminos siguen llegando.
5. **Paquetes de salud:** activar uno instala sus apps por el camino de `installApp`, y
   ninguno nombra padecimientos (mismo barrido que los packs).
6. Tests de servicio con `supabase-fake` de lo que toques (deuda B2 del FIFO).

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 🟡 LO QUE NO ES DE ESTE RUN

Nutrición completa (MB-28B) · el sueño y lo nativo (MB-30) · el modo claro (MB-31) ·
conectar wearables · el despachador de avisos condicionales (B1 del FIFO).

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: **toques y pantallas para subir un laboratorio, antes y
después** · qué decidiste con la foto del estudio y por qué · qué paquetes de salud
propones · qué descripciones quedaron pendientes · el resultado real de las mutaciones.

**Actualiza `R and D/FIFO_PENDIENTES.md`.** ⚠️ **También lo toca MB-28B: espera conflicto
al mergear y NO lo resuelvas por tu cuenta.**

**Verificación en dispositivo (Enrique):**
1. Generar el reporte médico de un rango y abrirlo: **se entiende en un minuto** y no
   interpreta nada.
2. Subir un laboratorio **cuesta menos que ayer.**
3. Edad ATP aparece en la cuadrícula sin instalarla; las otras ocho están en el Centro.
4. Instalar un destino y confirmar que **su puerta sigue funcionando.**
5. Un paquete de salud instala su grupo completo de un jalón.

---

# 🔒 PROTOCOLO DE CIERRE

**Al terminar: reporta y DETENTE. No merges sin el verde del audit de Cowork.**

⚠️ **Hay otra rama viva en paralelo: el orden de merge lo decide Cowork, no tú.**
