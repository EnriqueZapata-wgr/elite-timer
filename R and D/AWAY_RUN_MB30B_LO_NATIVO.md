# 🔌 AWAY RUN MB-30B · Todo lo nativo, de un jalón

**Rama:** `feat/mb30b-nativo` desde `main` (en `b998841`) · **worktree propio.**
**Trae configuración nativa.** `tsc`, Vitest y `npm run censo` en verde antes de cada commit.

⚠️ **CORRE EN PARALELO con `feat/mb30a-sueno`.** Para que no choquen:

| Este run TOCA | Este run NO TOCA |
|---|---|
| el filtro nocturno de sistema | ⛔ `app/sleep.tsx` ni la pantalla nocturna |
| acciones de notificación | ⛔ el micrófono ni el Sleep Cycle |
| `expo-camera` y el visor del escáner | ⛔ el import de sueño |
| assets: iconos al binario, purga de PNG | ⛔ **la versión en `app.json`** |

🚨 **NO toques `"version"` en `app.json`.** El bump y el build son un paso final aparte,
cuando las dos ramas estén en `main`. Regla 11 de `CLAUDE.md`.

⚠️ **Los dos runs tocan `app.json`** (permisos y plugins). Conflicto esperado al mergear;
**el orden y la resolución los decide Cowork.** Escribe tus cambios de forma acotada y
comenta cada uno con su run, para que resolver sea trivial.

## Qué es este run

**Todo lo que exige binario nuevo, junto.** Es el único build de todo el plan, así que lo
que no entre aquí espera meses.

---

# PIEZA 1 · El filtro nocturno de verdad

> *"Instalo aplicaciones que ponen un filtro de luz encima de todo el teléfono, que a
> determinada hora empieza a filtrar progresivamente, del amarillo al naranja al rojo, y
> más oscuro con el tiempo."* — Enrique

## Android: SÍ se puede, y se construye

Existe el permiso de superposición de pantalla (lo que usa Twilight): **un filtro encima de
TODO el teléfono**, no solo de ATP.

- Progresión por hora: del ámbar al naranja al rojo, oscureciéndose.
- **Anclado a la hora de corte del usuario** (`screen_time_cutoff`), no a una hora fija.
- **Siempre se puede apagar de un toque**, y el aviso de que está activo nunca desaparece.

🚨 **El permiso de superposición es de los más invasivos de Android.** Pídelo **solo cuando
el usuario active la función**, nunca al abrir la app, y explica en una línea qué hace
antes de mandarlo a Ajustes.

⚠️ **Que sea opt-in y reversible.** Un filtro rojo que alguien no sabe apagar es una
llamada a soporte y una reseña de una estrella.

## iPhone: no se puede, y hay camino honesto

🚨 **Ninguna app puede dibujar encima de otras en iOS. No lo intentes ni lo prometas.**

El camino real: **Atajos del sistema puede activar filtros de color a una hora programada,
automáticamente.** La app **guía al usuario paso a paso** para dejar ese atajo configurado,
más el enlace a Night Shift.

**Es "hazlo contigo" literal**, y es la diferencia entre decir "no se puede en iPhone" y
resolverlo por la vía que Apple sí permite.

⚠️ **El copy de iOS no puede insinuar que ATP controla la pantalla del sistema.** Dice la
verdad: te ayuda a configurarlo una vez, y el sistema lo hace solo desde entonces.

---

# PIEZA 2 · Acciones de notificación

La pieza nativa de MB-24. Hoy una notificación solo se puede tocar para abrir la app.

**Con acciones, el aviso trae botones**: "ya tomé agua", "ya medité", "recordar en 15 min".
Se responde desde la pantalla bloqueada, sin abrir nada.

⚠️ **Lo que se registre desde una acción entra por el MISMO camino que el registro normal.**
Nada de rutas paralelas: eso es lo que rompe el ledger de electrones.

⚠️ **"Recordar en 15" respeta las horas de silencio y el maestro general.** Si el maestro
está apagado, ninguna acción puede reprogramar nada.

⚠️ **Solo la parte nativa.** El presupuesto de avisos, el arbitraje y las condiciones
reales (avisar de agua solo si vas atrasado) **necesitan despachador de servidor y son B1
del FIFO.** No los construyas aquí.

---

# PIEZA 3 · El visor de cámara del escáner

**B5 del FIFO.** MB-28B dejó el escáner de etiquetas completo pero con el código tecleado a
mano, porque `expo-image-picker` no decodifica códigos de barras y `expo-camera` no estaba.

**Instala `expo-camera` y enchufa el visor en vivo a `/food-barcode`**, que ya tiene el
flujo completo: búsqueda, caída a manual, guardado.

⚠️ **No rehagas el flujo. Solo alimenta el código leído.** Todo lo demás ya está probado.

⚠️ **La captura manual se queda.** En México la cobertura de la base es parcial y muchos
códigos no van a existir: teclear sigue siendo camino primario, no plan B.

---

# PIEZA 4 · Los assets al binario

- **Los 56 iconos del set SVG al binario.**
- **Purga de los PNG viejos** que MB-19 dejó dentro. Un OTA manda los nuevos pero los
  viejos siguen ocupando espacio en la app instalada hasta que haya build. **Este es ese
  build.**
- Revisa que las covers de meditación en WebP (migración 258) se estén sirviendo bien.

**Mide y reporta el tamaño del binario antes y después.**

---

# PIEZA 5 · Tests

1. **El filtro se puede apagar siempre**, desde la app y desde el aviso.
2. **Sin permiso de superposición, la app no se rompe** y lo dice con honestidad.
3. **El copy de iOS no promete control del sistema:** barrido que truene si insinúa.
4. **Una acción de notificación escribe por el camino normal.** La mutación que la mande
   por otra ruta truena.
5. **Con el maestro apagado, ninguna acción reprograma nada.**
6. **El escáner con cámara y el manual escriben idéntico.**

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: **qué permisos nativos agregaste y con qué texto** ·
tamaño del binario antes y después · qué tan bien quedó la guía del Atajo en iPhone · qué
acciones de notificación quedaron y cuáles no se pudieron · el resultado real de las
mutaciones.

🚨 **Y una lista, lista para copiar, de TODO permiso nativo que este run agrega, con su
justificación en una línea.** Va a la respuesta de revisión de tiendas, y el permiso de
superposición de Android es de los que se cuestionan.

**Actualiza `R and D/FIFO_PENDIENTES.md`.** ⚠️ También lo toca MB-30A: **espera conflicto y
NO lo resuelvas.**

---

# 🔒 PROTOCOLO DE CIERRE

**Al terminar: reporta y DETENTE. No merges sin el verde del audit de Cowork.**

⚠️ **No hay OTA para este run.** El build se hace UNA vez, después de que MB-30A y MB-30B
estén las dos en `main`, y **la publicación a tiendas NO se hace todavía** — lo legal de
Enrique no está listo. **Build interno para probar, publicación después.**
