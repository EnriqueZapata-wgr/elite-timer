# 🔧 BRIEF · MB-3.5 Fitness polish (device test de Enrique) — para CC

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb35-fitness-polish` desde `main` (ya trae MB-3). NO merge, tsc + tests verdes, Cowork audita.
**Origen:** device test real de Enrique sobre MB-3. Su veredicto: *"va súper bien para la primera versión, pero puede mejorar mucho"*.
**Orden:** P0 bugs → P1 UX/datos → P2 diseño. **Si no alcanza, termina bloques completos** y di cuáles.
**Fuera de alcance (batch aparte):** cardio integrado al motor, movilidad, protocolo respiratorio en Fitness.

---

## 🔴 P0 · BUGS (rompen la experiencia)

### 1 · Los clips no corren y se ven chicos *(la joya de la corona)*
Hoy se muestra el **poster estático** y pequeño. **Los 206 clips YA están en el bucket público `fitness-clips`** (subidos, verificados, ~204 KB c/u, 1080×598 H.264 mudos).
- **Datos:** la matriz ya trae columna **`Clip URL`** → `https://itqkfozqvpwikogggqng.supabase.co/storage/v1/object/public/fitness-clips/{slug}.mp4`. Regenera el seed con **UPSERT** (ver bloque #13) y llena `media_url` con el clip (el poster queda como `poster_url` para el placeholder).
- **UI:** el clip es **protagonista** — grande, **en loop infinito**, autoplay, mudo, `contentFit=cover`. Poster como placeholder mientras carga (mismo patrón local-base + fade que Mente). Usa `expo-video` (SDK 54; `expo-av` está deprecado) — **si requiere dep nativa, fláguealo** (sería build, no OTA).
- Aplica en: detalle de ejercicio, card durante la sesión, y donde el usuario esté ejecutando.

### 2 · Marcar reps cierra la serie sin margen de error
Al tocar el número de reps se cierra la serie de inmediato. **Confuso y sin retorno.** **Default:** el tap **selecciona** (estado visible), y la serie se cierra con una acción explícita (botón CONFIRMAR / siguiente). Debe poder corregirse antes de confirmar. Aplica a `log-exercise`, `strength-session` y los 3 métodos.

### 3 · EMOM: el timer se reinicia al marcar las reps *(bug conceptual — hoy es un AMRAP)*
Enrique: *"si marco 10 reps en el segundo 45, se reinicia el timer a 60. Y si dejo correr el minuto a 0, jala 0 reps."*
**Un EMOM correcto:** el minuto corre **fijo e independiente** de cuándo registras. Marcas tus reps **cuando terminas el set** y el reloj **sigue corriendo** hasta el minuto; el siguiente set arranca **al minuto siguiente**, no al registrar.
- **Default:** el timer NO se reinicia al registrar; sigue hasta 0 y ahí pasa a la ronda siguiente.
- Si el minuto llega a 0 **sin registro**, no asumir 0: **pedir el dato** (o dejar el input abierto durante el descanso restante).
- ⚠️ **La regla de peso NO se toca** (deuda, X+1, subir/mantener/bajar) — está verificada. Esto es solo el ciclo del reloj y la captura.

### 4 · Botones oscurecidos en el configurador de rutinas
En el generador los botones se ven "apagados", como si hubiera una capa encima. **Default:** cazar el overlay/estado de carga fantasma (posible loader que no se desmonta, o `opacity`/`pointerEvents` pegado). Verificar que los controles queden 100% opacos e interactivos.

### 5 · Explorar (Akinator): lista larga, cortada, y no se puede elegir
La pestaña Explorar muestra los ejercicios en lista cortada y **no son seleccionables** — la tarea quedó incompleta. **Default:** completar la interacción: lista con scroll correcto (sin corte), ejercicios seleccionables/deseleccionables con estado visible, y que la selección alimente el generado.

---

## 🟠 P1 · UX, NAVEGACIÓN Y DATOS

### 6 · TTS configurable
La voz narra en cada toque; puede gustar o estorbar. **Default:** ajuste de voz para Fitness (ON/OFF, y si es simple: "solo hitos" vs "todo"), persistido, respetando el setting global de voz que ya existe. No quitarlo — hacerlo opcional.

