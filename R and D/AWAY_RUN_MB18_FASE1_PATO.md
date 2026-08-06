# 🧭 BORRADOR · MB-18 · Fase 1 del rediseño de Pato

**⛔⛔ ESTE DOCUMENTO NO SE MANDA A CC. ES UN BORRADOR DE TRABAJO.**
La auditoría de Pato es insumo de consultoría, no decisiones. Las decisiones de este
rediseño las toman Enrique y Cowork en sesión de peloteo, punto por punto. Este texto
es la propuesta de Cowork PARA esa sesión; saldrá modificado de ella o no saldrá.

**Rama (cuando se apruebe):** `feat/mb18-fase1-pato` · worktree propio.
**⛔ Además, no arrancar hasta que MB-17 esté mergeado en main.** MB-17 toca superficies
de score que esta fase rediseña; ramificar antes = colisión segura.
**Fuente:** `ATP UX improves_pato.pptx` + `Principios ATP_pato.docx` (Pato, 31-jul-2026).
Referencia rápida en memoria: `reference_principios_ux_pato`.

## La tesis que gobierna este run

> "El usuario abre ATP → ATP le dice qué hacer → lo hace → se siente mejor → confía →
> explora más." Hoy el flujo es al revés: ve 15 cosas, decide, lee, explora, piensa,
> tal vez hace algo.

**La métrica es Time to First Value.** Cada cambio de este run se juzga con una pregunta:
¿reduce las decisiones que el usuario toma antes de obtener valor?

## La doctrina de fotos (resuelve la tensión con el molde editorial)

El design system dice "molde editorial con imagen de fondo". Pato dice "cada fotografía
requiere interpretación". **Las dos tienen razón en territorios distintos:**

- **NAVEGACIÓN** (hubs, heroes de pilar, cards que te llevan a otro lado) → conserva
  la foto editorial. Ahí la imagen ES el contenido emocional.
- **ACCIÓN y DATOS** (agenda, listas, registros, notificaciones, tareas) → **sin foto.**
  Iconografía + texto + estados. Ahí la foto es ruido que compite con la decisión.

Regla mental: si la superficie te lleva a un lugar, puede llevar foto. Si te pide hacer
algo o te muestra un dato, no.

## Alcance — SOLO capa de experiencia

Fase 1 de Pato, textual: *"No tocar funcionalidades."* Nada de lógica nueva, nada de
datos nuevos, nada de rutas nuevas. Se reorganiza, se jerarquiza, se recorta peso
visual. Los servicios no se tocan.

---

# PIEZA 1 · HOY — la calibración (se hace PRIMERO y se detiene)

**Regla del design system §4.6 que aplica entera: calibrar en UNA pantalla antes de
propagar.** Esta pieza se entrega sola, Enrique la ve en su teléfono, y SOLO con su
visto bueno se ejecutan las piezas 2-4. Si el molde está mal, se corrige una pantalla
y no cuatro.

## 1.1 · Un protagonista absoluto

Al abrir HOY, la respuesta a "¿qué hago ahora?" debe ser **una sola cosa**, arriba,
inconfundible: la siguiente acción del día según la hora y el estado (el day-compiler
ya sabe cuál es; hoy la entierra entre 8 secciones de peso idéntico).

- Hero = LA siguiente acción, con su CTA de un tap.
- El ATP Score se queda visible pero deja de competir: pasa a segundo nivel visual.
- Todo lo demás baja a terceras posiciones o se colapsa.

## 1.2 · Progresión visible (principio 5)

Bajo el hero, una línea de progresión del día: **qué ya hice ✓ · qué sigue · qué
viene después.** Compacta, sin fotos, estados claros. El usuario debe poder contestar
las tres preguntas en un vistazo.

## 1.3 · ARGOS escaneable (principio 8)

La card de ARGOS en HOY deja el párrafo y adopta el formato de Pato:

