# 🎨 AWAY RUN MB-31A · El motor de temas

**Rama:** `feat/mb31a-temas` desde `main` · worktree propio.
**Sin migración** (la preferencia de tema es local, no dato compartido).
`tsc`, Vitest y `npm run censo` en verde antes de cada commit.

⚠️ **Corre SOLO.** Este run define los tokens que MB-31B usará para migrar las 66 pantallas
con color a mano. Dos runs tocando color al mismo tiempo es choque garantizado.

⚠️ **Antes de tsc:** si truena en rutas, regenera `.expo/types/router.d.ts`.

## 🚨 LO MÁS IMPORTANTE DE ESTE BRIEF

**Este run NO propone nada. Implementa.**

`R and D/MANUAL_DE_MARCA_ATP.md` es la fuente y **ya está aprobado por Enrique.** Trae los
valores exactos, los contrastes verificados con el cálculo de WCAG, y las reglas que salen
de esas mediciones.

**Léelo completo antes de escribir una línea.** Si algo del manual te parece mal, **repórtalo
y detente** — no lo corrijas por tu cuenta. La marca no se decide en un run de código.

---

# PIEZA 1 · Los tokens

Un token nombra un rol, no un color: `fondo`, `card`, `hundido`, `flotante`, `borde`,
`bordeMarcado`, `texto`, `textoSecundario`, `textoTenue`.

## Los valores, del capítulo 3 del manual

**Superficies claro (acero):** fondo `#DBE2E7` · card `#E9EEF1` · hundido `#D3DBE1` ·
flotante `#F2F5F7` · borde `#CBD5DC` · borde marcado `#B4C1CA`

**Texto claro:** principal `#0F1518` · secundario `#4A555C` · tenue `#7A868E` ·
sobre lima `#000000`

**Superficies oscuro (las de hoy, no se tocan):** fondo `#0A0A0A` · card `#121212` ·
elevado `#232323` · borde `#1F1F1F`

**Texto oscuro:** principal `#FFFFFF` · secundario `#888888` · tenue `#555555`

**Teal calibrado para claro:** `#086A5E` (5.56 sobre card, 4.96 sobre fondo)

**Error en claro:** `#B03A2E` · **sin datos en claro:** `#A9B4BC`

⚠️ **Extiende `constants/theme.ts` y `src/constants/brand.ts`. NO los dupliques:** son
canónicos y `brand.ts` dice explícitamente que es la única fuente de color.

⚠️ **Los colores de sección de `concept-colors.ts` NO se tematizan.** Son identidad: el
lima de fitness es el mismo en claro y en oscuro.

---

# PIEZA 2 · Las tres reglas que el modo claro obliga

Del capítulo 3.6. **Estas tres son la parte difícil del run** y las que más fácil se rompen
después, así que van con candado de prueba.

**1 · El lima nunca es texto en claro.** Da 1.34 de contraste: invisible. Es relleno de
botón con negro encima, barra de acento o indicador.

**2 · El teal de marca tampoco es texto en claro** (2.06). Enlaces y texto de acento usan
`#086A5E`.

**3 · Nueve de diez colores de sección llevan texto NEGRO cuando son relleno.** La única
excepción es **ayuno `#6B46C1`, que lleva blanco.** Y ninguno se usa como color de letra
sobre fondo claro salvo ayuno.

---

# PIEZA 3 · Los cuatro modos, y el filtro aparte

## En Ajustes, el tema

| Opción | Comportamiento |
|---|---|
| **Claro** | siempre acero |
| **Oscuro** | siempre oscuro · **default de quien no elige** |
| **Adaptativo** | claro al despertar, oscuro al acercarse su hora de dormir, **con SU horario** |
| **Como el teléfono** | sigue `useColorScheme` del sistema |

⚠️ **Adaptativo NO es lo mismo que seguir al teléfono.** Adaptativo usa el horario real del
usuario (el mismo `despertar`/`dormir` que ancla las horas de los hábitos desde MB-26, más
`screen_time_cutoff`). El del sistema usa el atardecer genérico. **Para un cronotipo lobo,
el del teléfono lo manda a oscuro cuatro horas antes de tiempo.**

⚠️ **Reúsa el horario que ya existe.** No preguntes nada nuevo ni inventes otra fuente.

## Y el filtro nocturno, que es OTRO ajuste

🚨 **El filtro NO es un tema. Es una capa encima de cualquiera de los cuatro.**

