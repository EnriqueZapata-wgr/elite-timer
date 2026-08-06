# 🎨 AWAY RUN MB-20.1 · TAREAS recupera su piel

**Rama:** `feat/mb20-1-editorial` desde `main` (con el nocturno ya mergeado) · worktree propio.
**Solo JS/TS. Cero migraciones.** Sale por OTA.

## Por qué existe este run

MB-20 acertó la UX y **perdió la UI**. La lista quedó funcionando y se ve como cualquier app de
pendientes. Enrique lo dijo claro: *"ese era justo mi punto al pedirte que solo cambiaras UX y
no UI, y justo se fueron. Eran uno de los más grandes aciertos."*

**El error fue del brief de MB-20**, que describió el comportamiento al detalle y nunca dijo que
la identidad editorial se quedaba. Este run la devuelve.

⚠️ **Regla que manda sobre todo lo demás: NO se toca el comportamiento.** Los dos gestos, la
paloma inteligente, el auto-foco, la fuente única, los bloques por momento y la lente AGENDA
**funcionan y se quedan exactamente como están.** Esto es piel, no esqueleto. Si para lograr un
efecto visual hay que cambiar la lógica, **para y repórtalo.**

`tsc`, Vitest y `npm run censo` en verde antes de cada commit. Cero em dash en copy de usuario.

---

# El reparto decidido

**TAREAS es la lente que se VE. AGENDA es la lente que se OPERA.**

Esa es la decisión de Enrique y es lo que le da sentido de verdad a que sean dos lentes y no dos
ordenamientos. Misma fuente de datos, densidades opuestas a propósito.

---

# PIEZA 1 · TAREAS: todas las cards editoriales, con su dato adentro

## 1.1 · Cada pendiente vuelve a ser card editorial

Imagen de fondo, degradado y su color de sección. **Todas.** No hay versión chica.
Se reutiliza el molde editorial que ya existe y las imágenes de `assets/images/`, que acaban de
optimizarse a WebP y ahora pesan una quinta parte.

## 1.2 · Lo que hace que valga la pena que sean grandes: el dato

**Una card que solo te pide algo no merece media pantalla. Una que te dice algo, sí.**

Cada card muestra su dato en vivo, con su barra de progreso donde aplique:

| Card | Qué muestra |
|---|---|
| Agua | `2.0 de 3.5 L` + barra + botón `+250 ml` |
| Ayuno | horas transcurridas + fase + a qué hora rompe |
| Proteína | `0 g de 160 g` + barra |
| Sol | UV ahora + su ventana de vitamina D |
| Suplementos | cuántos pendientes de cuántos |
| Entrenar | qué rutina toca hoy |
| Meditación | minutos de la última, o la sugerida |
| Cardio | distancia y tiempo de la última |
| Check-in emocional | dónde terminó ayer |

⚠️ **El dato sale de lo que ya se compila.** No agregues queries nuevas: si un dato no está en
`CompiledDay`, **la card va sin dato y lo reportas.** Nada de inventar cifras ni de meter
llamadas por card, que son diecisiete.

## 1.3 · Las hechas colapsan, y conservan su color

Al completarse, la card **se colapsa a una fila compacta** y sube a un bloque **HECHAS** arriba
de los bloques por momento.

⚠️ **Decisión explícita de Enrique: la fila colapsada CONSERVA SU COLOR de sección.** No se va a
gris. Así el bloque de hechas se lee como **una cinta de colores del día**: de un vistazo se ve
si fue un día de Mente, de Cuerpo o de Hábitos.

La fila colapsada lleva: paloma en el color de su sección, nombre tachado, y su dato de cierre
(`12 min`, `7:40`, `3 de 3`).

**El efecto que se busca:** el muro **encoge conforme avanza el día** en vez de crecer. En la
mañana ves diecisiete cards porque tienes diecisiete cosas. En la noche ves tres cards y catorce
renglones, y la pantalla es corta **porque ya hiciste tu día**.

⚠️ **La transición importa:** al palomear, la card debe **encogerse hasta su fila y viajar** al
bloque de hechas. Con la transición de layout de reanimated que ya se usa en la sala ATP. Si
desaparece y reaparece de golpe, se siente roto. **Y respeta reducir movimiento.**

## 1.4 · El orden de los bloques

```
HECHAS        (colapsadas, cinta de color)
MAÑANA        (cards editoriales)
TARDE
NOCHE
```

El auto-foco sigue llevando al bloque de la hora actual, **no al de hechas.**

---

# PIEZA 2 · AGENDA: la lente de operación

Aquí sí va la versión compacta, porque su trabajo es otro: ver horarios y ejecutar rápido.

## 2.1 · Un héroe editorial arriba

**Una sola card grande**, la de lo que importa ahora, y **cambia con la hora**: a las nueve es la
ventana de sol, a las diez de la noche es apagar pantallas. Foto, degradado y su dato.

## 2.2 · Bandas editoriales por bloque

En vez de un encabezado de texto, cada bloque abre con una **banda fotográfica de unos 52 px de
alto**, con degradado y el nombre del bloque encima más su progreso. Tres momentos editoriales
por día.

## 2.3 · Las filas se quedan compactas

Con su hora a la izquierda, su mosaico de icono **con el degradado de su sección**, y el mismo
tap largo de siempre. No crecen.

---

# 🎨 La regla de color, que es la misma de siempre

Todo sale de `APP_SECTION_COLORS` en `brand.ts`. **Nada escrito a mano.**

Mente `#7F77DD` · Cuerpo `#8CBF24` · Hábitos `#5B9BD5` · Salud `#1D9E75` · Ciclo `#D4537E`

⚠️ **El degradado sobre la foto no puede comerse la legibilidad.** El texto de cada card tiene
que leerse sobre cualquier imagen, incluidas las claras. Si una imagen no aguanta, se refuerza el
degradado, **no se cambia el texto a un gris más tenue.**

---

# 📦 ENTREGA

Un commit por pieza. **Screenshot de TAREAS en tres estados: el día recién empezado, el día a la
mitad con hechas colapsadas, y el día casi cerrado.** Esa es la prueba de que el muro encoge.

**Verificación en dispositivo:**
1. TAREAS se ve **como ATP**: fotografía, degradado y color por sección en todas las cards.
2. Cada card lleva **su dato**, no solo su nombre.
3. Al palomear, la card **encoge y viaja** al bloque de hechas, con animación.
4. La fila de hechas **conserva su color**, no se va a gris.
5. A media tarde la pantalla es **más corta** que en la mañana.
6. AGENDA sigue compacta, con su héroe arriba y sus bandas por bloque.
7. **Nada del comportamiento cambió:** los dos gestos, la paloma inteligente y el auto-foco
   funcionan igual que antes de este run.
