# 🎨 AUDITORÍA VISUAL — Pilar Mente (device, 2026-07-24)

Crítica de diseño pantalla por pantalla + norte editorial. Complementa `BRIEF_FIX_MENTE_V1.5.md` (que dice *dónde* está el código): esto dice *cómo debe verse*. Base: screenshots de Enrique en device.

---

## NORTE EDITORIAL ATP (la vara)
Lo que separa "funciona" de "editorial", consistente en todo el pilar:
1. **Imagen cinematográfica B/N** como capa base de las cards importantes (como el hero de Mente y la card "Respiración consciente" — esas SÍ están al nivel). Foto editorial + scrim de degradado, no rectángulo gris plano.
2. **Tipografía con jerarquía real:** título grande/pesado (Barlow~DIN), labels en mayúscula con tracking generoso, cuerpo tranquilo. Hoy los títulos de card son correctos pero el resto es plano.
3. **Acento con moción, no relleno:** lime/teal se usan como chispa (el botón con degradado, el anillo de progreso), no como bordes de todo. Menos es más.
4. **Aire (espaciado) + profundidad:** ritmo vertical generoso, sombras/glow suaves. Lo "basic" casi siempre es falta de aire + planitud.
5. **Consistencia de molde:** una card = un componente. Hoy conviven 2-3 vocabularios (MenteHubCard, typeCard del journal, checkin inline, PillarHeader vs MenteHero).

---

## POR PANTALLA

### 1 · Mente Hub — "se ve basic"
- ✅ **El hero (silueta meditando) está al nivel** — cinematográfico, editorial.
- ❌ Las cards (Meditación/Respiración/N-Back/Journal) son **rectángulos oscuros planos** con icono chico + título + subtítulo + pill "Empezar". Leen como lista de settings, no como capítulos. Cero imagen, cero profundidad, todas iguales.
- ❌ **Check-in rompe el molde** (borde lime + corazón) — es el único distinto.
- **Dirección:** cada destino con **imagen editorial B/N de fondo** (el `imageBn` que MenteHubCard ya soporta y está dormido) + scrim, más ritmo vertical, título editorial. Unificar Check-in al mismo molde. Que se sientan **5 portadas de capítulo**, no 5 renglones.

### 2 · N-Back Home — inteligente pero frío
- ✅ Muy inteligente: week-strip, anillo del reto, anillo de HOY, badge "N=2 Aprendiz", botón verde fuerte. La data viz es de las mejores del app.
- ❌ El bloque **AJUSTES crudo abajo** (Velocidad/Feedback/Arrancar) ensucia una home que debería ser de foco. → a "Personalizar" (ya en el brief).
- ❌ Fondo negro plano, sin la calidez editorial del resto de Mente.
- **Dirección:** sacar Ajustes. Sumar un toque editorial arriba (textura/hero sutil o el ícono N-Back tratado con más gracia). Conservar la data viz — está buena.

### 3 · N-Back Gameplay — el detalle importa
- ❌ **Cuadrito gris al centro** del grid (quitar, dejar la cruz). ❌ Botón presionado solo con **contorno delgado** (no se distingue). 
- **Dirección:** relleno **sólido** al presionar (con contraste de icono/texto), centro transparente. Micro-moción al tap. El grid con líneas más finas/elegantes.

### 4 · N-Back Resultados — bien
- ✅ Barras Posición/Sonido con marcas 75/90 — clara y honesta. Al nivel. Solo cuidar tipografía de los % (grandes, con respiro).

### 5 · Respiración — denso, semi-editorial
- ✅ La card guiada "Respiración consciente" (foto trigo B/N) **está al nivel**.
- ❌ Las 6 técnicas: cards oscuras con **círculos de icono morados** que se sienten un poco genéricos/legacy; mucha densidad, menos refinamiento que la Audioteca de meditación. Los tags (5 min, 4s-4s, precauciones) sí son útiles.
- **Dirección:** subir las técnicas al vocabulario editorial (mismo molde de card, más aire, jerarquía de tipografía), afinar el uso del morado (acento, no relleno de todo). Los tags se quedan.

### 6 · Timer de Respiración — **el ofensor visual #1**
- ❌ Es un **rectángulo redondeado con borde lime y un cuadro negro adentro** con "Inhala 1". Feo, aunque funciona. (Técnicamente: `borderRadius:50` en caja de 200px + relleno translúcido = ni cuadrado ni círculo.)
- **Dirección:** **esfera real** con **gradiente radial** (highlight arriba-izq, color de fase profundizando al borde, glow suave que respira con la escala). La **palabra (Inhala/Retén/Exhala) FUERA** de la esfera. El **número flotando** (textShadow, sin caja). Que la esfera infle/desinfle sea lo único que "respira". Esto solo transforma el módulo.
- ✅ **El botón con degradado ya es joya** — no tocar, es la referencia de nivel.

### 7-8 · Journal — mecánica cool, visual varios niveles abajo
- ✅ El hero (foto B/N) del home está bien.
- ❌ Las cards de práctica (Gratitud/Visión/Estoico/Descarga) son **planas con borde de color a la izquierda** + icono chico + chevron. Lista de settings otra vez.
- ❌ **Nivel-down al entrar al editor:** pasa del hero editorial a un **header de texto pelón** (PillarHeader "ATP JOURNAL"). Rompe el flujo.
- ❌ Inputs "Tu reflexión..." planos, sin focus state; preguntas como caption chico.
- ✅ La caja de cita Séneca (tintada, itálica) es el único elemento editorial del editor — **prueba de que sí puede verse bien**.
- **Dirección:** hero (MenteHero) también en el editor; cards de práctica al molde editorial (imagen o refinadas); inputs con focus + preguntas como headers editoriales; unificar tokens (hoy history usa otro sistema de diseño → se ve disparejo).

---

## PRIORIDAD VISUAL (para el track editorial del brief)
1. **Timer de Respiración → esfera** (mayor salto por unidad de esfuerzo). 
2. **Hub: 5 cards editoriales con imagen** (+ unificar Check-in).
3. **Journal: hero en editor + cards + inputs + tokens unificados.**
4. **N-Back: sacar Ajustes, pulir gameplay (centro/relleno), toque editorial en home.**
5. **Respiración: subir las 6 técnicas al molde.**

## Lo que YA está al nivel (no tocar)
Hero de Mente · card "Respiración consciente" · botón con degradado · data viz de N-Back · caja de cita del journal · el gate de Wim Hof.

## Assets editoriales (MJ, Enrique genera — Cowork da prompts)
Portadas B/N 4:5 para: 5 cards del hub + 4 cards de práctica del journal (Gratitud/Visión/Estoico/Descarga). Mismo lenguaje que el hero de Mente.