- Se enciende y se apaga por separado.
- **Funciona con los cuatro modos**: si alguien está en claro a las once de la noche, el
  filtro entibia el claro. **No lo fuerza a oscuro.**
- La curva es la del manual: del ámbar al rojo, oscureciéndose desde `screen_time_cutoff`.

⚠️ **El filtro nunca puede tumbar el contraste por debajo de AA.** Si al aplicar la capa el
texto deja de leerse, la capa se limita. **Legibilidad antes que estética**, y con prueba.

⚠️ **La misma curva la usan la pantalla del Sleep Cycle (MB-30A) y el filtro de sistema
(MB-30B).** Busca los colores que MB-30A anotó en su reporte y **haz que las tres jalen de
una sola fuente.** Tres curvas parecidas es el tipo de deuda que nadie vuelve a limpiar.

---

# PIEZA 4 · El núcleo compartido, migrado

**No migres las 89 pantallas: eso es MB-31B.** Migra lo que todas usan:

- Los componentes compartidos de `src/components/ui/`.
- La navegación: pestañas, encabezados, barra de estado.
- Los estados vacíos y los mensajes de error.

**Con el marco tematizado, una pantalla sin migrar se sigue viendo aceptable.**
**Reporta cuántas quedan** para dimensionar MB-31B.

## La card editorial, que es la excepción

🚨 **La card editorial se queda OSCURA en los dos modos.** Foto, degradado negro desde abajo
y texto blanco encima. **Es la ventana, no el marco**, y es la firma visual de ATP.

Lo único que cambia es **su borde**, que en claro necesita `#CBD5DC` para despegarse del
fondo. **No tematices su degradado ni su texto.**

## La regla de tránsito

⚠️ Mientras existan pantallas sin migrar, el selector debe salir **con una nota honesta** de
que algunas pantallas siguen en oscuro. **Lo que no se vale es un interruptor que deje media
app rota sin avisar.**

---

# PIEZA 5 · Tests

1. **Cada token existe en los dos temas.** Falta uno y truena.
2. **Contraste verificado en código:** un test que calcule el contraste real de los pares
   del manual y truene si alguno baja de su nivel. ⚠️ **Que calcule, no que compare
   strings** — así protege también los cambios futuros.
3. **El lima nunca es color de texto en claro.** La mutación que lo use como `color` truena.
4. **Los colores de sección NO se tematizan.**
5. **Ayuno es la única sección con texto blanco encima.**
6. **Sin preferencia guardada, el tema es oscuro.**
7. **Adaptativo usa el horario del usuario, no el del sistema.** Cambiar el horario cambia
   el momento del switch; cambiar el ajuste del sistema **no lo afecta**.
8. **El filtro es independiente del tema:** encendido con tema claro, el resultado sigue
   siendo claro entibiado, no oscuro.
9. **El filtro no rompe AA** en ningún punto de su curva.
10. **La card editorial no cambia entre temas** (salvo su borde).

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 🟡 LO QUE NO ES DE ESTE RUN

Las 66 pantallas con color a mano (MB-31B) · la guía de labs (B4 del FIFO, va en 31B) ·
el filtro de sistema de Android (ya existe, MB-30B) · cualquier cambio de comportamiento
que no sea color.

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: **cuántas pantallas quedan sin migrar** · si encontraste
la curva de MB-30A y si lograste unificar las tres · qué decidiste para el selector durante
el tránsito · **la tabla de contrastes que arroja tu test** · el resultado real de las
mutaciones.

**Actualiza `R and D/FIFO_PENDIENTES.md`.**

**Verificación en dispositivo (Enrique):**
1. Los cuatro modos están y hacen lo suyo. **Adaptativo cambia con TU horario.**
2. En claro, el marco se ve bien: pestañas, encabezados, barra de estado.
3. **Las cards editoriales siguen oscuras en los dos modos.**
4. Los colores de sección se reconocen igual en claro y en oscuro.
5. **El filtro se enciende estando en claro y entibia el claro**, sin mandarte a oscuro.
6. Quien no eligió nada ve la app igual que antes.

---

# 🔒 PROTOCOLO DE CIERRE

**Al terminar: reporta y DETENTE. No merges sin el verde del audit de Cowork.**

Con el verde: los tres checks → merge a `main` (**si dice "Aborting": DETENTE**) → los tres
checks **otra vez sobre el merge** → `git push` → `eas update --branch preview`.
**`app.json` NO se toca:** OTA puro, le llega al binario v2.0.0.
