# 🍽️ AWAY RUN MB-28A · El registro de comida

**Rama:** `feat/mb28a-comida` desde `main` (en `9a1cf38`) · worktree propio.
**Probablemente sin migración** (verifícalo; si la necesitas, es la 258).
`tsc`, Vitest y `npm run censo` en verde antes de cada commit.

⚠️ **Este run es deliberadamente MÁS CHICO que MB-27.** Aquel llevó 66 archivos y tres
vueltas de audit; ese tamaño fue error de diseño del brief, no de la ejecución. **Si algo
no cabe, repórtalo y déjalo fuera** en vez de estirar el run.

⚠️ **Antes de tsc:** si truena en rutas, regenera `.expo/types/router.d.ts`.

## Por qué este run y por qué primero

**Tres de los diez packs se apoyan en Comida** (energía estable, bajar grasa, ganar
músculo), y el de energía es el de más fricción de los diez. **Si registrar comida no es
rápido, esos packs no se sostienen** por bonito que quede después el escáner.

Contexto: `R and D/CASOS_DE_USO_10_PERFILES.md`, `R and D/FIFO_PENDIENTES.md`,
`R and D/PLAN_MAESTRO_V2_A_V21.md`.

---

# PIEZA 0 · La limpieza que ya se estaba pudriendo

## 0.1 · Los iconos, de una vez por todas

`app-icon-map.tsx` tiene **33 en Phosphor y 26 en Ionicons.** Cuando cerramos el montaje
eran 21 los que faltaban: **la mezcla crece sola** porque cada MB agrega iconos nuevos y
los agrega en Ionicon.

- Los nombres de reemplazo ya están elegidos y validados en
  `R and D/SET_ICONOS_ATP_DEFINITIVO.md`. **Para los que no estén ahí, elígelos con el
  mismo criterio y repórtalos.**
- Los SVG salen del paquete `@phosphor-icons/core` (assets `regular`), que ya es
  dependencia. ⚠️ **Verifica que esté instalado**; si no, dilo y no inventes.
- Métrica Phosphor Regular: viewBox 256, trazo 16, remates redondeados.
- ⚠️ `AppIcon` debe seguir poniendo **`fill` y `stroke`**: los de Phosphor usan `fill` y
  los dibujados a mano usan `stroke`. Si solo pones uno, la mitad se vuelve invisible.

**Cierra el ratchet:** que un test truene si alguien mete un Ionicon nuevo al mapa. Si no,
en tres MB volvemos a estar igual.

## 0.2 · Em dash en `src/`

MB-27 barrió `app/` pero no `src/`. Los reales son pocos: el aviso de ARGOS cuando se cae
la voz y la tarjeta de límite de uso.

⚠️ **No toques los `'—'` sueltos que son placeholder de "sin dato"** — no son prosa.

## 0.3 · Emociones se fue a MB-28C

⚠️ **NO toques `app/emotions.tsx` ni ninguna `emotion-*`.** Corre en paralelo
`feat/mb28c-mente` y esa rama es la dueña de Mente. Tocarlo desde aquí garantiza
conflicto al mergear.

**Lo mismo con `app/meditation.tsx`, `app/breathing.tsx` y los colores legacy.**

---

# PIEZA 1 · El modo completo deja de mentir

## El hallazgo

`resolveNutritionMode` **solo lo consume `food-scan.tsx`.** Hay tres pantallas de registro
(`food-scan`, `food-text`, `food-register`) y el interruptor afecta una.

El usuario prende "modo completo" esperando ver calorías y macros al registrar, **porque
eso dice el nombre del ajuste**, y en dos de tres pantallas no pasa nada.

## Qué hacer

**Que las tres pantallas respeten el modo.** En simple se registra y ya; en completo se
ven y se pueden ajustar los números.

⚠️ **Si alguna pantalla no puede cumplirlo hoy, renombra el ajuste para que diga la
verdad.** Lo que no puede seguir es prometiendo de más. **Reporta cuál elegiste y por qué.**

⚠️ **Simple es el default y debe seguir siéndolo.** Completo es opt-in: guiado, no
prisionero.

---

# PIEZA 2 · Registrar comida rápido

**El corazón del run.** Hoy registrar una comida es el trámite más caro del día, y es el
que más veces se repite.

**Antes de tocar nada, mide:** cuántos toques y cuántas pantallas cuesta hoy registrar
una comida por cada uno de los tres caminos. **Escribe ese número en el reporte** — es
contra lo que se compara el después.

Lo que sí se vale hacer:

- **Lo frecuente al frente.** `food-register` ya lee comidas frecuentes: que repetir lo de
  siempre sea **un toque**, no un formulario.
- **El tipo de comida se adivina por la hora** y se puede corregir. `food-text` ya tiene
  `defaultMealTypeByHour`: **reúsalo en las tres**, no lo dupliques.
- **Menos pantallas entre "quiero registrar" y "quedó registrado."**

⚠️ **No inventes features nuevas.** Este run quita fricción del camino que ya existe. El
escáner de etiquetas, las recetas y la lista de súper son **MB-28B y no entran aquí.**

⚠️ **El dato del usuario es sagrado:** nada de lo que hagas puede perder o pisar registros
existentes.

---

# PIEZA 3 · Tests

1. **Ratchet de iconos:** meter un Ionicon nuevo al mapa **truena**.
2. **Modo completo:** las tres pantallas leen el modo. Mutar una para que lo ignore truena.
3. **Tipo de comida por hora:** las tres resuelven igual a la misma hora.
4. **Nada se pierde:** registrar por el camino rápido escribe en `food_logs` **igual** que
   el camino largo. Ninguna ruta paralela.
5. ⚠️ **Agrega tests de servicio con `supabase-fake`** de lo que toques. Ya hay 5 archivos
   usándolo; esa deuda se paga de a poco, un MB a la vez.

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 🟡 LO QUE NO ES DE ESTE RUN

Escáner de código de barras · base de alimentos · recetas · lista de súper (todo MB-28B) ·
los bugs de Mente del FIFO (van con el overhaul de Mente) · cualquier cosa de SALUD.

---

# 📦 ENTREGA

Un commit por pieza. En el reporte:

- **Toques y pantallas para registrar una comida, antes y después**, por los tres caminos.
- Qué decidiste con el modo completo (¿lo cumpliste o lo renombraste?) y por qué.
- Qué era lo de las dos puertas de Emociones.
- Cuántos iconos montaste y si alguno se quedó sin equivalente.
- El resultado real de las mutaciones.

**Y actualiza `R and D/FIFO_PENDIENTES.md`** tachando lo que cerraste. Ese archivo existe
para no volver a perder los pendientes; si no se mantiene, no sirve.

**Verificación en dispositivo (Enrique):**
1. Ningún icono se ve de otra familia en la misma pantalla.
2. Registrar lo que comes siempre **es más rápido que ayer**, por los tres caminos.
3. Con modo completo prendido, **las tres pantallas** lo respetan.
4. Emociones tiene una sola puerta, o dos que se entienden distintas.

---

# 🔒 PROTOCOLO DE CIERRE

**Al terminar: reporta y DETENTE. No merges sin el verde del audit de Cowork.**

Con el verde: los tres checks en tu worktree → merge a `main` (**si dice "Aborting":
DETENTE y reporta**) → los tres checks **otra vez sobre el resultado del merge** →
`git push` → **`npx supabase db push` solo si hubo migración** → `eas update --branch
preview` → reporta. **`app.json` NO se toca.**
