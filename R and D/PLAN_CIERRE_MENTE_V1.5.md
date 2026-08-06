# 🎯 PLAN DE CIERRE — Pilar Mente → V1.5.0

**Fecha:** 2026-07-24 · **Origen:** feedback de Enrique en device (build nativo) + auditoría Cowork.
**Meta:** cerrar Mente al nivel editorial más alto y sellar **V1.5.0**. Publicable ya; esto lo lleva al máximo.

---

## A · N-BACK — BUGS funcionales (P0, primero)

### A1 · Conteo mal en N≥2 (no se puede pasar de N=2)
**Diagnóstico Cowork (código leído):** el motor puro `nback-core.ts` está **correcto** (`matchesOf` y `scoreChannel` bien; un jugador perfecto DEBERÍA dar 100% a cualquier N). La raíz NO es la lógica pura — es **A2**: cuando posición Y sonido coinciden en el MISMO trial, solo registra un press → el otro canal cuenta como *miss* → accuracy baja → nunca llega a 90% → no sube de N. Por eso N=1 (menos coincidencias dobles en esa corrida) contó bien y N=2 no.
- Fix en `app/mente/nback/sesion.tsx` (los dos canales ya son refs independientes; el problema está en el input de los botones — ver A2).
- **Revisar además:** atribución de press tardío — `trialRef.current` avanza al iniciar el trial i+1; un press con reacción lenta cerca del límite se atribuye al trial siguiente. Considerar una pequeña ventana de gracia o registrar contra el trial visible.

### A2 · No se pueden presionar Posición + Sonido a la vez
Si ambos son match en el mismo trial, presionar uno bloquea el otro (hay que hacer uno y luego el otro). El handler `press()` está bien (refs separados) → el bug está en los **botones** (touch/disabled): deben registrar independientes y simultáneos en el mismo trial. Revisar `disabled`/responder de los Pressables.

### A3 · Arranque muy rápido
Dar **~2s de gracia** después de "Go!" antes del primer trial (que el usuario ubique la vista).

---

## B · N-BACK — Editorial / polish (P1)

- **B4 · Quitar el cuadrito gris del centro** del grid; dejar solo la cruz (crosshair).
- **B5 · Botón presionado se LLENA completo**, no solo el contorno (muy delgado, no se distingue si se presionó). Relleno sólido al tap.
- **B6 · Subir el nivel visual a editorial** — la interfaz es inteligente y gusta; falta el toque ATP editorial (tipografía, degradados, respiración visual).

## C · N-BACK — Personalización (P1)
- **C7 · Botón "Personalizar"** que agrupe toda la config (mover los Ajustes de la home ahí).
- **C8 · Toggle feedback acierto/error** — gusta (novedoso, conservar) pero puede distraer → encender/apagar.
- **C9 · Toggle del # de turno de la ronda** (arriba-derecha) — igual: conservar + poder apagarlo.

## D · N-BACK — Tutorial amigable (P1)
- **D10 ·** La lista de instrucciones no se siente amigable. Convertir en **serie de pantallas con "Entendido"**, y la primera ronda con **indicaciones y pausas on-the-fly**: que el novato entienda qué es N=1, qué implica N=3, etc.

## E · N-BACK — Contenido (P2, Cowork escribe)
- **E11 · Botón "Saber más sobre N-Back"** en la home → **artículo interno** (publicable en el website): la literatura completa, qué y por qué según las investigaciones, **citado bien**, con optimismo pero **sin promesas**. Lo redacta Cowork.

---

## F · MENTE HUB (P1)
- **F12 ·** Se ve muy basic → **subir a editorial**. **Cards para TODOS** los destinos (hoy el Check-in emocional se ve distinto al resto — unificar el molde de card).

## G · RESPIRACIÓN (P1)
- **G13 ·** Pimpear todo el módulo (varios niveles abajo del resto).
- **G14 · Quitar el "sonidito de 8-bits" horrible** al inicio y al final (cue sound).
- **G15 · Rediseñar el timer visual:** el recuadro que se infla/desinfla con un **cuadro negro al centro** funciona pero es feo. Subir a una **esfera** (o algo más cool) sin recuadro feo. Si la palabra (Inhala/Exhala) no puede inflar/desinflar al ritmo, dejarla **fuera** de la esfera. El número **no necesita recuadro** — sombra/contraste/colores cuidados de esfera+conteo.

## H · JOURNAL (P1)
- **H16 ·** Mecánicamente cool, visualmente varios niveles abajo → pimpear (auditar todo).

## I · CROSS-CUTTING (P0/P1)
- **I17 · BUG: el botón Home REINICIA la app** en vez de solo navegar a home. (Ahora se ve/ubica bien — solo corregir que sea navegación, no reload.)
- **I18 · Teclado tapa los cuadros de texto.** La app no hace overscroll al abrir teclado; al cerrarlo, que regrese a tamaño completo. (`KeyboardAvoidingView` / scroll a la vista enfocada.)

---

## ✅ POSITIVOS (no tocar — ya están al nivel)
Interfaz N-Back inteligente · **botón con degradado (joya)** · **gate de Wim Hof perfecto** · home button visible y bien ubicado (solo el reload es bug) · secciones/favoritas/economía de meditaciones.

---

## PLAN DE EJECUCIÓN
1. **Cowork · auditoría visual + código completa** (módulo por módulo: N-Back, Hub, Respiración, Journal) → aterriza este feedback + halla más → **briefs de fix priorizados** (P0 bugs primero).
2. **Cowork · escribe el artículo** "Saber más sobre N-Back".
3. **CC ejecuta** en tracks (bugs N-Back → editorial de módulos). Away runs, sin merge.
4. **Cowork audita** cada branch → merge → `db push`/OTA/build según toque.
5. Device test de Enrique → **sella V1.5.0**.