### 7 · "Entrenar" se siente redundante + decidir ARGOS
Enrique: *"varias cosas mandan a lo mismo. Simple beats smart."* Hoy `fitness-train` tiene **7 destinos**: routine-generator, my-routines, builder, timer, fitness-hiit, log-exercise, argos-routine.
- **Default:** colapsar a **una acción primaria** (EMPEZAR SESIÓN DE HOY → generador/rutina) + un grupo secundario chico. Redirigir o retirar lo que duplica (timer vs HIIT vs builder vs log suelto).
- **ARGOS:** hoy `/argos-routine` (LLM) compite de tú a tú con el generador determinista. **Doctrina ATP: ARGOS va ENCIMA, no al lado** — el algoritmo arma el esqueleto gratis y ARGOS personaliza/explica (capa premium). **Default:** quitar "ARGOS genera tu rutina" como puerta hermana; si aporta, que sea un botón *dentro* del resultado del generador ("ARGOS, ajústala"). Si CC ve que hoy no aporta valor real sobre el algoritmo, **proponer retirarlo** y decirlo.

### 8 · Hub de Fitness: revisar TODAS las subcategorías
Las 3 cards (Mi Fitness / Entrenar / Explorar) pueden quedarse, pero **navegar es confuso**. **Default:** inventariar cada destino de las 3 cards y proponer qué se queda, qué se fusiona y qué se retira — **entregar el inventario en el delivery** para que Enrique lo vete. Regla: un dato = un lugar (doctrina navegación-vs-consulta). No inventar pantallas nuevas.

### 9 · Biblioteca: filtros que no tienen sentido
La biblioteca gustó, pero los filtros por categoría no ayudan y el filtro superior está mal ubicado. **Default:** filtros por los ejes que el usuario realmente piensa (**músculo · equipo · patrón · nivel**), el buscador arriba, y los filtros en fila secundaria (chips con wrap, nada de scroll horizontal escondido). Mostrar el conteo de resultados.

### 10 · Datos corregidos por Cowork → regenerar seed con UPSERT
El xlsx `Matriz_Fitness_ATP_206_revisado.xlsx` fue actualizado (**214 filas** ahora). Cambios:
- **Banca:** 31 filas que la requieren ahora la declaran (arregla el bug de "no tengo banca y me mandó incline bench").
- **Nueva columna `Unidades equipo`** (`1` · `par` · `n/a`): 49 filas piden **par** de mancuernas/KB, 30 piden **1**.
- **Nivel re-taggeado:** ahora 83 principiante / 95 intermedio / **28 avanzado** / **6 atleta** (antes había 0 atletas — por eso "no hay ejercicios para avanzados").
- **+2 filas nuevas:** `dead-hang` y `broad-jump` (completan Tier B; sin clip, no existen en MoveKit → media vacía, manejar el caso).
- **`Clip URL`** poblada para las 212 con clip.
**Default:** `scripts/generate-exercise-matrix-seed.py` debe soportar **UPSERT** (`ON CONFLICT (slug) DO UPDATE`) para que los cambios de tags lleguen a filas ya existentes; nueva migración **223** idempotente. Extender el espejo TS y el mapa del bridge con `dead-hang` y `broad-jump` (Tier B).

### 11 · Candado de cantidad de equipo *(el bug del "1 kettlebell")*
Enrique: *"dije que tengo KB y me mandó thrusters bilaterales, pero solo tengo 1."*
**Default:** en la selección de equipo, para mancuerna y kettlebell preguntar **cuántas tiene** (1 o par). El filtro duro del generador debe excluir los ejercicios con `Unidades equipo = par` si el usuario solo declaró 1. Persistir la preferencia.

---

## 🎨 P2 · BARRIDA EDITORIAL ATP
Enrique: *"está lejos de la imagen ATP editorial gradiente — habrá que hacer un súper check."*
**Default:** pasar **todas** las pantallas de Fitness (hub, entrenar, generador, biblioteca, detalle, strength-session, cierre) por `docs/DESIGN_SYSTEM.md` + doctrina `project_design_system_atp_no_lime_brutalist`: degradados y fondos editoriales, molde "Mis Datos", lime/teal como **acento** (nunca bloque plano), tipografía y jerarquía consistentes con Mente V1.5.2 (que es la referencia buena). Cero huecos negros, cero snake_case crudo.

---

## Protocolo
`feat/mb35-fitness-polish` desde `main`. Migración 223 idempotente. `npx tsc --noEmit` + tests verdes. NO merge. Delivery con: bloques completados, el **inventario de navegación del punto 8** para que Enrique lo vete, checklist device-test, y flag si el video pidió dep nativa (sería build, no OTA).
