# 🎨 Set de iconos ATP

**Para:** Pato · **De:** Enrique + Cowork · **Fecha:** 2-ago-2026 · **Actualizado:** ruta decidida
**Para qué:** el springboard de la sala ATP. La literatura del patrón es tajante: **el lanzador funciona solo si los iconos se reconocen al instante.** Es el único prerequisito duro de toda la reestructura.

---

# ✅ RUTA DECIDIDA: Phosphor como base + los que falten a mano

**Enrique decidió el camino híbrido.** Es el que garantiza consistencia y pone el talento donde se nota.

## Cómo se hace

1. **Base: [Phosphor Icons](https://phosphoricons.com)** (MIT, gratis, ~9,000 iconos en 6 pesos). Usar el peso **Regular** o **Light** para todo el set, sin mezclar. De ahí salen la gran mayoría de los 25 tal cual: mancuerna, gota, luna, sol, matraz, engrane, foco, cámara, reloj de arena, trofeo.
2. **Se descargan como SVG** desde el sitio, uno por app, nombrados como su app (`meditar.svg`, `hidratacion.svg`).
3. **Los que Phosphor no tenga bien, se dibujan a mano** copiando su métrica exacta: mismo grosor de trazo, mismas esquinas, mismo lienzo. Los candidatos a dibujar son pocos:
   - **Emociones** — el plano 12×12 (una cuadrícula con una celda marcada fuera del centro)
   - **Cetonas / GKI** — no existe un icono para esto en ninguna librería
   - **1RM** — disco de pesa con flecha
   - **Edad ATP** — si se decide darle icono propio
4. **La orbe se dibuja aparte** y no sale de ninguna librería: es la molécula hecha presencia (ver abajo).

## Por qué esta ruta y no generar los 25

Midjourney es excelente explorando estilo y **mediocre siendo consistente entre 25 piezas**, y además entrega pixeles cuando la app necesita vector. Con Phosphor la consistencia viene de fábrica y el trabajo se concentra en los cuatro que de verdad son nuestros.

**Si aun así quieres explorar estilo con Midjourney** antes de decidir, los prompts de abajo sirven para eso: genera con el ADN, elige uno, y usa su URL como `--sref` para el resto. Pero para el entregable final, Phosphor.

## La métrica que todo debe respetar

Lienzo de 24, trazo uniforme, esquinas y uniones redondeadas, **monocromo** (un solo color; la app le aplica el de su sección), sin degradados dentro del icono. **El degradado es territorio exclusivo de la molécula y de la orbe.**

---

## ADN del estilo (el prompt base)

```
minimalist line icon, single continuous stroke, 2px uniform weight,
rounded caps and joins, geometric construction on a 24px grid,
centered in frame with generous padding, flat monochrome,
pure black background, no text, no letters, no shadow, no gradient,
no 3d, no perspective, app icon design system --style raw --ar 1:1 --v 7
```

**Las reglas de marca que no se rompen:** trazo uniforme, esquinas redondeadas, geometría simple. **Monocromo:** el icono se dibuja en un solo color y la app le aplica el color de su sección. Nunca degradados dentro del icono, que ese es territorio de la molécula.

**Para la ronda de estilo, agrega:** `icon set sheet, 6 icons in a grid, consistent stroke weight`
**Para los 25 finales:** un icono por generación, con `--sref <url del elegido>`

---

## Los 25

Cada línea es el sujeto; se pega **después** del ADN. Entre paréntesis, la app.

### Mente
1. `side profile of a head with a small circle at center of forehead` (Meditar)
2. `two curved flowing lines like breath moving outward` (Respirar)
3. `a 3 by 3 grid of squares, one square highlighted off center` (Emociones · el plano 12×12)
4. `an open notebook with a single line of writing` (Journal)
5. `a crescent moon with three small stars` (Sueño)
6. `a brain outline made of connected nodes` (N-Back)

### Cuerpo
7. `a clean dumbbell, horizontal, symmetric` (Entrenar)
8. `a running figure in motion, minimal` (Cardio)
9. `a human figure stretching sideways, arms extended` (Movilidad)
10. `a barbell plate seen from the side with a small arrow up` (1RM)
11. `a simple trophy cup` (Récords)

### Hábitos diarios
12. `a camera aperture over a plate, minimal` (Comida)
13. `a single water droplet` (Hidratación)
14. `an hourglass with the sand mid fall` (Ayuno)
15. `two capsules crossed diagonally` (Suplementos)
16. `a chef hat, simple silhouette` (Recetas)
17. `a shopping basket with one item` (Lista de compra)

### Salud
18. `a sun with eight short rays` (Sol)
19. `a heartbeat line with a single peak` (Glucosa)
20. `a flame with a clean inner curve` (Cetonas)
21. `a circular arrow forming a closed loop with a dot` (Ciclo)
22. `a laboratory flask with a measurement line` (Labs)
23. `a checklist with three items, one checked` (Protocolos)

### Sistema
24. `a light bulb with a half moon inside` (f.lux)
25. `a gear with six teeth, geometric` (Ajustes)

---

## 🔮 La orbe · la pieza más delicada

**No es un icono: es un ser vivo en la barra.** ARGOS no lleva palabra porque la orbe ES el nombre. Respira en reposo y cambia de forma y color cuando algo pasa.

Es el único elemento que **sí lleva el degradado de marca**, porque es la molécula hecha presencia.

```
a glowing sphere with soft internal light, gradient from lime green
to deep teal, subtle inner depth, floating on pure black,
centered, no text, ethereal, calm, premium
--style raw --ar 1:1 --v 7
```

**Sus cuatro estados** (genera los cuatro con el mismo `--sref` para que sean la misma criatura):

| Estado | Qué pasa | Prompt extra |
|---|---|---|
| **Reposo** | Respira lento, 3.6 s por ciclo | *(el base)* |
| **Tiene algo que decirte** | Un pulso más brillante y un punto de acento | `with a small bright accent dot orbiting slowly` |
| **Escuchando** | Cuando le hablas | `with concentric ripples emanating outward` |
| **Pensando** | Mientras responde | `with slow internal swirl, soft motion blur inside the sphere` |

⚠️ **Lo que la orbe NUNCA hace:** parpadear rápido, ponerse roja de alarma, ni saltar. Es calma con presencia. Si un día tiene que avisar de algo grave, lo dice con palabras, no asustando.

---

## Cómo entregarlo

Lo que la app necesita al final: **SVG monocromo, trazo de 2 px sobre lienzo de 24, un archivo por icono**, nombrados como su app (`meditar.svg`, `hidratacion.svg`). La orbe aparte, con sus cuatro estados.

Y el filtro final, que es el único que importa: **poner los 25 juntos en una pantalla y ver si se reconocen sin leer el nombre.** El que necesite etiqueta para entenderse, se rediseña.