```
ARGOS detectó
· Día 1 de tu ciclo
· Comiste poco ayer
Hoy haz esto
✓ Come antes de las 4 pm
✓ Tu magnesio de la noche
Ver explicación →
```

Entendible en menos de cinco segundos. El "por qué" completo vive detrás de
"Ver explicación", no enfrente. (Solo formato de presentación: el contenido que ARGOS
ya genera se re-presenta, no se regenera.)

## 1.4 · Recorte de peso visual

- Fotos en HOY: **solo el hero.** Las demás secciones pasan a iconografía y texto.
- Meta de Pato: hoy hay ~15 elementos que piden decisión; el objetivo es que arriba
  del pliegue haya **una acción dominante y máximo 3-4 elementos secundarios.**
- Las secciones que sobrevivieron a MB-11 no se borran: se **colapsan por defecto**
  con header de contador (patrón ya existente de suplementos). Disponible ≠ visible.

**🛑 ALTO AQUÍ. Entregar pieza 1, esperar visto bueno de Enrique en dispositivo.**

---

# PIEZA 2 · AGENDA — de tracker a asistente

Diagnóstico de Pato: cuadros muy grandes, línea de tiempo confusa, más de un tap para
completar, y se confunde con HOY porque ambas tienen imágenes y el mismo peso.

- **Un tap completa.** Cada item de agenda se marca hecho desde la lista, sin entrar
  a detalle. (El detalle sigue existiendo al tocar el texto.)
- **Sin fotos.** La agenda es superficie de acción: iconografía por tipo + estado.
- **Agrupada por momentos del día** (mañana / mediodía / tarde / noche), no por hora
  suelta. El modelo ya existe en los timings de suplementos; se generaliza visualmente.
- Items compactos: fila de una línea con icono, nombre, hora y check. Los "cuadros
  grandes" mueren.
- **Diferenciarse de HOY:** HOY dice qué sigue AHORA; Agenda muestra el plan del día
  completo. Esa distinción debe ser obvia al entrar.

# PIEZA 3 · NOTIFICACIONES — escaneables

Diagnóstico: mucha explicación en texto corrido.

- Mismo formato que la card de ARGOS: qué pasó en bullets cortos, qué hacer con ✓,
  y "Ver más" para el desarrollo.
- Ninguna notificación en pantalla requiere leer un párrafo para saber si actuar.
- El copy sigue todas las reglas de voz (cero em dash, sin jerga, español MX).

# PIEZA 4 · PANTALLA PRINCIPAL — el barrido de coherencia

Con el molde de HOY aprobado: pasada por los puntos de entrada (tabs y hub) para que
la jerarquía sea consistente: navegación con foto editorial, acción sin foto, un
protagonista por pantalla. **Sin tocar rutas ni features.**

---

# 📦 ENTREGA

Un commit por pieza. Solo JS/TS, cero dependencias nuevas, cero migraciones, sale
por OTA. `tsc` y Vitest en verde. Cero em dash en copy de usuario.

**Secuencia obligatoria:** pieza 1 → 🛑 visto bueno de Enrique en dispositivo →
piezas 2-4. No hay excepción: es la regla de calibrar antes de propagar.

**Verificación en dispositivo (con Enrique):**
1. Abrir HOY y contestar en voz alta "¿qué hago ahora?" en menos de 3 segundos.
2. Contar elementos que piden decisión arriba del pliegue: 1 dominante + ≤4 secundarios.
3. La card de ARGOS se entiende sin leer un párrafo.
4. En Agenda, completar un item con UN tap desde la lista.
5. HOY y Agenda ya no se parecen: uno dice "ahora", la otra "el plan".
6. Una notificación se entiende y accionea sin abrir el texto largo.
7. Los caminos de MB-17 siguen intactos (score con etiqueta, colores nuevos, historial).

**Fuera de alcance:** Fase 2 de Pato (salud funcional, mapas, fitness, YO), la
arquitectura de capítulos completa (principio 7 a fondo es un rediseño de navegación
que se decide después del recorrido), y cualquier feature nueva.
